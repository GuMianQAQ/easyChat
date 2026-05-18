import type { CurrentUser } from "../types/chat";

interface CaptchaResponse {
  captchaId: string;
  image: string;
}

interface AuthResponse {
  token: string;
  user: CurrentUser;
}

async function requestJSON<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) {
    throw new Error(payload.error || "请求失败");
  }
  return payload;
}

export function fetchCaptcha(): Promise<CaptchaResponse> {
  return requestJSON<CaptchaResponse>("/api/captcha");
}

export function login(payload: { username: string; password: string }): Promise<AuthResponse> {
  return requestJSON<AuthResponse>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function register(payload: {
  username: string;
  password: string;
  nickname: string;
  avatar: string;
  captchaId: string;
  captchaCode: string;
}): Promise<AuthResponse> {
  return requestJSON<AuthResponse>("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function fetchCurrentUser(token: string): Promise<CurrentUser> {
  const response = await requestJSON<{ user: CurrentUser }>("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.user;
}

export async function updateProfile(
  token: string,
  payload: Partial<Pick<CurrentUser, "nickname" | "avatar" | "gender" | "region" | "signature">>,
): Promise<CurrentUser> {
  const response = await requestJSON<{ user: CurrentUser }>("/api/auth/me", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return response.user;
}
