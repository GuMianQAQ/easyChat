import type { MomentItem, MomentCommentItem } from "../types/chat";
import { resolveApiUrl } from "../config/env";
import { createApiError } from "./apiError";

async function requestJSON<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(typeof input === "string" ? resolveApiUrl(input) : input, init);
  const payload = await response.json();
  if (!response.ok) {
    throw createApiError(response.status, (payload as { error?: string }).error || "请求失败");
  }
  return payload as T;
}

function authHeaders(token: string, extra?: Record<string, string>): HeadersInit {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...extra };
}

export async function fetchMomentsFeed(token: string, userId?: string): Promise<MomentItem[]> {
  const params = new URLSearchParams();
  if (userId?.trim()) {
    params.set("userId", userId.trim());
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const data = await requestJSON<{ items: MomentItem[] }>(`/api/moments/feed${suffix}`, {
    headers: authHeaders(token),
  });
  return data.items;
}

export async function createMoment(
  token: string,
  input: { content: string; images?: string[] },
): Promise<MomentItem> {
  const data = await requestJSON<{ post: MomentItem }>("/api/moments", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  return data.post;
}

export async function deleteMoment(token: string, momentId: string): Promise<void> {
  await requestJSON<{ ok: boolean }>(`/api/moments/${momentId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export async function likeMoment(token: string, momentId: string): Promise<void> {
  await requestJSON<{ ok: boolean }>(`/api/moments/${momentId}/like`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

export async function unlikeMoment(token: string, momentId: string): Promise<void> {
  await requestJSON<{ ok: boolean }>(`/api/moments/${momentId}/like`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export async function addMomentComment(
  token: string,
  momentId: string,
  content: string,
): Promise<MomentCommentItem> {
  const data = await requestJSON<{ comment: MomentCommentItem }>(
    `/api/moments/${momentId}/comments`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ content }),
    },
  );
  return data.comment;
}

export async function deleteMomentComment(
  token: string,
  commentId: string,
): Promise<void> {
  await requestJSON<{ ok: boolean }>(`/api/moments/comments/${commentId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}
