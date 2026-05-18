import type {
  FriendItem,
  FriendRequestItem,
  PrivacySettings,
  UserProfile,
} from "../types/chat";

async function requestJSON<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) {
    throw new Error(payload.error || "请求失败");
  }
  return payload;
}

function authHeaders(token: string, extra?: HeadersInit): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

export async function searchUserByUsername(token: string, username: string): Promise<UserProfile | null> {
  const params = new URLSearchParams({ username: username.trim() });
  const response = await requestJSON<{ user: UserProfile | null }>(`/api/users/search?${params.toString()}`, {
    headers: authHeaders(token),
  });
  return response.user;
}

export async function fetchUserProfile(token: string, userId: string): Promise<UserProfile> {
  const response = await requestJSON<{ user: UserProfile }>(`/api/users/${encodeURIComponent(userId)}/profile`, {
    headers: authHeaders(token),
  });
  return response.user;
}

export async function fetchPrivacySettings(token: string): Promise<PrivacySettings> {
  return requestJSON<PrivacySettings>("/api/users/me/privacy", {
    headers: authHeaders(token),
  });
}

export async function updatePrivacySettings(token: string, payload: PrivacySettings): Promise<PrivacySettings> {
  return requestJSON<PrivacySettings>("/api/users/me/privacy", {
    method: "PUT",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
}

export async function sendFriendRequest(
  token: string,
  toUserId: string,
  message: string,
): Promise<{ status: "pending" | "accepted"; user: UserProfile }> {
  return requestJSON<{ status: "pending" | "accepted"; user: UserProfile }>("/api/friend-requests", {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ toUserId, message }),
  });
}

export async function fetchFriendRequests(token: string): Promise<FriendRequestItem[]> {
  const response = await requestJSON<{ items: FriendRequestItem[] }>("/api/friend-requests", {
    headers: authHeaders(token),
  });
  return response.items;
}

export async function acceptFriendRequest(token: string, requestId: string): Promise<FriendItem> {
  const response = await requestJSON<{ friend: FriendItem }>(
    `/api/friend-requests/${encodeURIComponent(requestId)}/accept`,
    {
      method: "POST",
      headers: authHeaders(token),
    },
  );
  return response.friend;
}

export async function rejectFriendRequest(token: string, requestId: string): Promise<void> {
  await requestJSON<{ ok: boolean }>(`/api/friend-requests/${encodeURIComponent(requestId)}/reject`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

export async function fetchFriends(token: string): Promise<FriendItem[]> {
  const response = await requestJSON<{ items: FriendItem[] }>("/api/friends", {
    headers: authHeaders(token),
  });
  return response.items;
}

export async function fetchBlockedFriends(token: string): Promise<FriendItem[]> {
  const response = await requestJSON<{ items: FriendItem[] }>("/api/friends/blocked", {
    headers: authHeaders(token),
  });
  return response.items;
}

export async function updateFriend(
  token: string,
  friendId: string,
  payload: Pick<FriendItem, "remark" | "tags" | "phone" | "description" | "descriptionImages" | "isStarred" | "permission">,
): Promise<FriendItem> {
  const response = await requestJSON<{ friend: FriendItem }>(`/api/friends/${encodeURIComponent(friendId)}`, {
    method: "PUT",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return response.friend;
}

export async function deleteFriend(token: string, friendId: string): Promise<void> {
  await requestJSON<{ ok: boolean }>(`/api/friends/${encodeURIComponent(friendId)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export async function blockFriend(token: string, friendId: string): Promise<FriendItem> {
  const response = await requestJSON<{ friend: FriendItem }>(`/api/friends/${encodeURIComponent(friendId)}/block`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return response.friend;
}

export async function unblockFriend(token: string, friendId: string): Promise<FriendItem> {
  const response = await requestJSON<{ friend: FriendItem }>(`/api/friends/${encodeURIComponent(friendId)}/unblock`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return response.friend;
}

