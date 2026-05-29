import type {
  ChatMessageType,
  ConversationPayload,
  GroupConversationPayload,
  FavoriteItem,
  MessageAroundPayload,
  MessagePagePayload,
  UploadedFileItem,
} from "../types/chat";
import { createApiError } from "./apiError";
import { resolveApiUrl } from "../config/env";

async function requestJSON<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(typeof input === "string" ? resolveApiUrl(input) : input, init);
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

function authHeaders(token: string, extra?: HeadersInit): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

export async function fetchConversations(token: string): Promise<ConversationPayload[]> {
  const response = await requestJSON<{ items: ConversationPayload[] }>("/api/conversations", {
    headers: authHeaders(token),
  });
  return response.items;
}

export async function createPrivateConversation(token: string, targetUserId: string): Promise<ConversationPayload> {
  const response = await requestJSON<{ conversation: ConversationPayload }>("/api/conversations/private", {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ targetUserId }),
  });
  return response.conversation;
}

export async function createGroupConversation(
  token: string,
  name: string,
  memberIds: string[],
): Promise<ConversationPayload> {
  const response = await requestJSON<{ conversation: ConversationPayload }>("/api/conversations/group", {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ name, memberIds }),
  });
  return response.conversation;
}

export async function fetchGroupConversation(
  token: string,
  conversationId: string,
): Promise<GroupConversationPayload> {
  const response = await requestJSON<{ conversation: GroupConversationPayload }>(
    `/api/conversations/${encodeURIComponent(conversationId)}/group`,
    {
      headers: authHeaders(token),
    },
  );
  return response.conversation;
}

export async function updateGroupConversation(
  token: string,
  conversationId: string,
  patch: {
    avatar?: string;
    name?: string;
    announcement?: string;
    remark?: string;
    myNickname?: string;
    isMuted?: boolean;
  },
): Promise<GroupConversationPayload> {
  const response = await requestJSON<{ conversation: GroupConversationPayload }>(
    `/api/conversations/${encodeURIComponent(conversationId)}/group`,
    {
      method: "PATCH",
      headers: authHeaders(token, { "Content-Type": "application/json" }),
      body: JSON.stringify(patch),
    },
  );
  return response.conversation;
}

export async function updateGroupBotEnabled(
  token: string,
  conversationId: string,
  botEnabled: boolean,
): Promise<GroupConversationPayload> {
  const response = await requestJSON<{ conversation: GroupConversationPayload }>(
    `/api/groups/${encodeURIComponent(conversationId)}/bot`,
    {
      method: "PATCH",
      headers: authHeaders(token, { "Content-Type": "application/json" }),
      body: JSON.stringify({ botEnabled }),
    },
  );
  return response.conversation;
}

export async function updateConversationSettings(
  token: string,
  conversationId: string,
  patch: { isPinned?: boolean; isMuted?: boolean },
): Promise<ConversationPayload> {
  const response = await requestJSON<{ conversation: ConversationPayload }>(
    `/api/conversations/${encodeURIComponent(conversationId)}/settings`,
    {
      method: "PATCH",
      headers: authHeaders(token, { "Content-Type": "application/json" }),
      body: JSON.stringify(patch),
    },
  );
  return response.conversation;
}

export async function clearConversationMessages(token: string, conversationId: string): Promise<void> {
  await requestJSON<{ ok: boolean }>(`/api/conversations/${encodeURIComponent(conversationId)}/clear`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

export async function leaveGroupConversation(token: string, conversationId: string): Promise<void> {
  await requestJSON<{ ok: boolean }>(`/api/conversations/${encodeURIComponent(conversationId)}/group/leave`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

export async function dismissGroupConversation(token: string, conversationId: string): Promise<void> {
  await requestJSON<{ ok: boolean }>(`/api/conversations/${encodeURIComponent(conversationId)}/group`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export async function deleteConversation(token: string, conversationId: string): Promise<void> {
  await requestJSON<{ ok: boolean }>(`/api/conversations/${encodeURIComponent(conversationId)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export async function markConversationRead(token: string, conversationId: string): Promise<void> {
  await requestJSON<{ unreadCount: number }>(`/api/conversations/${encodeURIComponent(conversationId)}/read`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

export function fetchMessages(
  token: string,
  conversationId: string,
  page = 1,
  pageSize = 30,
): Promise<MessagePagePayload> {
  const params = new URLSearchParams({
    conversationId,
    page: String(page),
    pageSize: String(pageSize),
  });
  return requestJSON<MessagePagePayload>(`/api/messages?${params.toString()}`, {
    headers: authHeaders(token),
  });
}

export function fetchMessagesAround(
  token: string,
  conversationId: string,
  messageId: string,
  limit = 30,
): Promise<MessageAroundPayload> {
  const params = new URLSearchParams({
    conversationId,
    messageId,
    limit: String(limit),
  });
  return requestJSON<MessageAroundPayload>(`/api/messages/around?${params.toString()}`, {
    headers: authHeaders(token),
  });
}

export async function fetchFavorites(
  token: string,
  params: { type?: "text" | "image"; keyword?: string } = {},
): Promise<FavoriteItem[]> {
  const search = new URLSearchParams();
  if (params.type) {
    search.set("type", params.type);
  }
  if (params.keyword?.trim()) {
    search.set("keyword", params.keyword.trim());
  }
  const suffix = search.toString() ? `?${search.toString()}` : "";
  const response = await requestJSON<{ items: FavoriteItem[] }>(`/api/favorites${suffix}`, {
    headers: authHeaders(token),
  });
  return response.items;
}

export async function createFavorite(token: string, messageId: string): Promise<FavoriteItem> {
  const response = await requestJSON<{ favorite: FavoriteItem }>("/api/favorites", {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ messageId }),
  });
  return response.favorite;
}

export async function deleteFavorite(token: string, favoriteId: string): Promise<void> {
  await requestJSON<{ ok: boolean }>(`/api/favorites/${encodeURIComponent(favoriteId)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export async function deleteFavoriteByMessage(token: string, messageId: string): Promise<void> {
  await requestJSON<{ ok: boolean }>(`/api/favorites/message/${encodeURIComponent(messageId)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export async function uploadImage(token: string, file: Blob, filename = "image.webp"): Promise<string> {
  const formData = new FormData();
  formData.append("file", file, filename);
  const response = await requestJSON<{ url: string }>("/api/upload", {
    method: "POST",
    headers: authHeaders(token),
    body: formData,
  });
  return response.url;
}

export async function uploadFile(
  token: string,
  file: Blob,
  filename: string,
): Promise<UploadedFileItem> {
  const formData = new FormData();
  formData.append("file", file, filename);
  const response = await requestJSON<{ file: UploadedFileItem }>("/api/upload/file", {
    method: "POST",
    headers: authHeaders(token),
    body: formData,
  });
  return response.file;
}

export async function fetchFiles(
  token: string,
  params: { type?: string; keyword?: string } = {},
): Promise<UploadedFileItem[]> {
  const search = new URLSearchParams();
  if (params.type?.trim()) {
    search.set("type", params.type.trim());
  }
  if (params.keyword?.trim()) {
    search.set("keyword", params.keyword.trim());
  }
  const suffix = search.toString() ? `?${search.toString()}` : "";
  const response = await requestJSON<{ items: UploadedFileItem[] }>(`/api/files${suffix}`, {
    headers: authHeaders(token),
  });
  return response.items;
}

export function conversationFromPayload(item: ConversationPayload): {
  id: string;
  type: "private" | "group" | "system";
  title: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageType?: ChatMessageType;
  lastMessageTime?: string;
  unreadCount: number;
  pinned?: boolean;
  muted?: boolean;
  announcement?: string;
  memberCount?: number;
  createdBy?: string;
  targetUserId?: string;
  targetUsername?: string;
  targetNickname?: string;
  targetAvatar?: string;
  targetName?: string;
} {
  return {
    id: item.id,
    type: item.type,
    title: item.name,
    avatar: item.avatar || "",
    lastMessage: item.lastMessage || "",
    lastMessageType: item.lastMessageType || "text",
    lastMessageTime: item.lastMessageTime || "",
    unreadCount: item.unreadCount || 0,
    pinned: item.pinned,
    muted: item.muted,
    announcement: item.announcement || "",
    memberCount: item.memberCount || 0,
    createdBy: item.createdBy || "",
    targetUserId: item.targetUserId || "",
    targetUsername: item.targetUsername || "",
    targetNickname: item.targetNickname || "",
    targetAvatar: item.targetAvatar || "",
    targetName: item.targetName || "",
  };
}
