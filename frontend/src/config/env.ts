const DESKTOP_DEFAULT_API_BASE_URL = "http://127.0.0.1:8080";
const DESKTOP_DEFAULT_WS_BASE_URL = "ws://127.0.0.1:8080";

interface RuntimeConfig {
  apiBaseUrl?: string;
  wsBaseUrl?: string;
}

function normalizeBaseUrl(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim() || fallback;
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function getBrowserFallbackApiBaseUrl(): string {
  if (typeof window === "undefined") {
    return DESKTOP_DEFAULT_API_BASE_URL;
  }
  if (window.myChatDesktop) {
    return DESKTOP_DEFAULT_API_BASE_URL;
  }
  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    return window.location.origin;
  }
  return DESKTOP_DEFAULT_API_BASE_URL;
}

function getBrowserFallbackWsBaseUrl(): string {
  if (typeof window === "undefined") {
    return DESKTOP_DEFAULT_WS_BASE_URL;
  }
  if (window.myChatDesktop) {
    return DESKTOP_DEFAULT_WS_BASE_URL;
  }
  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}`;
  }
  return DESKTOP_DEFAULT_WS_BASE_URL;
}

function getRuntimeConfig(): RuntimeConfig {
  if (typeof window === "undefined") {
    return {};
  }
  return window.chatRoomConfig || {};
}

const runtimeConfig = getRuntimeConfig();

export const API_BASE_URL = normalizeBaseUrl(
  runtimeConfig.apiBaseUrl || import.meta.env.VITE_API_BASE_URL,
  getBrowserFallbackApiBaseUrl(),
);

export const WS_BASE_URL = normalizeBaseUrl(
  runtimeConfig.wsBaseUrl || import.meta.env.VITE_WS_BASE_URL,
  getBrowserFallbackWsBaseUrl(),
);

export function resolveApiUrl(path: string): string {
  return new URL(path, `${API_BASE_URL}/`).toString();
}

export function resolveWsUrl(path: string): string {
  return new URL(path, `${WS_BASE_URL}/`).toString();
}
