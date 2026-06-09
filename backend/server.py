from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import math
import json
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

import bcrypt
import jwt
import requests
from fastapi import (
    FastAPI, APIRouter, HTTPException, Request, Response, Depends,
    UploadFile, File, Form, WebSocket, WebSocketDisconnect, Header, Query
)
from fastapi.responses import Response as FastAPIResponse
from pydantic import BaseModel, EmailStr, Field
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("thorahelp")

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]
APP_NAME = os.environ.get("APP_NAME", "thorahelp")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="thoraHELP API")
api_router = APIRouter(prefix="/api")

# ---------------------------------------------------------------------------
# Storage helpers (Emergent object storage)
# ---------------------------------------------------------------------------
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
_storage_key: Optional[str] = None


def init_storage() -> Optional[str]:
    global _storage_key
    if _storage_key:
        return _storage_key
    if not EMERGENT_KEY:
        logger.warning("EMERGENT_LLM_KEY missing; object storage disabled")
        return None
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        _storage_key = resp.json()["storage_key"]
        return _storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=503, detail="Storage unavailable")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code == 403:
        # refresh key
        globals()['_storage_key'] = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    if not key:
        raise HTTPException(status_code=503, detail="Storage unavailable")
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 403:
        globals()['_storage_key'] = None
        key = init_storage()
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id, "email": email, "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token", value=token,
        httponly=True, secure=True, samesite="none",
        max_age=60 * 60 * 24 * 7, path="/",
    )

# ---------------------------------------------------------------------------
# Geo helpers
# ---------------------------------------------------------------------------
def haversine_m(lat1, lon1, lat2, lon2) -> float:
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * R * math.asin(math.sqrt(a))

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    medical_notes: Optional[str] = None


class SignalCreate(BaseModel):
    type: str = Field(default="medical")  # medical | roadside | general
    title: Optional[str] = None
    description: Optional[str] = None
    lat: float
    lng: float


class MessageCreate(BaseModel):
    text: Optional[str] = None
    voice_path: Optional[str] = None  # storage path

# ---------------------------------------------------------------------------
# WebSocket manager
# ---------------------------------------------------------------------------
class WSManager:
    def __init__(self):
        self.connections: Dict[str, WebSocket] = {}
        self.user_locations: Dict[str, Dict[str, float]] = {}  # user_id -> {lat,lng}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.connections[user_id] = ws

    def disconnect(self, user_id: str):
        self.connections.pop(user_id, None)
        self.user_locations.pop(user_id, None)

    def set_location(self, user_id: str, lat: float, lng: float):
        self.user_locations[user_id] = {"lat": lat, "lng": lng}

    async def send(self, user_id: str, msg: dict):
        ws = self.connections.get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(msg))
            except Exception:
                self.disconnect(user_id)

    async def broadcast_nearby(self, lat: float, lng: float, radius_m: float, msg: dict, exclude_user_id: Optional[str] = None):
        for uid, loc in list(self.user_locations.items()):
            if uid == exclude_user_id:
                continue
            d = haversine_m(lat, lng, loc["lat"], loc["lng"])
            if d <= radius_m:
                await self.send(uid, msg)


ws_manager = WSManager()

# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
@api_router.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": email,
        "name": body.name,
        "password_hash": hash_password(body.password),
        "auth_provider": "password",
        "phone": "",
        "blood_group": "",
        "emergency_contact_name": "",
        "emergency_contact_phone": "",
        "medical_notes": "",
        "picture": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    token = create_access_token(user_id, email)
    set_auth_cookie(response, token)
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    return {"access_token": token, "user": user_doc}


@api_router.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["user_id"], email)
    set_auth_cookie(response, token)
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"access_token": token, "user": user}


@api_router.post("/auth/google/session")
async def google_session(request: Request, response: Response):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing X-Session-ID")
    try:
        r = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}, timeout=20,
        )
        r.raise_for_status()
        data = r.json()
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google session")
    email = (data.get("email") or "").lower()
    name = data.get("name") or email.split("@")[0]
    picture = data.get("picture") or ""
    user = await db.users.find_one({"email": email})
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id, "email": email, "name": name,
            "auth_provider": "google", "picture": picture,
            "phone": "", "blood_group": "", "emergency_contact_name": "",
            "emergency_contact_phone": "", "medical_notes": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user)
    token = create_access_token(user["user_id"], email)
    set_auth_cookie(response, token)
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"access_token": token, "user": user}


@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api_router.patch("/auth/profile")
async def update_profile(body: ProfileUpdate, user=Depends(get_current_user)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if update:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return fresh

# ---------------------------------------------------------------------------
# Signals
# ---------------------------------------------------------------------------
INITIAL_RADIUS = 100
RADIUS_STEP = 100
ESCALATE_EVERY_S = 30
MAX_RADIUS = 5000


@api_router.post("/signals")
async def create_signal(body: SignalCreate, user=Depends(get_current_user)):
    signal_id = f"sig_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    doc = {
        "signal_id": signal_id,
        "user_id": user["user_id"],
        "user_name": user.get("name", ""),
        "user_picture": user.get("picture", ""),
        "user_blood_group": user.get("blood_group", ""),
        "type": body.type,
        "title": body.title or ("Medical emergency" if body.type == "medical" else "Help needed"),
        "description": body.description or "",
        "lat": body.lat,
        "lng": body.lng,
        "radius": INITIAL_RADIUS,
        "status": "active",  # active | responded | resolved | cancelled
        "responders": [],
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "last_escalated_at": now.isoformat(),
    }
    await db.signals.insert_one(doc)
    doc.pop("_id", None)
    # Broadcast over WS to users within current radius
    asyncio.create_task(ws_manager.broadcast_nearby(
        body.lat, body.lng, INITIAL_RADIUS,
        {"event": "new_signal", "signal": doc},
        exclude_user_id=user["user_id"],
    ))
    return doc


@api_router.get("/signals")
async def list_signals(
    lat: float = Query(...), lng: float = Query(...),
    max_distance: float = Query(5000),
    user=Depends(get_current_user),
):
    cur = db.signals.find({"status": {"$in": ["active", "responded"]}}, {"_id": 0})
    results = []
    async for s in cur:
        d = haversine_m(lat, lng, s["lat"], s["lng"])
        # Show if user is within signal's current radius OR within max_distance from user
        if d <= max(s.get("radius", INITIAL_RADIUS), max_distance):
            s["distance_m"] = round(d, 1)
            results.append(s)
    results.sort(key=lambda x: x["distance_m"])
    return results


@api_router.get("/signals/history")
async def signals_history(
    role: str = Query("all"),  # all | created | responded
    status: str = Query("any"),  # any | active | responded | resolved
    user=Depends(get_current_user),
):
    uid = user["user_id"]
    filt: Dict[str, Any] = {}
    if role == "created":
        filt["user_id"] = uid
    elif role == "responded":
        filt["responders.user_id"] = uid
    else:
        filt["$or"] = [{"user_id": uid}, {"responders.user_id": uid}]
    if status != "any":
        filt["status"] = status
    cur = db.signals.find(filt, {"_id": 0}).sort("created_at", -1).limit(100)
    return [s async for s in cur]


@api_router.get("/signals/{signal_id}")
async def get_signal(signal_id: str, user=Depends(get_current_user)):
    s = await db.signals.find_one({"signal_id": signal_id}, {"_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="Signal not found")
    return s


@api_router.post("/signals/{signal_id}/respond")
async def respond_signal(signal_id: str, user=Depends(get_current_user)):
    s = await db.signals.find_one({"signal_id": signal_id})
    if not s:
        raise HTTPException(status_code=404, detail="Signal not found")
    responders = s.get("responders", [])
    uid = user["user_id"]
    if not any(r["user_id"] == uid for r in responders):
        responders.append({
            "user_id": uid,
            "name": user.get("name", ""),
            "picture": user.get("picture", ""),
            "responded_at": datetime.now(timezone.utc).isoformat(),
        })
    await db.signals.update_one(
        {"signal_id": signal_id},
        {"$set": {"responders": responders, "status": "responded",
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    fresh = await db.signals.find_one({"signal_id": signal_id}, {"_id": 0})
    # Notify owner & nearby
    await ws_manager.send(s["user_id"], {"event": "responder_joined", "signal": fresh})
    asyncio.create_task(ws_manager.broadcast_nearby(
        s["lat"], s["lng"], fresh.get("radius", INITIAL_RADIUS),
        {"event": "signal_updated", "signal": fresh},
    ))
    return fresh


@api_router.post("/signals/{signal_id}/resolve")
async def resolve_signal(signal_id: str, user=Depends(get_current_user)):
    s = await db.signals.find_one({"signal_id": signal_id})
    if not s:
        raise HTTPException(status_code=404, detail="Signal not found")
    if s["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Only requester can resolve")
    await db.signals.update_one(
        {"signal_id": signal_id},
        {"$set": {"status": "resolved", "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    fresh = await db.signals.find_one({"signal_id": signal_id}, {"_id": 0})
    asyncio.create_task(ws_manager.broadcast_nearby(
        s["lat"], s["lng"], fresh.get("radius", INITIAL_RADIUS),
        {"event": "signal_resolved", "signal": fresh},
    ))
    return fresh


@api_router.get("/signals/{signal_id}/messages")
async def list_messages(signal_id: str, user=Depends(get_current_user)):
    cur = db.messages.find({"signal_id": signal_id}, {"_id": 0}).sort("created_at", 1)
    return [m async for m in cur]


@api_router.post("/signals/{signal_id}/messages")
async def post_message(signal_id: str, body: MessageCreate, user=Depends(get_current_user)):
    s = await db.signals.find_one({"signal_id": signal_id}, {"_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="Signal not found")
    msg = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "signal_id": signal_id,
        "user_id": user["user_id"],
        "user_name": user.get("name", ""),
        "user_picture": user.get("picture", ""),
        "text": body.text or "",
        "voice_path": body.voice_path or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.messages.insert_one(msg)
    msg.pop("_id", None)
    # Notify owner and all responders
    target_ids = {s["user_id"]} | {r["user_id"] for r in s.get("responders", [])}
    target_ids.discard(user["user_id"])
    for tid in target_ids:
        await ws_manager.send(tid, {"event": "new_message", "signal_id": signal_id, "message": msg})
    return msg


@api_router.post("/signals/{signal_id}/voice")
async def upload_voice(signal_id: str, file: UploadFile = File(...), user=Depends(get_current_user)):
    s = await db.signals.find_one({"signal_id": signal_id})
    if not s:
        raise HTTPException(status_code=404, detail="Signal not found")
    ext = "webm"
    if file.filename and "." in file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower()
    path = f"{APP_NAME}/voice/{user['user_id']}/{uuid.uuid4().hex}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "audio/webm")
    await db.files.insert_one({
        "file_id": f"file_{uuid.uuid4().hex[:12]}",
        "storage_path": result["path"],
        "content_type": file.content_type or "audio/webm",
        "size": result.get("size", len(data)),
        "owner_id": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_deleted": False,
    })
    return {"path": result["path"], "content_type": file.content_type or "audio/webm"}


@api_router.get("/voice")
async def fetch_voice(path: str = Query(...), auth: Optional[str] = Query(None), request: Request = None):
    # Allow either cookie or query token (since <audio src> can't send headers)
    token = request.cookies.get("access_token") if request else None
    if not token and auth:
        token = auth
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    rec = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not rec:
        raise HTTPException(status_code=404, detail="Not found")
    data, ct = get_object(path)
    return FastAPIResponse(content=data, media_type=rec.get("content_type", ct))

# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------
@api_router.websocket("/ws")
async def ws_endpoint(websocket: WebSocket, token: Optional[str] = Query(None)):
    if not token:
        await websocket.close(code=4401)
        return
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
    except Exception:
        await websocket.close(code=4401)
        return
    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            text = await websocket.receive_text()
            try:
                msg = json.loads(text)
            except Exception:
                continue
            if msg.get("type") == "location":
                ws_manager.set_location(user_id, float(msg["lat"]), float(msg["lng"]))
                await websocket.send_text(json.dumps({"event": "ack"}))
            elif msg.get("type") == "ping":
                await websocket.send_text(json.dumps({"event": "pong"}))
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id)
    except Exception:
        ws_manager.disconnect(user_id)

# ---------------------------------------------------------------------------
# Background escalation task
# ---------------------------------------------------------------------------
async def escalation_loop():
    while True:
        try:
            now = datetime.now(timezone.utc)
            cur = db.signals.find({"status": "active"})
            async for s in cur:
                last = s.get("last_escalated_at") or s.get("created_at")
                try:
                    last_dt = datetime.fromisoformat(last)
                    if last_dt.tzinfo is None:
                        last_dt = last_dt.replace(tzinfo=timezone.utc)
                except Exception:
                    last_dt = now
                if (now - last_dt).total_seconds() >= ESCALATE_EVERY_S:
                    new_radius = min(MAX_RADIUS, int(s.get("radius", INITIAL_RADIUS)) + RADIUS_STEP)
                    if new_radius != s.get("radius"):
                        await db.signals.update_one(
                            {"signal_id": s["signal_id"]},
                            {"$set": {"radius": new_radius, "last_escalated_at": now.isoformat(),
                                      "updated_at": now.isoformat()}},
                        )
                        fresh = await db.signals.find_one({"signal_id": s["signal_id"]}, {"_id": 0})
                        await ws_manager.broadcast_nearby(
                            s["lat"], s["lng"], new_radius,
                            {"event": "signal_escalated", "signal": fresh},
                        )
                        logger.info(f"Escalated signal {s['signal_id']} to {new_radius}m")
        except Exception as e:
            logger.error(f"Escalation loop error: {e}")
        await asyncio.sleep(5)

# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@thorahelp.app").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@12345")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": admin_email,
            "name": "Admin",
            "password_hash": hash_password(admin_password),
            "auth_provider": "password",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Admin user seeded")
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.signals.create_index("signal_id", unique=True)
    await db.signals.create_index("status")
    await db.messages.create_index([("signal_id", 1), ("created_at", 1)])
    await seed_admin()
    init_storage()
    asyncio.create_task(escalation_loop())
    logger.info("thoraHELP backend started")


@app.on_event("shutdown")
async def shutdown():
    client.close()

# ---------------------------------------------------------------------------
# Root
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"app": "thoraHELP", "status": "ok"}


app.include_router(api_router)

# CORS: must NOT use wildcard with credentials. Reflect origin from env.
allowed = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*" if "*" in allowed else None,
    allow_origins=[] if "*" in allowed else allowed,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
