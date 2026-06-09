# thoraHELP - Hyperlocal Community Emergency Help App

## Original Problem Statement
Build a community emergency help app called **thoraHELP**:
- A massive emergency SOS button at the top — single tap creates a medical emergency signal that alerts users within a 100m radius
- Real-time text + voice chat (WhatsApp style) for both medical emergencies AND outdoor problems (roadside breakdowns, fuel issues, vehicle failure)
- Live map showing requester's position and tracking of nearby users
- Smart escalation: if no one responds in 30s, expand radius by 100m, and keep expanding every 30s
- Mobile + Web versions, with proper header, footer, nice logo
- Light, clean, trustworthy UI — ready for Play Store / App Store launch

## User Choices (gathered via ask_human)
- **Auth**: Email/password JWT + Emergent Google login (both)
- **Map**: Leaflet + OpenStreetMap (free)
- **Real-time**: WebSockets for MVP
- **Voice**: Full voice + text chat with object storage
- **Mobile**: Responsive PWA covering both web and mobile

## Architecture
### Backend (FastAPI + MongoDB + WebSockets)
- `/api/auth/*` — register, login, logout, me, profile patch, google session
- `/api/signals` — create, list nearby, get by id, respond, resolve
- `/api/signals/{id}/messages` — text + voice messages
- `/api/signals/{id}/voice` — upload voice (multipart) → Emergent object storage
- `/api/voice` — secured retrieval by path
- `/api/ws` — WebSocket for live updates (token in query)
- Background loop: every 5s, check active signals; if last_escalated > 30s ago, expand radius by 100m up to 5000m, broadcast over WS
- Haversine distance for proximity matching

### Frontend (React 19 + Tailwind + shadcn/ui + Leaflet)
- Landing page (hero, bento features, CTAs)
- Login + Signup (split screen with Google button)
- AuthCallback (handles Emergent Google session_id in URL fragment)
- Dashboard (SOS button + live map + nearby feed)
- MapPage (full-screen map view)
- SignalDetail (info, mini-map, WhatsApp-style chat with text + voice playback)
- Profile (medical info, emergency contacts, blood group)
- Header (with logo + dropdown), Footer (links, app store badges), BottomNav (mobile)

## Implemented (2026-02)
- Auth: email/password JWT + Emergent Google login (both)
- WebSocket realtime: new_signal, new_message, signal_escalated, signal_updated, signal_resolved
- Live geolocation tracking + nearby filtering via Haversine
- Voice messages via browser MediaRecorder + Emergent object storage
- Auto-escalating radius (100m → +100m every 30s up to 5km)
- Mobile bottom nav + responsive layouts
- Light pulsing SOS button + pulsing markers on map
- Toast notifications for incoming signals

## Implemented (2026-02, iteration 2)
- PWA: manifest.json, service worker, icon.svg, theme color, Apple touch meta
- i18n: English + Hindi with persistent localStorage language switcher; updates `<html lang>`
- Signal history page (/app/history) with role tabs (All / I created / I responded) + status filter
- SMS fallback: device sms: URL scheme button on SignalDetail prefilled with Google Maps location

## Backlog / Next Action Items
- P1: Background/push notifications (Firebase) for when app is closed
- P1: Display responder pins on map; ETA estimates
- P2: Share location via SMS to emergency contact as fallback
- P2: PWA installability (manifest.json + service worker for offline cache)
- P2: Multi-language support (Hindi + English at minimum)
- P2: Verification badges for medical professionals nearby
- P2: Signal history page (resolved signals)

## Test Credentials
See `/app/memory/test_credentials.md`
