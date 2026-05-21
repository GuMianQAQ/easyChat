import type { CurrentUser } from "../types/chat";
import { createApiError } from "./apiError";
import { resolveApiUrl } from "../config/env";

interface CaptchaResponse {
  captchaId: string;
  image: string;
}

interface AuthResponse {
  token: string;
  user: CurrentUser;
}

async function requestJSON<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(typeof input === "string" ? resolveApiUrl(input) : input, init);
    const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
    if (!response.ok) {
      throw createApiError(response.status, payload.error || "\u8bf7\u6c42\u5931\u8d25");
    }
    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    if (error instanceof TypeError) {
      throw createApiError(0, "\u7f51\u7edc\u5f02\u5e38\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5");
    }
    throw error;
  }
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
  confirmPassword: string;
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
  const response = await requestJSON<{ user: CurrentUser }>("/api/users/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.user;
}

export async function updateProfile(
  token: string,
  payload: Partial<Pick<CurrentUser, "nickname" | "avatar" | "gender" | "region" | "signature">>,
): Promise<CurrentUser> {
  const response = await requestJSON<{ user: CurrentUser }>("/api/users/me/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return response.user;
}

export async function changePassword(
  token: string,
  payload: { oldPassword: string; newPassword: string; confirmPassword: string },
): Promise<string> {
  const response = await requestJSON<{ message: string }>("/api/users/me/password", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return response.message;
}
