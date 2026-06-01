import type {
  ChatMessageType,
  ConversationPayload,
  GroupConversationPayload,
  FavoriteItem,
  MessageAroundPayload,
  MessagePagePayload,
  UploadedFileItem,
  PinnedMessage,
  GroupFileItem,
  GroupInviteLink,
  Vote,
  Solitaire,
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

// Group chat enhancement API functions

export async function setMemberRole(token: string, conversationId: string, userId: string, role: "admin" | "member"): Promise<void> {
  if (role === "admin") {
    await requestJSON(`/api/conversations/${conversationId}/group/admin`, {
      method: "POST",
      headers: authHeaders(token, { "Content-Type": "application/json" }),
      body: JSON.stringify({ userId }),
    });
  } else {
    await requestJSON(`/api/conversations/${conversationId}/group/admin/${userId}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
  }
}

export async function transferOwnership(token: string, conversationId: string, userId: string): Promise<void> {
  await requestJSON(`/api/conversations/${conversationId}/group/transfer`, {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ userId }),
  });
}

export async function muteMember(token: string, conversationId: string, userId: string, duration: string): Promise<void> {
  await requestJSON(`/api/conversations/${conversationId}/group/mute`, {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ userId, duration }),
  });
}

export async function unmuteMember(token: string, conversationId: string, userId: string): Promise<void> {
  await requestJSON(`/api/conversations/${conversationId}/group/unmute`, {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ userId }),
  });
}

export async function getGroupPermissions(token: string, conversationId: string): Promise<Record<string, unknown>> {
  const response = await requestJSON<{ permissions: Record<string, unknown> }>(`/api/conversations/${conversationId}/group/permissions`, {
    headers: authHeaders(token),
  });
  return response.permissions;
}

export async function updateGroupPermissions(token: string, conversationId: string, permissions: Record<string, unknown>): Promise<void> {
  await requestJSON(`/api/conversations/${conversationId}/group/permissions`, {
    method: "PUT",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(permissions),
  });
}

export async function pinMessage(token: string, conversationId: string, messageId: string): Promise<void> {
  await requestJSON(`/api/conversations/${conversationId}/group/pin`, {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ messageId }),
  });
}

export async function unpinMessage(token: string, conversationId: string, messageId: string): Promise<void> {
  await requestJSON(`/api/conversations/${conversationId}/group/pin/${messageId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export async function getPinnedMessages(token: string, conversationId: string): Promise<PinnedMessage[]> {
  const response = await requestJSON<{ pins: PinnedMessage[] }>(`/api/conversations/${conversationId}/group/pins`, {
    headers: authHeaders(token),
  });
  return response.pins;
}

export async function getGroupFiles(token: string, conversationId: string, type?: string, keyword?: string, page = 1, pageSize = 20): Promise<{ files: GroupFileItem[]; total: number }> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (type) params.set("type", type);
  if (keyword) params.set("keyword", keyword);
  return requestJSON(`/api/conversations/${conversationId}/files?${params}`, {
    headers: authHeaders(token),
  });
}

export async function getGroupImages(token: string, conversationId: string, page = 1, pageSize = 50): Promise<{ images: GroupFileItem[]; total: number }> {
  return requestJSON(`/api/conversations/${conversationId}/images?page=${page}&pageSize=${pageSize}`, {
    headers: authHeaders(token),
  });
}

export async function generateInviteLink(token: string, conversationId: string, expiresIn: string, maxUses: number): Promise<GroupInviteLink> {
  const response = await requestJSON<{ invite: GroupInviteLink }>(`/api/conversations/${conversationId}/group/invites`, {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ expiresIn, maxUses }),
  });
  return response.invite;
}

export async function listInviteLinks(token: string, conversationId: string): Promise<GroupInviteLink[]> {
  const response = await requestJSON<{ invites: GroupInviteLink[] }>(`/api/conversations/${conversationId}/group/invites`, {
    headers: authHeaders(token),
  });
  return response.invites;
}

export async function deleteInviteLink(token: string, conversationId: string, inviteId: string): Promise<void> {
  await requestJSON(`/api/conversations/${conversationId}/group/invites/${inviteId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export async function joinByInviteCode(token: string, code: string): Promise<ConversationPayload> {
  const response = await requestJSON<{ conversation: ConversationPayload }>(`/api/conversations/group/join/${code}`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return response.conversation;
}

export async function createVote(token: string, conversationId: string, question: string, options: string[], allowMulti: boolean, anonymous: boolean, deadline?: string): Promise<Vote> {
  const response = await requestJSON<{ vote: Vote }>(`/api/conversations/${conversationId}/votes`, {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ question, options, allowMulti, anonymous, deadline }),
  });
  return response.vote;
}

export async function getVote(token: string, voteId: string): Promise<Vote> {
  const response = await requestJSON<{ vote: Vote }>(`/api/votes/${voteId}`, {
    headers: authHeaders(token),
  });
  return response.vote;
}

export async function castVote(token: string, voteId: string, optionIds: string[]): Promise<void> {
  await requestJSON(`/api/votes/${voteId}/vote`, {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ optionIds }),
  });
}

export async function unvote(token: string, voteId: string): Promise<void> {
  await requestJSON(`/api/votes/${voteId}/vote`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export async function createSolitaire(token: string, conversationId: string, title: string): Promise<Solitaire> {
  const response = await requestJSON<{ solitaire: Solitaire }>(`/api/conversations/${conversationId}/solitaires`, {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ title }),
  });
  return response.solitaire;
}

export async function getSolitaire(token: string, solitaireId: string): Promise<Solitaire> {
  const response = await requestJSON<{ solitaire: Solitaire }>(`/api/solitaires/${solitaireId}`, {
    headers: authHeaders(token),
  });
  return response.solitaire;
}

export async function joinSolitaire(token: string, solitaireId: string, content: string): Promise<void> {
  await requestJSON(`/api/solitaires/${solitaireId}/join`, {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ content }),
  });
}

export async function updateSolitaireItem(token: string, solitaireId: string, itemId: string, content: string): Promise<void> {
  await requestJSON(`/api/solitaires/${solitaireId}/items/${itemId}`, {
    method: "PUT",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ content }),
  });
}

export async function fetchGroupVotes(token: string, conversationId: string): Promise<Vote[]> {
  return requestJSON(`/api/conversations/${conversationId}/votes`, {
    headers: authHeaders(token),
  });
}

export async function fetchGroupSolitaires(token: string, conversationId: string): Promise<Solitaire[]> {
  return requestJSON(`/api/conversations/${conversationId}/solitaires`, {
    headers: authHeaders(token),
  });
}
