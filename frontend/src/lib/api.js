import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

// also attach Authorization header from localStorage as fallback (some browsers strip 3rd-party cookies)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("th_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

export function setToken(t) {
  if (t) localStorage.setItem("th_token", t);
  else localStorage.removeItem("th_token");
}

export function getToken() {
  return localStorage.getItem("th_token");
}

export function wsUrl() {
  const u = new URL(BACKEND_URL);
  const proto = u.protocol === "https:" ? "wss:" : "ws:";
  const token = getToken() || "";
  return `${proto}//${u.host}/api/ws?token=${encodeURIComponent(token)}`;
}
