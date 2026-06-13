import { createApiError } from "./apiError";
import { resolveApiUrl } from "../config/env";

export async function requestJSON<T>(input: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(resolveApiUrl(input), init);
    const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
    if (!response.ok) {
      throw createApiError(response.status, payload.error || "请求失败");
    }
    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    if (error instanceof TypeError) {
      throw createApiError(0, "网络异常，请稍后重试");
    }
    throw error;
  }
}

export function authHeaders(token: string, extra?: HeadersInit): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}
