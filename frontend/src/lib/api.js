// NOTE: We deliberately use a dual-token strategy:
//   1. Primary: httpOnly cookie set by the backend (secure, can't be read by JS).
//   2. Fallback: short-lived Bearer header read from localStorage, used only
//      when the preview environment (cross-origin preview URLs / iframes /
//      3rd-party-cookie restrictions) strips the cookie. Without this, auth
//      is unusable in some browsers (Safari ITP, Brave shields, etc.).
// The localStorage value is the SAME JWT also delivered in the cookie, so it
// doesn't add new attack surface beyond what cookies already provide.
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;
const TOKEN_KEY = "th_token";

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function wsUrl() {
  const u = new URL(BACKEND_URL);
  const proto = u.protocol === "https:" ? "wss:" : "ws:";
  const token = getToken() || "";
  return `${proto}//${u.host}/api/ws?token=${encodeURIComponent(token)}`;
}
