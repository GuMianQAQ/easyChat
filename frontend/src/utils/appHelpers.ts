import type {
  AuthDraft,
  ChatMessage,
  ContactItem,
  Conversation,
  CurrentUser,
  FriendItem,
  MessageQuote,
  RegisterFormState,
  UserSettings,
  PrivacySettings,
} from "../types/chat";

export const DEFAULT_ROOM_NAME = "系统通知";
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

export const emptyRegisterForm = (): RegisterFormState => ({
  username: "",
  password: "",
  confirmPassword: "",
  nickname: "",
  avatar: "",
  captchaId: "",
  captchaCode: "",
  captchaImage: "",
});

export const DEFAULT_AUTH_DRAFT: AuthDraft = {
  mode: "login",
  login: {
    username: "",
    password: "",
  },
  register: emptyRegisterForm(),
};

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  rememberProfile: true,
  clearAfterSend: true,
  enterToSend: true,
};

export const DEFAULT_PRIVACY: PrivacySettings = {
  allowSearch: true,
  allowFriendRequest: true,
  requireFriendVerify: true,
};

export function sanitizeAuthDraft(draft: AuthDraft): AuthDraft {
  return {
    mode: draft.mode,
    login: {
      username: draft.login.username.trim(),
      password: "",
    },
    register: {
      ...draft.register,
      username: draft.register.username.trim(),
      password: "",
      confirmPassword: "",
      captchaCode: "",
    },
  };
}

export function quoteFromMessage(message: ChatMessage): MessageQuote {
  return {
    id: message.id,
    username: message.senderName,
    content: message.content,
    messageType: message.messageType,
    time: message.createdAt,
  };
}

function normalizePreviewText(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed === "undefined" || trimmed === "null" || trimmed === "[object Object]") {
    return "";
  }
  if (/^(https?:\/\/|data:)/i.test(trimmed)) {
    return "";
  }
  if (/^\s*[\[{].*[\]}]\s*$/s.test(trimmed)) {
    return "";
  }
  return trimmed.replace(/\s+/g, " ");
}

function shortenPreviewText(value: string, maxLength = 40): string {
  const normalized = normalizePreviewText(value);
  if (!normalized) {
    return "";
  }
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}…` : normalized;
}

function extractFileName(value: string): string {
  const normalized = normalizePreviewText(value);
  if (!normalized) {
    return "";
  }

  const lastSlash = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
  const tail = lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
  return decodeURIComponent(tail.split("?")[0].split("#")[0]);
}

export function summarizeMessage(message?: ChatMessage): string {
  if (!message) {
    return "";
  }
  if (message.revoked) {
    return "[已撤回]";
  }
  if (message.messageType === "image") {
    return "[图片]";
  }
  if (message.messageType === "file") {
    const fileName = extractFileName(message.content);
    return fileName ? `[文件] ${shortenPreviewText(fileName, 24)}` : "[文件]";
  }
  const text = shortenPreviewText(message.content);
  return text || "[消息]";
}

export function summarizeConversationPreview(messageType: string, content: string): string {
  if (messageType === "image") {
    return "[图片]";
  }
  if (messageType === "file") {
    const fileName = extractFileName(content);
    return fileName ? `[文件] ${shortenPreviewText(fileName, 24)}` : "[文件]";
  }
  const text = shortenPreviewText(content);
  return text || "[消息]";
}

export function summarizeDraftPreview(content: string): string {
  const text = shortenPreviewText(content);
  return text ? `[草稿] ${text}` : "[草稿]";
}

export function createBaseContacts(user: CurrentUser): ContactItem[] {
  return [
    {
      id: user.id,
      name: user.nickname,
      avatar: user.avatar,
      username: user.username,
      permission: "chat",
      source: "self",
      lastSeenAt: "当前在线",
      gender: user.gender,
      region: user.region,
      signature: user.signature,
    },
    {
      id: "system-assistant",
      name: "系统助手",
      permission: "limited",
      source: "system",
      lastSeenAt: "本地通知",
      avatar: "",
    },
  ];
}

export function currentUserToProfile(user: CurrentUser) {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    avatar: user.avatar,
    gender: user.gender,
    region: user.region,
    signature: user.signature,
    isSelf: true,
    isFriend: true,
    requestStatus: "accepted" as const,
    allowFriendRequest: false,
  };
}

export function mapFriendToContact(friend: FriendItem): ContactItem {
  return {
    id: friend.friendId,
    friendId: friend.friendId,
    username: friend.username,
    name: friend.nickname,
    avatar: friend.avatar,
    gender: friend.gender,
    region: friend.region,
    signature: friend.signature,
    remark: friend.remark,
    tags: Array.isArray(friend.tags) ? friend.tags : [],
    phone: friend.phone,
    description: friend.description,
    descriptionImages: Array.isArray(friend.descriptionImages) ? friend.descriptionImages : [],
    isStarred: friend.isStarred,
    isBlocked: friend.isBlocked,
    blockedAt: friend.blockedAt,
    blockedByPeer: friend.blockedByPeer,
    permission: friend.permission,
    lastSeenAt: friend.createdAt,
    addedAt: friend.createdAt,
    source: "manual",
  };
}

export function mapConversationToContact(conversation: Conversation): ContactItem | null {
  if (conversation.type !== "group") {
    return null;
  }

  return {
    id: conversation.id,
    name: conversation.title,
    avatar: conversation.avatar || "",
    permission: "chat",
    source: "group",
    lastSeenAt: conversation.lastMessageTime,
    addedAt: conversation.lastMessageTime,
  };
}

export function mergeContacts(previous: ContactItem[], next: ContactItem[]): ContactItem[] {
  const existing = new Map(previous.map((item) => [item.id, item]));
  return next.map((item) => {
    const cached = existing.get(item.id);
    if (!cached) {
      return item;
    }
    return {
      ...item,
      remark: cached.remark ?? item.remark,
      tags: Array.isArray(cached.tags) ? cached.tags : Array.isArray(item.tags) ? item.tags : [],
      phone: cached.phone ?? item.phone,
      description: cached.description ?? item.description,
      descriptionImages: Array.isArray(cached.descriptionImages)
        ? cached.descriptionImages
        : Array.isArray(item.descriptionImages)
          ? item.descriptionImages
          : [],
      isStarred: cached.isStarred ?? item.isStarred,
      permission: cached.permission ?? item.permission,
    };
  });
}

export function upsertConversation(previous: Conversation[], nextConversation: Conversation): Conversation[] {
  const index = previous.findIndex((item) => item.id === nextConversation.id);
  if (index === -1) {
    return [...previous, nextConversation];
  }

  const updated = [...previous];
  updated[index] = { ...updated[index], ...nextConversation };
  return updated;
}

export function sortConversations(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }
    const leftTime = left.lastMessageTime || "";
    const rightTime = right.lastMessageTime || "";
    return rightTime.localeCompare(leftTime);
  });
}

export function resolveConversationView(conversation: Conversation, friends: FriendItem[]): Conversation {
  if (conversation.type !== "private" || !conversation.targetUserId) {
    return conversation;
  }
  const friend = friends.find((item) => item.friendId === conversation.targetUserId);
  if (!friend) {
    return conversation;
  }
  const displayName = friend.remark || friend.nickname;
  return {
    ...conversation,
    title: displayName,
    avatar: friend.avatar || conversation.avatar || "",
    targetNickname: friend.nickname,
    targetAvatar: friend.avatar || conversation.targetAvatar || "",
    targetName: displayName,
  };
}

export function mergeRemoteConversations(previous: Conversation[], remote: Conversation[]): Conversation[] {
  const local = new Map(previous.map((conversation) => [conversation.id, conversation]));
  const systemConversation =
    local.get("system") ||
    ({
      id: "system",
      type: "system",
      title: "系统通知",
      unreadCount: 0,
    } satisfies Conversation);

  const merged: Conversation[] = remote.map((conversation) => {
    const cached = local.get(conversation.id);
    return {
      ...conversation,
      unreadCount: cached?.unreadCount ?? conversation.unreadCount,
      pinned: conversation.pinned ?? cached?.pinned,
      muted: conversation.muted ?? cached?.muted,
    };
  });

  if (!merged.find((conversation) => conversation.id === "system")) {
    merged.push(systemConversation);
  }

  return sortConversations(merged);
}
