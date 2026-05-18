import { useEffect, useMemo, useRef, useState } from "react";
import ChatView from "./components/chat/ChatView";
import ContactsView from "./components/contacts/ContactsView";
import FavoritesView from "./components/favorites/FavoritesView";
import FilesView from "./components/files/FilesView";
import AddFriendPanel from "./components/chat/AddFriendPanel";
import UserProfileCard from "./components/common/UserProfileCard";
import MainLayout from "./components/layout/MainLayout";
import LoginPage from "./components/login/LoginPage";
import SettingsView from "./components/settings/SettingsView";
import { useChatSocket } from "./hooks/useChatSocket";
import { useLocalStorage } from "./hooks/useLocalStorage";
import type {
  AuthDraft,
  AuthMode,
  ChatMessage,
  ContactItem,
  ContactPermission,
  Conversation,
  CurrentUser,
  DockView,
  FavoriteItem,
  FileRecord,
  FriendItem,
  FriendRequestItem,
  MessageQuote,
  PrivacySettings,
  RegisterFormState,
  UserProfile,
  UserSettings,
} from "./types/chat";
import {
  clearConversationMessages,
  createPrivateConversation,
  createFavorite,
  conversationFromPayload,
  deleteFavorite,
  deleteConversation,
  fetchConversations,
  fetchFavorites,
  fetchMessages,
  markConversationRead,
  updateConversationSettings,
  uploadImage,
} from "./utils/chatApi";
import { captureDisplayFrame, dataUrlToBlob, prepareAvatarDataUrl } from "./utils/media";
import { fetchCaptcha, fetchCurrentUser, login, register, updateProfile } from "./utils/auth";
import {
  acceptFriendRequest,
  blockFriend,
  deleteFriend,
  fetchFriendRequests,
  fetchFriends,
  fetchBlockedFriends,
  fetchPrivacySettings,
  fetchUserProfile,
  rejectFriendRequest,
  searchUserByUsername,
  sendFriendRequest,
  unblockFriend,
  updateFriend,
  updatePrivacySettings,
} from "./utils/friendsApi";
import "./styles/global.css";
import "./styles/login.css";
import "./styles/chat.css";

const DEFAULT_ROOM_NAME = "公共聊天室";
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

const emptyRegisterForm = (): RegisterFormState => ({
  username: "",
  password: "",
  confirmPassword: "",
  nickname: "",
  avatar: "",
  captchaId: "",
  captchaCode: "",
  captchaImage: "",
});

const DEFAULT_AUTH_DRAFT: AuthDraft = {
  mode: "login",
  login: {
    username: "",
    password: "",
  },
  register: emptyRegisterForm(),
};

const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  rememberProfile: true,
  clearAfterSend: true,
  enterToSend: true,
};

const DEFAULT_PRIVACY: PrivacySettings = {
  allowSearch: true,
  allowFriendRequest: true,
  requireFriendVerify: true,
};

function sanitizeAuthDraft(draft: AuthDraft): AuthDraft {
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

function quoteFromMessage(message: ChatMessage): MessageQuote {
  return {
    id: message.id,
    username: message.senderName,
    content: message.content,
    messageType: message.messageType,
    time: message.createdAt,
  };
}

function summarizeMessage(message?: ChatMessage): string {
  if (!message) {
    return "";
  }
  if (message.revoked) {
    return message.content;
  }
  return message.messageType === "image" ? "[图片]" : message.content;
}

function createBaseContacts(user: CurrentUser): ContactItem[] {
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
      id: "public-room",
      name: DEFAULT_ROOM_NAME,
      permission: "chat",
      source: "room",
      lastSeenAt: "实时会话",
      avatar: "",
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

function mapFriendToContact(friend: FriendItem): ContactItem {
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

function mergeContacts(previous: ContactItem[], next: ContactItem[]): ContactItem[] {
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

function upsertConversation(previous: Conversation[], nextConversation: Conversation): Conversation[] {
  const index = previous.findIndex((item) => item.id === nextConversation.id);
  if (index === -1) {
    return [...previous, nextConversation];
  }

  const updated = [...previous];
  updated[index] = { ...updated[index], ...nextConversation };
  return updated;
}

function sortConversations(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }
    const leftTime = left.lastMessageTime || "";
    const rightTime = right.lastMessageTime || "";
    return rightTime.localeCompare(leftTime);
  });
}

function resolveConversationView(conversation: Conversation, friends: FriendItem[]): Conversation {
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

function mergeRemoteConversations(previous: Conversation[], remote: Conversation[]): Conversation[] {
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

function App() {
  const [storedAuthDraft, setStoredAuthDraft, removeStoredAuthDraft] = useLocalStorage<AuthDraft>(
    "easychat:auth-draft",
    DEFAULT_AUTH_DRAFT,
  );
  const [storedToken, setStoredToken] = useLocalStorage<string>("easychat:token", "");
  const [storedSettings, setStoredSettings] = useLocalStorage<UserSettings>(
    "easychat:settings",
    DEFAULT_SETTINGS,
  );
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);
  const [storedContacts, setStoredContacts] = useLocalStorage<ContactItem[]>(
    "easychat:contacts",
    [],
  );

  const [authDraft, setAuthDraft] = useState<AuthDraft>(() =>
    storedSettings.rememberProfile ? storedAuthDraft : DEFAULT_AUTH_DRAFT,
  );
  const [authReady, setAuthReady] = useState(false);
  const [authPending, setAuthPending] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [activeDock, setActiveDock] = useState<DockView>("chat");
  const [activeConversationId, setActiveConversationId] = useState("public");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [favoriteKeyword, setFavoriteKeyword] = useState("");
  const [favoriteType, setFavoriteType] = useState<"all" | "image" | "chat">("all");
  const [favoriteJumpMessageId, setFavoriteJumpMessageId] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileRecord[]>([]);
  const [contactsManagementOpen, setContactsManagementOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [historyState, setHistoryState] = useState<Record<string, { page: number; hasMore: boolean; loading: boolean; loaded: boolean }>>({});
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [blockedFriends, setBlockedFriends] = useState<FriendItem[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequestItem[]>([]);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(DEFAULT_PRIVACY);
  const [friendPanelOpen, setFriendPanelOpen] = useState(false);
  const [friendSearchResult, setFriendSearchResult] = useState<UserProfile | null>(null);
  const [friendSearchError, setFriendSearchError] = useState("");
  const [friendSearching, setFriendSearching] = useState(false);
  const [friendSubmitting, setFriendSubmitting] = useState(false);
  const [profileCard, setProfileCard] = useState<{ profile: UserProfile; x: number; y: number } | null>(null);

  const activeDockRef = useRef(activeDock);
  const activeConversationRef = useRef(activeConversationId);
  const processedMessageRef = useRef("");
  const processedNoticeRef = useRef("");
  const lastRequestCountRef = useRef(0);

  const {
    status,
    messages,
    notifications,
    onlineCount,
    currentUserId,
    roomName,
    join,
    reconnect,
    updateProfile: updateRealtimeProfile,
    replaceConversationMessages,
    prependConversationMessages,
    sendTextMessage,
    sendImageMessage,
    retryMessage,
    revokeMessage,
    removeLocalMessage,
    disconnect,
    resetSession,
    addSystemNotice,
  } = useChatSocket();

  useEffect(() => {
    activeDockRef.current = activeDock;
  }, [activeDock]);

  useEffect(() => {
    activeConversationRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    const theme =
      storedSettings.theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : storedSettings.theme;
    document.documentElement.dataset.theme = theme;
  }, [storedSettings.theme]);

  useEffect(() => {
    if (storedSettings.rememberProfile) {
      setStoredAuthDraft(sanitizeAuthDraft(authDraft));
      return;
    }
    removeStoredAuthDraft();
  }, [authDraft, removeStoredAuthDraft, setStoredAuthDraft, storedSettings.rememberProfile]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (currentUser) {
        if (!cancelled) {
          setAuthReady(true);
        }
        return;
      }

      if (!storedToken) {
        if (!cancelled) {
          setAuthReady(true);
        }
        return;
      }

      try {
        const user = await fetchCurrentUser(storedToken);
        if (cancelled) {
          return;
        }
        setCurrentUser(user);
        setStoredContacts((previous) => mergeContacts(previous, createBaseContacts(user)));
        setHistoryState({});
        setConversations([]);
        await refreshFriends(storedToken);
        await refreshBlockedFriends(storedToken);
        await refreshFriendRequests(storedToken);
        await refreshPrivacy(storedToken);
        await refreshConversations(storedToken);
        await refreshFavorites(storedToken);
        join({ token: storedToken, user });
      } catch {
        if (cancelled) {
          return;
        }
        setStoredToken("");
        setCurrentUser(null);
        resetSession();
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [currentUser, join, resetSession, setStoredContacts, storedToken]);

  useEffect(() => {
    if (authReady && !currentUser && authDraft.mode === "register" && !authDraft.register.captchaId) {
      void refreshCaptcha();
    }
  }, [authDraft.mode, authDraft.register.captchaId, authReady, currentUser]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const dynamic = new Map<string, ContactItem>();
    for (const base of createBaseContacts(currentUser)) {
      dynamic.set(base.id, base);
    }

    for (const message of messages) {
      if (message.type !== "chat") {
        continue;
      }

      if (message.senderId && message.senderId !== currentUserId) {
        dynamic.set(message.senderId, {
          id: message.senderId,
          name: message.senderName,
          avatar: message.avatar,
          permission: "chat",
          source: "recent",
          lastSeenAt: message.createdAt,
        });
      }

      if (message.messageScope === "private" && message.targetUserId && message.targetUserId !== currentUserId) {
        dynamic.set(message.targetUserId, {
          id: message.targetUserId,
          name: message.targetName || message.targetUserId,
          avatar: "",
          permission: "chat",
          source: "recent",
          lastSeenAt: message.createdAt,
        });
      }
    }

    setStoredContacts((previous) => mergeContacts(previous, Array.from(dynamic.values())));
  }, [currentUser, currentUserId, messages, setStoredContacts]);

  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || latestMessage.id === processedMessageRef.current) {
      return;
    }
    processedMessageRef.current = latestMessage.id;

    if (latestMessage.type !== "chat" && latestMessage.type !== "system") {
      return;
    }

    const isPrivate = latestMessage.messageScope === "private";
    const conversationId = latestMessage.conversationId;
    const title =
      conversationId === "public"
        ? DEFAULT_ROOM_NAME
        : isPrivate
          ? latestMessage.isSelf
            ? latestMessage.targetName || latestMessage.targetUserId || "私聊"
            : latestMessage.senderName
          : "系统通知";

    const isOpen =
      !document.hidden &&
      activeDockRef.current === "chat" &&
      activeConversationRef.current === conversationId;

    if (latestMessage.type === "chat" && !latestMessage.isSelf && isOpen && storedToken) {
      void handleMarkConversationRead(conversationId);
    }

    setConversations((previous) => {
      const current =
        previous.find((conversation) => conversation.id === conversationId) ||
        ({
          id: conversationId,
          type: conversationId === "public" ? "public" : isPrivate ? "private" : "system",
          title,
          unreadCount: 0,
          targetUserId: isPrivate
            ? latestMessage.isSelf
              ? latestMessage.targetUserId
              : latestMessage.senderId
            : undefined,
          targetName: isPrivate
            ? latestMessage.isSelf
              ? latestMessage.targetName
              : latestMessage.senderName
            : undefined,
        } satisfies Conversation);

      const next: Conversation = {
        ...current,
        title,
        avatar:
          conversationId === "public"
            ? current.avatar || ""
            : isPrivate
              ? latestMessage.isSelf
                ? current.avatar || current.targetAvatar || ""
                : latestMessage.avatar || current.avatar || ""
              : current.avatar || "",
        lastMessage: summarizeMessage(latestMessage),
        lastMessageTime: latestMessage.createdAt,
        unreadCount: latestMessage.isSelf || isOpen ? 0 : current.unreadCount + 1,
        targetUserId: current.targetUserId,
        targetUsername: current.targetUsername,
        targetNickname: current.targetNickname,
        targetAvatar: current.targetAvatar,
        targetName: current.targetName,
      };

      return sortConversations(upsertConversation(previous, next));
    });
  }, [messages, storedToken]);

  useEffect(() => {
    const latestNotice = notifications[0];
    if (!latestNotice || latestNotice.id === processedNoticeRef.current) {
      return;
    }
    processedNoticeRef.current = latestNotice.id;

    const isOpen =
      !document.hidden &&
      activeDockRef.current === "chat" &&
      activeConversationRef.current === "system";

    setConversations((previous) => {
      const current =
        previous.find((conversation) => conversation.id === "system") ||
        ({ id: "system", type: "system", title: "系统通知", unreadCount: 0 } satisfies Conversation);

      return sortConversations(
        upsertConversation(previous, {
          ...current,
          lastMessage: latestNotice.content,
          lastMessageTime: latestNotice.time,
          unreadCount: isOpen ? 0 : current.unreadCount + 1,
        }),
      );
    });
  }, [notifications]);

  useEffect(() => {
    if (activeDock !== "chat") {
      return;
    }
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === activeConversationId ? { ...conversation, unreadCount: 0 } : conversation,
      ),
    );
  }, [activeConversationId, activeDock]);

  useEffect(() => {
    if (activeDock !== "chat" || activeConversationId === "system") {
      return;
    }
    if (historyState[activeConversationId]?.loaded || historyState[activeConversationId]?.loading) {
      return;
    }
    void loadConversationHistory(activeConversationId, 1);
  }, [activeConversationId, activeDock, historyState, storedToken]);

  useEffect(() => {
    if (activeDock !== "contacts" || !storedToken) {
      return;
    }
    void refreshFriendRequests(storedToken);
    void refreshFriends(storedToken);
    void refreshBlockedFriends(storedToken);
  }, [activeDock, storedToken]);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0),
    [conversations],
  );

  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) Go 简易聊天室` : "Go 简易聊天室";
  }, [totalUnread]);

  useEffect(() => {
    if (!currentUser) {
      lastRequestCountRef.current = 0;
      return;
    }
    const nextCount = friendRequests.filter((item) => item.direction === "received" && item.status === "pending").length;
    if (lastRequestCountRef.current > 0 && nextCount > lastRequestCountRef.current) {
      addSystemNotice({
        eventType: "friend-request-received",
        title: "好友申请",
        content: "收到新的好友申请",
        level: "info",
      });
    }
    lastRequestCountRef.current = nextCount;
  }, [addSystemNotice, currentUser, friendRequests]);

  const favoriteIds = useMemo(
    () => new Set(favoriteItems.map((item) => item.messageId)),
    [favoriteItems],
  );

  const filteredFavorites = useMemo(() => {
    const keyword = favoriteKeyword.trim().toLowerCase();
    return favoriteItems.filter((item) => {
      if (favoriteType === "image" && item.messageType !== "image") {
        return false;
      }
      if (item.senderName.toLowerCase().includes(keyword)) {
        return true;
      }
      if (item.conversationName.toLowerCase().includes(keyword)) {
        return true;
      }
      if (item.messageType === "text" && item.content.toLowerCase().includes(keyword)) {
        return true;
      }
      return keyword ? item.quoteContent.toLowerCase().includes(keyword) : true;
    });
  }, [favoriteItems, favoriteKeyword, favoriteType]);

  const fallbackConversation = useMemo<Conversation>(
    () => ({
      id: "public",
      type: "public",
      title: DEFAULT_ROOM_NAME,
      unreadCount: 0,
      pinned: true,
    }),
    [],
  );
  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) || fallbackConversation;

  const activePrivateFriend = useMemo(
    () =>
      activeConversation.type === "private" && activeConversation.targetUserId
        ? friends.find((item) => item.friendId === activeConversation.targetUserId)
        : undefined,
    [activeConversation.targetUserId, activeConversation.type, friends],
  );

  const visibleConversations = useMemo(
    () => sortConversations(conversations.map((conversation) => resolveConversationView(conversation, friends))),
    [conversations, friends],
  );

  const visibleActiveConversation =
    visibleConversations.find((conversation) => conversation.id === activeConversationId) ||
    resolveConversationView(activeConversation, friends);

  const activePrivateDisabledReason = useMemo(() => {
    if (visibleActiveConversation.type !== "private") {
      return "";
    }
    if (!visibleActiveConversation.targetUserId) {
      return "当前会话不可用";
    }
    if (!activePrivateFriend) {
      return "你们已不是好友";
    }
    if (activePrivateFriend.isBlocked) {
      return "你已将对方加入黑名单";
    }
    if (activePrivateFriend.blockedByPeer) {
      return "对方暂时无法接收你的消息";
    }
    return "";
  }, [activePrivateFriend, visibleActiveConversation.targetUserId, visibleActiveConversation.type]);

  const activeMessages = useMemo(
    () => messages.filter((message) => message.conversationId === activeConversationId),
    [activeConversationId, messages],
  );
  const activeHistory = historyState[activeConversationId];

  const contactItems = useMemo(() => {
    const friendContacts = friends.map(mapFriendToContact);
    const extras = storedContacts.filter((item) => item.source !== "manual");
    const merged = new Map<string, ContactItem>();
    for (const item of [...extras, ...friendContacts]) {
      merged.set(item.id, item);
    }
    return Array.from(merged.values());
  }, [friends, storedContacts]);

  const requestCount = useMemo(
    () => friendRequests.filter((item) => item.direction === "received" && item.status === "pending").length,
    [friendRequests],
  );

  const selectedContact = useMemo(
    () => contactItems.find((item) => item.id === selectedContactId),
    [contactItems, selectedContactId],
  );

  const starredContacts = useMemo(
    () => contactItems.filter((item) => item.isStarred && item.source === "manual"),
    [contactItems],
  );

  const syncAuthDraft = (next: AuthDraft) => {
    setAuthDraft(next);
  };

  const refreshFriends = async (token: string) => {
    const items = await fetchFriends(token);
    setFriends(items);
  };

  const refreshBlockedFriends = async (token: string) => {
    const items = await fetchBlockedFriends(token);
    setBlockedFriends(items);
  };

  const refreshFriendRequests = async (token: string) => {
    const items = await fetchFriendRequests(token);
    setFriendRequests(items);
  };

  const refreshPrivacy = async (token: string) => {
    const settings = await fetchPrivacySettings(token);
    setPrivacySettings(settings);
  };

  const refreshCaptcha = async () => {
    try {
      const nextCaptcha = await fetchCaptcha();
      setAuthDraft((previous) => ({
        ...previous,
        register: {
          ...previous.register,
          captchaId: nextCaptcha.captchaId,
          captchaImage: nextCaptcha.image,
          captchaCode: "",
        },
      }));
    } catch {
      setRegisterError("验证码加载失败");
    }
  };

  const refreshConversations = async (token: string) => {
    const remote = await fetchConversations(token);
    setConversations((previous) =>
      mergeRemoteConversations(
        previous,
        remote.map((item) => conversationFromPayload(item)),
      ),
    );
  };

  const refreshFavorites = async (token: string) => {
    const items = await fetchFavorites(token);
    setFavoriteItems(items);
  };

  const loadConversationHistory = async (conversationId: string, page = 1) => {
    if (!storedToken || conversationId === "system") {
      return;
    }

    const current = historyState[conversationId];
    if (current?.loading) {
      return;
    }

    setHistoryState((previous) => ({
      ...previous,
      [conversationId]: {
        page: previous[conversationId]?.page ?? 0,
        hasMore: previous[conversationId]?.hasMore ?? true,
        loaded: previous[conversationId]?.loaded ?? false,
        loading: true,
      },
    }));

    try {
      const result = await fetchMessages(storedToken, conversationId, page, 30);
      if (page === 1) {
        replaceConversationMessages(conversationId, result.items);
      } else {
        prependConversationMessages(conversationId, result.items);
      }
      setHistoryState((previous) => ({
        ...previous,
        [conversationId]: {
          page,
          hasMore: result.hasMore,
          loaded: true,
          loading: false,
        },
      }));
    } catch (error) {
      setHistoryState((previous) => ({
        ...previous,
        [conversationId]: {
          page: previous[conversationId]?.page ?? 0,
          hasMore: previous[conversationId]?.hasMore ?? true,
          loaded: previous[conversationId]?.loaded ?? false,
          loading: false,
        },
      }));
      addSystemNotice({
        eventType: `history-${conversationId}`,
        title: "消息",
        content: error instanceof Error ? error.message : "历史消息加载失败",
        level: "error",
      });
    }
  };

  const beginSession = (user: CurrentUser, token: string) => {
    processedMessageRef.current = "";
    processedNoticeRef.current = "";
    setCurrentUser(user);
    setStoredToken(token);
    setStoredContacts((previous) => mergeContacts(previous, createBaseContacts(user)));
    setActiveDock("chat");
    setActiveConversationId("public");
    setContactsManagementOpen(false);
    setHistoryState({});
    setConversations([]);
    setFriendSearchResult(null);
    setFriendSearchError("");
    setProfileCard(null);
    resetSession();
    join({ token, user });
    void refreshFriends(token);
    void refreshFriendRequests(token);
    void refreshPrivacy(token);
    void refreshConversations(token);
    void refreshFavorites(token);
  };

  const handleAuthExpired = () => {
    setStoredToken("");
    setCurrentUser(null);
    setLoginError("登录已过期，请重新登录");
    setRegisterError("");
    setActiveDock("chat");
    setActiveConversationId("public");
    setSelectedContactId("");
    setFavoriteKeyword("");
    setFavoriteType("all");
    setFavoriteItems([]);
    setSelectedFiles([]);
    setContactsManagementOpen(false);
    setHistoryState({});
    setConversations([]);
    setFriends([]);
    setBlockedFriends([]);
    setFriendRequests([]);
    setPrivacySettings(DEFAULT_PRIVACY);
    setFriendPanelOpen(false);
    setFriendSearchResult(null);
    setFriendSearchError("");
    setProfileCard(null);
    resetSession();
  };

  const handleAuthAvatarPick = async (file: File) => {
    const avatar = await prepareAvatarDataUrl(file);
    setAuthDraft((previous) => ({
      ...previous,
      register: {
        ...previous.register,
        avatar,
      },
    }));
  };

  const handleProfileAvatarPick = async (file: File) => {
    if (!currentUser || !storedToken) {
      return;
    }
    const avatar = await prepareAvatarDataUrl(file);
    const nextUser = await updateProfile(storedToken, { avatar });
    setCurrentUser(nextUser);
    updateRealtimeProfile(nextUser);
    setStoredContacts((previous) =>
      previous.map((contact) =>
        contact.id === nextUser.id || contact.source === "self"
          ? {
              ...contact,
              id: nextUser.id,
              name: nextUser.nickname,
              username: nextUser.username,
              avatar: nextUser.avatar,
              gender: nextUser.gender,
              region: nextUser.region,
              signature: nextUser.signature,
            }
          : contact,
      ),
    );
    disconnect();
    join({ token: storedToken, user: nextUser });
  };

  const handleAvatarPick = async (file: File) => {
    try {
      if (!currentUser) {
        await handleAuthAvatarPick(file);
        return;
      }
      await handleProfileAvatarPick(file);
    } catch (error) {
      addSystemNotice({
        eventType: "avatar-error",
        title: "头像",
        content: error instanceof Error ? error.message : "头像处理失败",
        level: "error",
      });
    }
  };

  const handleResetAvatar = () => {
    if (!currentUser) {
      setAuthDraft((previous) => ({
        ...previous,
        register: {
          ...previous.register,
          avatar: "",
        },
      }));
      return;
    }

    if (!storedToken) {
      handleAuthExpired();
      return;
    }

    void (async () => {
      try {
        const nextUser = await updateProfile(storedToken, { avatar: "" });
        setCurrentUser(nextUser);
        updateRealtimeProfile(nextUser);
        setStoredContacts((previous) =>
          previous.map((contact) =>
            contact.id === nextUser.id || contact.source === "self"
              ? {
                  ...contact,
                  id: nextUser.id,
                  name: nextUser.nickname,
                  username: nextUser.username,
                  avatar: nextUser.avatar,
                  gender: nextUser.gender,
                  region: nextUser.region,
                  signature: nextUser.signature,
                }
              : contact,
          ),
        );
        disconnect();
        join({ token: storedToken, user: nextUser });
      } catch {
        handleAuthExpired();
      }
    })();
  };

  const handleProfileUpdate = async (
    patch: Partial<Pick<CurrentUser, "nickname" | "gender" | "region" | "signature">>,
  ): Promise<string | null> => {
    if (!currentUser || !storedToken) {
      return "登录已过期，请重新登录";
    }

    try {
      const nextUser = await updateProfile(storedToken, patch);
      setCurrentUser(nextUser);
      updateRealtimeProfile(nextUser);
      setStoredContacts((previous) =>
        previous.map((contact) =>
          contact.id === nextUser.id || contact.source === "self"
            ? {
                ...contact,
                id: nextUser.id,
                name: nextUser.nickname,
                username: nextUser.username,
                avatar: nextUser.avatar,
                gender: nextUser.gender,
                region: nextUser.region,
                signature: nextUser.signature,
                lastSeenAt: "当前在线",
              }
            : contact,
        ),
      );
      if (patch.nickname !== undefined) {
        disconnect();
        join({ token: storedToken, user: nextUser });
      }
      addSystemNotice({ eventType: "profile-updated", title: "资料", content: "资料已更新", level: "success" });
      return null;
    } catch (error) {
      if (error instanceof Error && error.message.includes("登录已过期")) {
        handleAuthExpired();
      }
      return error instanceof Error ? error.message : "资料更新失败";
    }
  };

  const handleLoginSubmit = async () => {
    const username = authDraft.login.username.trim();
    const password = authDraft.login.password;

    if (!username) {
      setLoginError("请输入账号");
      return;
    }
    if (!password) {
      setLoginError("请输入密码");
      return;
    }

    setAuthPending(true);
    setLoginError("");
    setRegisterError("");

    try {
      const response = await login({ username, password });
      beginSession(response.user, response.token);
      setAuthDraft((previous) => ({
        ...previous,
        mode: "login",
        login: { username: storedSettings.rememberProfile ? username : "", password: "" },
      }));
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "账号或密码错误");
    } finally {
      setAuthPending(false);
    }
  };

  const handleRegisterSubmit = async () => {
    const form = authDraft.register;
    const username = form.username.trim();
    const nickname = form.nickname.trim();

    if (!username) {
      setRegisterError("请输入账号");
      return;
    }
    if (!USERNAME_PATTERN.test(username)) {
      setRegisterError("账号需为 3-20 位字母、数字或下划线");
      return;
    }
    if (!form.password) {
      setRegisterError("请输入密码");
      return;
    }
    if (form.password.length < 6) {
      setRegisterError("密码至少 6 位");
      return;
    }
    if (form.confirmPassword !== form.password) {
      setRegisterError("两次密码不一致");
      return;
    }
    if (!nickname) {
      setRegisterError("昵称不能为空");
      return;
    }
    if (nickname.length > 20) {
      setRegisterError("昵称最多 20 个字符");
      return;
    }
    if (!form.captchaCode.trim()) {
      setRegisterError("请输入验证码");
      return;
    }

    setAuthPending(true);
    setLoginError("");
    setRegisterError("");

    try {
      const response = await register({
        username,
        password: form.password,
        nickname,
        avatar: form.avatar,
        captchaId: form.captchaId,
        captchaCode: form.captchaCode.trim(),
      });
      beginSession(response.user, response.token);
      setAuthDraft({
        mode: "login",
        login: { username: storedSettings.rememberProfile ? username : "", password: "" },
        register: emptyRegisterForm(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "注册失败";
      setRegisterError(message);
      if (message.includes("验证码")) {
        void refreshCaptcha();
      }
    } finally {
      setAuthPending(false);
    }
  };

  const handleLogout = () => {
    disconnect();
    resetSession();
    setCurrentUser(null);
    setStoredToken("");
    setActiveDock("chat");
    setActiveConversationId("public");
    setSelectedContactId("");
    setFavoriteKeyword("");
    setFavoriteType("all");
    setFavoriteItems([]);
    setSelectedFiles([]);
    setContactsManagementOpen(false);
    setHistoryState({});
    setConversations([]);
    processedMessageRef.current = "";
    processedNoticeRef.current = "";
    lastRequestCountRef.current = 0;
    setLoginError("");
    setRegisterError("");
    setFriends([]);
    setBlockedFriends([]);
    setFriendRequests([]);
    setPrivacySettings(DEFAULT_PRIVACY);
    setFriendPanelOpen(false);
    setFriendSearchResult(null);
    setFriendSearchError("");
    setProfileCard(null);
    setAuthDraft((previous) => ({
      mode: "login",
      login: { username: storedSettings.rememberProfile ? previous.login.username.trim() : "", password: "" },
      register: emptyRegisterForm(),
    }));
  };

  const openConversation = (conversationId: string) => {
    setActiveDock("chat");
    setActiveConversationId(conversationId);
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
      ),
    );
    if (storedToken) {
      void handleMarkConversationRead(conversationId);
    }
  };

  const handleOpenContactChat = async (contact: ContactItem) => {
    if (contact.source === "room") {
      openConversation("public");
      return;
    }
    if (contact.source !== "manual") {
      return;
    }
    if (!storedToken) {
      handleAuthExpired();
      return;
    }
    const existingConversation = conversations.find(
      (item) => item.type === "private" && item.targetUserId === contact.id,
    );
    if (existingConversation) {
      openConversation(existingConversation.id);
      return;
    }
    try {
      const created = await createPrivateConversation(storedToken, contact.id);
      const conversation = conversationFromPayload(created);
      setConversations((previous) => sortConversations(upsertConversation(previous, conversation)));
      openConversation(conversation.id);
    } catch (error) {
      addSystemNotice({
        eventType: `private-conversation-${contact.id}`,
        title: "会话",
        content: error instanceof Error ? error.message : "会话创建失败",
        level: "error",
      });
    }
  };

  const buildSendOptions = (content: string, quote?: MessageQuote | null) => {
    if (visibleActiveConversation.type === "private") {
      return {
        conversationId: visibleActiveConversation.id,
        messageScope: "private" as const,
        targetUserId: visibleActiveConversation.targetUserId,
        targetName: visibleActiveConversation.targetName,
        content,
        quote,
      };
    }

    return {
      conversationId: "public",
      messageScope: "public" as const,
      content,
      quote,
    };
  };

  const handleSendText = (content: string, quote?: MessageQuote | null) => {
    const sent = sendTextMessage(buildSendOptions(content, quote));
    return sent && storedSettings.clearAfterSend;
  };

  const handleSendImage = async (dataUrl: string, quote?: MessageQuote | null) => {
    if (!storedToken) {
      handleAuthExpired();
      return false;
    }

    try {
      const blob = dataUrlToBlob(dataUrl);
      const url = await uploadImage(storedToken, blob);
      return sendImageMessage(buildSendOptions(url, quote));
    } catch (error) {
      addSystemNotice({
        eventType: "upload-image-failed",
        title: "图片",
        content: error instanceof Error ? error.message : "图片上传失败",
        level: "error",
      });
      return false;
    }
  };

  const handleCaptureScreen = async (quote?: MessageQuote | null) => {
    try {
      const imageData = await captureDisplayFrame();
      if (!imageData) {
        return false;
      }
      return await handleSendImage(imageData, quote);
    } catch (error) {
      addSystemNotice({
        eventType: "capture-error",
        title: "截图",
        content: error instanceof Error ? error.message : "截图失败",
        level: "error",
      });
      return false;
    }
  };

  const handleUpdateConversationSettings = async (
    conversationId: string,
    patch: { isPinned?: boolean; isMuted?: boolean },
  ) => {
    if (!storedToken) {
      handleAuthExpired();
      return;
    }

    try {
      const updated = await updateConversationSettings(storedToken, conversationId, patch);
      const conversation = conversationFromPayload(updated);
      setConversations((previous) => sortConversations(upsertConversation(previous, conversation)));
    } catch (error) {
      addSystemNotice({
        eventType: `conversation-settings-${conversationId}`,
        title: "会话",
        content: error instanceof Error ? error.message : "会话设置保存失败",
        level: "error",
      });
    }
  };

  const handleMarkConversationRead = async (conversationId: string) => {
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
      ),
    );

    if (!storedToken) {
      return;
    }

    try {
      await markConversationRead(storedToken, conversationId);
    } catch (error) {
      addSystemNotice({
        eventType: `conversation-read-${conversationId}`,
        title: "会话",
        content: error instanceof Error ? error.message : "标为已读失败",
        level: "error",
      });
    }
  };

  const handleClearConversation = async () => {
    if (!storedToken) {
      handleAuthExpired();
      return;
    }
    if (!window.confirm("确认清空当前会话的聊天记录吗？")) {
      return;
    }

    try {
      await clearConversationMessages(storedToken, visibleActiveConversation.id);
      replaceConversationMessages(visibleActiveConversation.id, []);
      setHistoryState((previous) => ({
        ...previous,
        [visibleActiveConversation.id]: {
          page: 1,
          hasMore: false,
          loading: false,
          loaded: true,
        },
      }));
      await refreshConversations(storedToken);
    } catch (error) {
      addSystemNotice({
        eventType: `conversation-clear-${visibleActiveConversation.id}`,
        title: "会话",
        content: error instanceof Error ? error.message : "清空聊天记录失败",
        level: "error",
      });
    }
  };

  const handleDeleteConversation = async (conversation: Conversation, confirmDelete = true) => {
    if (!storedToken) {
      handleAuthExpired();
      return;
    }
    if (confirmDelete && !window.confirm("确认删除当前会话吗？")) {
      return;
    }

    try {
      await deleteConversation(storedToken, conversation.id);
      const remoteItems = (await fetchConversations(storedToken)).map((item) => conversationFromPayload(item));
      const nextConversations = mergeRemoteConversations(conversations, remoteItems);
      setConversations(nextConversations);

      if (activeConversationId === conversation.id) {
        const fallback = nextConversations.find((item) => item.id === "public") || nextConversations[0];
        setActiveConversationId(fallback?.id || "public");
      }
    } catch (error) {
      addSystemNotice({
        eventType: `conversation-delete-${conversation.id}`,
        title: "会话",
        content: error instanceof Error ? error.message : "删除会话失败",
        level: "error",
      });
    }
  };

  const toggleFavorite = async (message: ChatMessage) => {
    if (!storedToken) {
      handleAuthExpired();
      return;
    }
    if (message.revoked) {
      addSystemNotice({ eventType: "favorite-revoked", title: "收藏", content: "已撤回消息不能收藏", level: "warning" });
      return;
    }

    const existing = favoriteItems.find((item) => item.messageId === message.id);
    try {
      if (existing) {
        await deleteFavorite(storedToken, existing.id);
        setFavoriteItems((previous) => previous.filter((item) => item.id !== existing.id));
        addSystemNotice({ eventType: `favorite-remove-${message.id}`, title: "收藏", content: "已取消收藏", level: "info" });
        return;
      }

      const favorite = await createFavorite(storedToken, message.id);
      setFavoriteItems((previous) => [favorite, ...previous.filter((item) => item.id !== favorite.id)]);
      addSystemNotice({ eventType: `favorite-add-${message.id}`, title: "收藏", content: "已收藏", level: "success" });
    } catch (error) {
      addSystemNotice({
        eventType: `favorite-error-${message.id}`,
        title: "收藏",
        content: error instanceof Error ? error.message : "收藏失败",
        level: "error",
      });
    }
  };

  const handleCopyMessage = async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);
      addSystemNotice({ eventType: "copy-message", title: "复制", content: "已复制", level: "success" });
    } catch {
      addSystemNotice({ eventType: "copy-message-failed", title: "复制", content: "复制失败", level: "error" });
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    if (!storedToken) {
      handleAuthExpired();
      return;
    }
    try {
      await deleteFavorite(storedToken, favoriteId);
      setFavoriteItems((previous) => previous.filter((item) => item.id !== favoriteId));
      addSystemNotice({ eventType: `favorite-remove-${favoriteId}`, title: "收藏", content: "已取消收藏", level: "info" });
    } catch (error) {
      addSystemNotice({
        eventType: `favorite-remove-error-${favoriteId}`,
        title: "收藏",
        content: error instanceof Error ? error.message : "取消收藏失败",
        level: "error",
      });
    }
  };

  const clearFavorites = () => {
    if (!storedToken) {
      handleAuthExpired();
      return;
    }
    void Promise.all(favoriteItems.map((item) => deleteFavorite(storedToken, item.id))).then(
      () => {
        setFavoriteItems([]);
        addSystemNotice({ eventType: "clear-favorites", title: "数据", content: "已清空收藏", level: "info" });
      },
      (error) => {
        addSystemNotice({
          eventType: "clear-favorites-failed",
          title: "数据",
          content: error instanceof Error ? error.message : "清空收藏失败",
          level: "error",
        });
      },
    );
  };

  const clearContacts = () => {
    if (!currentUser) {
      setStoredContacts([]);
      return;
    }
    setStoredContacts(createBaseContacts(currentUser));
    setSelectedContactId("");
    addSystemNotice({ eventType: "clear-contacts", title: "数据", content: "已清空联系人缓存", level: "info" });
  };

  const clearLoginCache = () => {
    removeStoredAuthDraft();
    setAuthDraft(DEFAULT_AUTH_DRAFT);
    addSystemNotice({ eventType: "clear-login-cache", title: "数据", content: "已清空登录缓存", level: "info" });
  };

  const updateContact = (contactId: string, patch: Partial<ContactItem>) => {
    setStoredContacts((previous) =>
      previous.map((contact) => (contact.id === contactId ? { ...contact, ...patch } : contact)),
    );
  };

  const handleUpdateContact = (contactId: string, patch: Partial<ContactItem>) => {
    const friend = friends.find((item) => item.friendId === contactId);
    if (friend && storedToken) {
      void (async () => {
        try {
          const updated = await updateFriend(storedToken, contactId, {
            remark: patch.remark ?? friend.remark,
            tags: Array.isArray(patch.tags) ? patch.tags : Array.isArray(friend.tags) ? friend.tags : [],
            phone: patch.phone ?? friend.phone ?? "",
            description: patch.description ?? friend.description ?? "",
            descriptionImages: Array.isArray(patch.descriptionImages)
              ? patch.descriptionImages
              : Array.isArray(friend.descriptionImages)
                ? friend.descriptionImages
                : [],
            isStarred: patch.isStarred ?? friend.isStarred,
            permission: (patch.permission ?? friend.permission) as ContactPermission,
          });
          setFriends((previous) => previous.map((item) => (item.friendId === contactId ? updated : item)));
        } catch (error) {
          addSystemNotice({
            eventType: `friend-update-${contactId}`,
            title: "联系人",
            content: error instanceof Error ? error.message : "联系人更新失败",
            level: "error",
          });
        }
      })();
      return;
    }

    updateContact(contactId, patch);
  };

  const handleSetContactPermission = (contactId: string, permission: ContactPermission) => {
    handleUpdateContact(contactId, { permission });
  };

  const handleDeleteFriend = async (friendId: string) => {
    if (!storedToken) {
      handleAuthExpired();
      return;
    }
    if (!window.confirm("删除后将不再显示在通讯录中，但聊天记录不会删除。")) {
      return;
    }
    try {
      await deleteFriend(storedToken, friendId);
      await refreshFriends(storedToken);
      await refreshBlockedFriends(storedToken);
      setSelectedContactId("");
      addSystemNotice({ eventType: `friend-delete-${friendId}`, title: "好友", content: "已删除好友", level: "success" });
    } catch (error) {
      addSystemNotice({
        eventType: `friend-delete-${friendId}`,
        title: "好友",
        content: error instanceof Error ? error.message : "删除好友失败",
        level: "error",
      });
    }
  };

  const handleToggleBlockFriend = async (friendId: string, nextBlocked: boolean) => {
    if (!storedToken) {
      handleAuthExpired();
      return;
    }
    const message = nextBlocked ? "加入黑名单后，对方将不能再给你发送消息。" : "确认将对方移出黑名单吗？";
    if (!window.confirm(message)) {
      return;
    }
    try {
      if (nextBlocked) {
        await blockFriend(storedToken, friendId);
        addSystemNotice({ eventType: `friend-block-${friendId}`, title: "黑名单", content: "已加入黑名单", level: "success" });
      } else {
        await unblockFriend(storedToken, friendId);
        addSystemNotice({ eventType: `friend-unblock-${friendId}`, title: "黑名单", content: "已移出黑名单", level: "success" });
      }
      await refreshFriends(storedToken);
      await refreshBlockedFriends(storedToken);
    } catch (error) {
      addSystemNotice({
        eventType: `friend-block-error-${friendId}`,
        title: "黑名单",
        content: error instanceof Error ? error.message : "操作失败",
        level: "error",
      });
    }
  };

  const handleFriendSearch = async (username: string) => {
    if (!storedToken) {
      handleAuthExpired();
      return;
    }
    const nextUsername = username.trim();
    if (!nextUsername) {
      setFriendSearchResult(null);
      setFriendSearchError("请输入账号");
      return;
    }
    setFriendSearching(true);
    setFriendSearchError("");
    try {
      const result = await searchUserByUsername(storedToken, nextUsername);
      setFriendSearchResult(result);
      if (!result) {
        setFriendSearchError("未找到该用户");
      }
    } catch (error) {
      setFriendSearchResult(null);
      setFriendSearchError(error instanceof Error ? error.message : "搜索失败");
    } finally {
      setFriendSearching(false);
    }
  };

  const handleSendFriendRequest = async (message: string) => {
    if (!storedToken || !friendSearchResult) {
      handleAuthExpired();
      return;
    }
    setFriendSubmitting(true);
    try {
      const result = await sendFriendRequest(storedToken, friendSearchResult.id, message);
      setFriendSearchResult(result.user);
      await refreshFriends(storedToken);
      await refreshFriendRequests(storedToken);
      if (result.status === "accepted") {
        const created = await createPrivateConversation(storedToken, result.user.id);
        const conversation = conversationFromPayload(created);
        setConversations((previous) => sortConversations(upsertConversation(previous, conversation)));
      }
    } catch (error) {
      setFriendSearchError(error instanceof Error ? error.message : "发送失败");
    } finally {
      setFriendSubmitting(false);
    }
  };

  const handleAcceptFriendRequest = async (requestId: string) => {
    if (!storedToken) {
      handleAuthExpired();
      return;
    }
    try {
      const friend = await acceptFriendRequest(storedToken, requestId);
      setFriends((previous) => {
        if (previous.some((item) => item.friendId === friend.friendId)) {
          return previous.map((item) => (item.friendId === friend.friendId ? friend : item));
        }
        return [...previous, friend];
      });
      setFriendRequests((previous) => previous.filter((item) => item.id !== requestId));
      await refreshFriends(storedToken);
      await refreshFriendRequests(storedToken);
      await refreshConversations(storedToken);
      addSystemNotice({
        eventType: `friend-accepted-${friend.friendId}`,
        title: "好友",
        content: "已添加好友",
        level: "success",
      });
    } catch (error) {
      addSystemNotice({
        eventType: `friend-accept-${requestId}`,
        title: "好友申请",
        content: error instanceof Error ? error.message : "处理失败",
        level: "error",
      });
    }
  };

  const handleRejectFriendRequest = async (requestId: string) => {
    if (!storedToken) {
      handleAuthExpired();
      return;
    }
    try {
      await rejectFriendRequest(storedToken, requestId);
      setFriendRequests((previous) => previous.filter((item) => item.id !== requestId));
      await refreshFriendRequests(storedToken);
    } catch (error) {
      addSystemNotice({
        eventType: `friend-reject-${requestId}`,
        title: "好友申请",
        content: error instanceof Error ? error.message : "处理失败",
        level: "error",
      });
    }
  };

  const handlePrivacyChange = async (next: PrivacySettings) => {
    if (!storedToken) {
      handleAuthExpired();
      return;
    }
    try {
      const saved = await updatePrivacySettings(storedToken, next);
      setPrivacySettings(saved);
      addSystemNotice({ eventType: "privacy-updated", title: "隐私", content: "已保存", level: "success" });
    } catch (error) {
      addSystemNotice({
        eventType: "privacy-update-failed",
        title: "隐私",
        content: error instanceof Error ? error.message : "保存失败",
        level: "error",
      });
    }
  };

  const handleOpenProfileCard = async (userId: string, anchor: { x: number; y: number }) => {
    if (!storedToken) {
      handleAuthExpired();
      return;
    }
    try {
      const profile = await fetchUserProfile(storedToken, userId);
      setProfileCard({ profile, x: anchor.x, y: anchor.y });
    } catch (error) {
      addSystemNotice({
        eventType: `profile-${userId}`,
        title: "资料",
        content: error instanceof Error ? error.message : "加载失败",
        level: "error",
      });
    }
  };

  if (!authReady) {
    return null;
  }

  if (!currentUser) {
    return (
      <LoginPage
        draft={authDraft}
        rememberProfile={storedSettings.rememberProfile}
        loginError={loginError}
        registerError={registerError}
        pending={authPending}
        onModeChange={(mode: AuthMode) => {
          setLoginError("");
          setRegisterError("");
          setAuthDraft((previous) => ({ ...previous, mode }));
          if (mode === "register" && !authDraft.register.captchaId) {
            void refreshCaptcha();
          }
        }}
        onDraftChange={syncAuthDraft}
        onRememberChange={(value) => {
          setStoredSettings((previous) => ({ ...previous, rememberProfile: value }));
        }}
        onAvatarPick={handleAvatarPick}
        onResetAvatar={handleResetAvatar}
        onRefreshCaptcha={refreshCaptcha}
        onSubmitLogin={() => void handleLoginSubmit()}
        onSubmitRegister={() => void handleRegisterSubmit()}
      />
    );
  }

  return (
    <>
    <MainLayout
      activeDock={activeDock}
      onDockChange={setActiveDock}
      currentUsername={currentUser.nickname}
      currentAvatar={currentUser.avatar}
      chatUnreadCount={totalUnread}
      sidebarContent={
        activeDock === "chat" ? (
          <ChatView.ConversationList
            items={visibleConversations}
            activeConversationId={activeConversationId}
            onConversationChange={openConversation}
            onOpenAddFriend={() => setFriendPanelOpen(true)}
            onTogglePinned={(conversation, next) =>
              void handleUpdateConversationSettings(conversation.id, { isPinned: next })
            }
            onMarkRead={(conversation) => void handleMarkConversationRead(conversation.id)}
            onToggleMuted={(conversation, next) =>
              void handleUpdateConversationSettings(conversation.id, { isMuted: next })
            }
            onDeleteConversation={(conversation) => void handleDeleteConversation(conversation, true)}
            onHideConversation={(conversation) => void handleDeleteConversation(conversation, false)}
          />
        ) : activeDock === "contacts" ? (
          <ContactsView.List
            contacts={contactItems}
            starredContacts={starredContacts}
            selectedId={selectedContactId}
            managementOpen={contactsManagementOpen}
            requestCount={requestCount}
            onSelect={setSelectedContactId}
            onOpenManagement={() => setContactsManagementOpen(true)}
            onOpenRequests={() => {
              setSelectedContactId("");
              setContactsManagementOpen(false);
            }}
            onOpenProfile={(contact, event) =>
              void handleOpenProfileCard(contact.id, { x: event.clientX + 12, y: event.clientY + 12 })
            }
            onUploadImage={(file) => {
              if (!storedToken) {
                return Promise.reject(new Error("未登录"));
              }
              return uploadImage(storedToken, file);
            }}
          />
        ) : activeDock === "favorites" ? (
          <FavoritesView.List
            favorites={filteredFavorites}
            allCount={favoriteItems.length}
            imageCount={favoriteItems.filter((item) => item.messageType === "image").length}
            activeType={favoriteType}
            onTypeChange={setFavoriteType}
            keyword={favoriteKeyword}
            onKeywordChange={setFavoriteKeyword}
          />
        ) : activeDock === "files" ? (
          <FilesView.List files={selectedFiles} />
        ) : (
          <SettingsView.Sidebar />
        )
      }
      mainContent={
        activeDock === "chat" ? (
          <ChatView.Main
            activeConversation={visibleActiveConversation}
            status={status}
            messages={activeMessages}
            hasMore={activeHistory?.hasMore ?? false}
            loadingMore={activeHistory?.loading ?? false}
            notifications={notifications}
            onlineCount={onlineCount}
            favoriteIds={favoriteIds}
            jumpToMessageId={favoriteJumpMessageId}
            enterToSend={storedSettings.enterToSend}
            composerDisabledReason={activePrivateDisabledReason}
            onReconnect={reconnect}
            onDisconnect={disconnect}
            onSendText={handleSendText}
            onSendImage={handleSendImage}
            onCaptureScreen={handleCaptureScreen}
            onLoadMore={() => {
              if (!activeHistory?.hasMore || activeHistory.loading) {
                return;
              }
              void loadConversationHistory(activeConversationId, (activeHistory.page || 1) + 1);
            }}
            onRetry={(messageId) => retryMessage(messageId)}
            onRevoke={(message) =>
              revokeMessage({
                messageId: message.id,
                conversationId: message.conversationId,
                messageScope: message.messageScope === "private" ? "private" : "public",
                targetUserId: message.targetUserId,
              })
            }
            onDeleteLocal={removeLocalMessage}
            onToggleFavorite={toggleFavorite}
            onCopyMessage={handleCopyMessage}
            onOpenProfile={(profile, event) =>
              void handleOpenProfileCard(profile.userId, { x: event.clientX + 12, y: event.clientY + 12 })
            }
            onCreateQuote={quoteFromMessage}
            onNotice={(title, content, level) =>
              addSystemNotice({ eventType: `ui-${title}-${content}`, title, content, level })
            }
            onJumpHandled={() => setFavoriteJumpMessageId("")}
            onToggleConversationPinned={(next) =>
              void handleUpdateConversationSettings(visibleActiveConversation.id, { isPinned: next })
            }
            onToggleConversationMuted={(next) =>
              void handleUpdateConversationSettings(visibleActiveConversation.id, { isMuted: next })
            }
            onClearConversation={() => void handleClearConversation()}
          />
        ) : activeDock === "contacts" ? (
          <ContactsView.Detail
            managementOpen={contactsManagementOpen}
            friends={friends}
            requests={friendRequests}
            contact={selectedContact}
            onCloseManagement={() => setContactsManagementOpen(false)}
            onOpenManagement={() => setContactsManagementOpen(true)}
            onOpenChat={handleOpenContactChat}
            onUpdateContact={handleUpdateContact}
            onSetPermission={handleSetContactPermission}
            onAcceptRequest={(requestId) => void handleAcceptFriendRequest(requestId)}
            onRejectRequest={(requestId) => void handleRejectFriendRequest(requestId)}
            onDeleteFriend={(friendId) => void handleDeleteFriend(friendId)}
            onToggleBlock={(friendId, nextBlocked) => void handleToggleBlockFriend(friendId, nextBlocked)}
            onOpenProfile={(contact, event) =>
              void handleOpenProfileCard(contact.id, { x: event.clientX + 12, y: event.clientY + 12 })
            }
            onUploadImage={(file) => {
              if (!storedToken) {
                return Promise.reject(new Error("未登录"));
              }
              return uploadImage(storedToken, file);
            }}
          />
        ) : activeDock === "favorites" ? (
          <FavoritesView.Detail
            favorites={filteredFavorites}
            activeType={favoriteType}
            onRemove={(id) => void removeFavorite(id)}
            onOpen={(item) => {
              openConversation(item.conversationId);
              void (async () => {
                await loadConversationHistory(item.conversationId, 1);
                setFavoriteJumpMessageId(item.messageId);
              })();
            }}
          />
        ) : activeDock === "files" ? (
          <FilesView.Detail files={selectedFiles} onPickFiles={setSelectedFiles} />
        ) : (
          <SettingsView.Detail
            settings={storedSettings}
            username={currentUser.username}
            nickname={currentUser.nickname}
            roomName={roomName}
            avatar={currentUser.avatar}
            gender={currentUser.gender}
            region={currentUser.region}
            signature={currentUser.signature}
            status={status}
            privacy={privacySettings}
            blockedFriends={blockedFriends}
            onSettingsChange={setStoredSettings}
            onPrivacyChange={(next) => void handlePrivacyChange(next)}
            onProfileUpdate={handleProfileUpdate}
            onAvatarPick={handleAvatarPick}
            onResetAvatar={handleResetAvatar}
            onClearFavorites={clearFavorites}
            onClearContacts={clearContacts}
            onClearLoginCache={clearLoginCache}
            onUnblockFriend={(friendId) => void handleToggleBlockFriend(friendId, false)}
          />
        )
      }
      onDisconnect={disconnect}
      onLogout={handleLogout}
    />
    {friendPanelOpen ? (
      <AddFriendPanel
        open={friendPanelOpen}
        currentNickname={currentUser.nickname}
        currentUsername={currentUser.username}
        searchResult={friendSearchResult}
        searching={friendSearching}
        submitting={friendSubmitting}
        error={friendSearchError}
        onClose={() => setFriendPanelOpen(false)}
        onSearch={(username) => void handleFriendSearch(username)}
        onSendRequest={(message) => void handleSendFriendRequest(message)}
        onOpenChat={(profile) =>
          void handleOpenContactChat({
            id: profile.id,
            name: profile.nickname,
            avatar: profile.avatar,
            username: profile.username,
            gender: profile.gender,
            region: profile.region,
            signature: profile.signature,
            source: "manual",
            permission: "chat",
          })
        }
        onAcceptRequest={(profile) => {
          const request = friendRequests.find((item) => item.id === profile.requestId) ??
            friendRequests.find(
              (item) => item.direction === "received" && item.user.id === profile.id && item.status === "pending",
            );
          if (request) {
            void handleAcceptFriendRequest(request.id);
          }
        }}
        onOpenProfile={(profile, event) => {
          setProfileCard({ profile, x: event.clientX + 12, y: event.clientY + 12 });
        }}
      />
    ) : null}
    {profileCard ? (
      <UserProfileCard
        profile={profileCard.profile}
        anchor={{ x: profileCard.x, y: profileCard.y }}
        onClose={() => setProfileCard(null)}
        onOpenSettings={() => {
          setActiveDock("settings");
          setProfileCard(null);
        }}
        onOpenChat={(profile) =>
          void handleOpenContactChat({
            id: profile.id,
            name: profile.nickname,
            avatar: profile.avatar,
            username: profile.username,
            gender: profile.gender,
            region: profile.region,
            signature: profile.signature,
            source: profile.isFriend ? "manual" : "recent",
            permission: "chat",
          })
        }
        onSendRequest={(profile) => {
          setFriendPanelOpen(true);
          setFriendSearchResult(profile);
          setProfileCard(null);
        }}
      />
    ) : null}
    </>
  );
}

export default App;


