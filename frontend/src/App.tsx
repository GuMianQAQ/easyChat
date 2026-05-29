import { useEffect, useMemo, useRef, useState } from "react";
import AuthScreen from "./components/app/AuthScreen";
import AppShell from "./components/app/AppShell";
import AvatarPreviewModal from "./components/common/AvatarPreviewModal";
import MomentsWindow from "./components/moments/MomentsWindow";
import { useDesktopAttention } from "./hooks/useDesktopAttention";
import { useChatSocket } from "./hooks/useChatSocket";
import { useConversationDrafts } from "./hooks/useConversationDrafts";
import { useLocalStorage } from "./hooks/useLocalStorage";
import type {
  AuthDraft,
  AuthMode,
  ContactItem,
  Conversation,
  GroupConversationPayload,
  CurrentUser,
  DockView,
  FavoriteItem,
  FileRecord,
  FriendItem,
  FriendRequestItem,
  PrivacySettings,
  UserProfile,
  UserSettings,
} from "./types/chat";
import {
  conversationFromPayload,
  fetchConversations,
  fetchGroupConversation,
  fetchFavorites,
  uploadImage,
} from "./utils/chatApi";
import { fetchCurrentUser } from "./utils/auth";
import {
  fetchFriendRequests,
  fetchFriends,
  fetchPrivacySettings,
} from "./utils/friendsApi";

import {
  applyIncomingConversationMessage,
  applyIncomingSystemNotice,
  isConversationActivelyVisible,
} from "./utils/conversationState";
import {
  createBaseContacts,
  DEFAULT_AUTH_DRAFT,
  DEFAULT_PRIVACY,
  DEFAULT_SETTINGS,
  currentUserToProfile,
  mapFriendToContact,
  mapConversationToContact,
  mergeContacts,
  quoteFromMessage,
  resolveConversationView,
  sanitizeAuthDraft,
  summarizeDraftPreview,
} from "./utils/appHelpers";
import {
  applyGroupConversationSummary,
  reconcileRemoteConversationState,
} from "./utils/conversationListState";
import { createAuthActions } from "./app/createAuthActions";
import { createConversationActions } from "./app/createConversationActions";
import { createSocialActions } from "./app/createSocialActions";
import "./styles/global.css";
import "./styles/login.css";
import "./styles/chat.css";

const APP_NAME = "MyChat";

function App() {
  const isMomentsStandalone =
    window.location.search.includes("window=moments") || Boolean(window.myChatMoments?.isMomentsWindow);
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
  const [activeConversationId, setActiveConversationId] = useState("");
  const [createGroupPanelOpen, setCreateGroupPanelOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [favoriteKeyword, setFavoriteKeyword] = useState("");
  const [favoriteType, setFavoriteType] = useState<"all" | "image" | "chat">("all");
  const [favoriteJumpMessageId, setFavoriteJumpMessageId] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileRecord[]>([]);
  const [contactsManagementOpen, setContactsManagementOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groupConversation, setGroupConversation] = useState<GroupConversationPayload | null>(null);
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
  const [avatarPreviewSrc, setAvatarPreviewSrc] = useState("");

  const { drafts, setDraft, clearAllDrafts } = useConversationDrafts(currentUser?.id ?? null);
  const processedMessageRef = useRef("");
  const processedNoticeRef = useRef("");
  const lastRequestCountRef = useRef(0);
  const isDesktopRuntime = Boolean(window.myChatDesktop && window.myChatWindow);

  const {
    status,
    messages,
    notifications,
    currentUserId,
    join,
    updateProfile: updateRealtimeProfile,
    replaceConversationMessages,
    prependConversationMessages,
    updateConversationMemberNickname,
    sendTextMessage,
    sendImageMessage,
    retryMessage,
    revokeMessage,
    removeLocalMessage,
    disconnect,
    resetSession,
    addSystemNotice,
    streamingState,
  } = useChatSocket();
  const { syncIncomingAttention } = useDesktopAttention({
    activeConversationId,
    activeDock,
    conversations,
    enabled: isDesktopRuntime,
    friends,
    onAttentionOpenConversation: ({ conversationId, activeDock: nextDock }) => {
      if (!conversationId) {
        return;
      }
      setActiveDock(nextDock);
      setActiveConversationId(conversationId);
    },
  });

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
      if (isMomentsStandalone) {
        if (!cancelled) {
          setAuthReady(true);
        }
        return;
      }

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
  }, [currentUser, isMomentsStandalone, join, resetSession, setStoredContacts, storedToken]);

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
    let cancelled = false;

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
    const isGroup = latestMessage.messageScope === "group";
    const knownConversation = conversations.find((conversation) => conversation.id === conversationId);
    const title = isPrivate
      ? latestMessage.isSelf
        ? latestMessage.targetName || latestMessage.targetUserId || "私聊"
        : latestMessage.senderName
      : isGroup
        ? knownConversation?.title || "群聊"
        : "系统通知";

    const isCurrentConversationOpen =
      activeDock === "chat" && activeConversationId === conversationId;
    const browserThinksVisibleAndFocused = !document.hidden && document.hasFocus();
    const isOpen = isConversationActivelyVisible(
      {
        activeConversationId,
        activeDock,
        isWindowVisibleFocused: browserThinksVisibleAndFocused,
      },
      conversationId,
    );

    if (isDesktopRuntime && latestMessage.type === "chat" && !latestMessage.isSelf) {
      void (async () => {
        await syncIncomingAttention(latestMessage, {
          browserVisibleAndFocused: browserThinksVisibleAndFocused,
          isCurrentConversationOpen,
        });
        if (cancelled) {
          return;
        }
      })();
    }

    if (latestMessage.type === "chat" && !latestMessage.isSelf && isOpen && storedToken) {
      void handleMarkConversationRead(conversationId);
    }

    if (isGroup && !knownConversation && storedToken) {
      void refreshConversations(storedToken);
    }

    setConversations((previous) =>
      applyIncomingConversationMessage(previous, latestMessage, {
        isConversationVisible: isOpen,
        title,
      }),
    );

    return () => {
      cancelled = true;
    };
  }, [
    activeConversationId,
    activeDock,
    conversations,
    isDesktopRuntime,
    messages,
    storedToken,
    syncIncomingAttention,
  ]);

  useEffect(() => {
    const latestNotice = notifications[0];
    if (!latestNotice || latestNotice.id === processedNoticeRef.current) {
      return;
    }
    processedNoticeRef.current = latestNotice.id;

    const isOpen =
      !document.hidden && activeDock === "chat" && activeConversationId === "system";

    setConversations((previous) =>
      applyIncomingSystemNotice(previous, latestNotice, {
        isConversationVisible: isOpen,
      }),
    );
  }, [activeConversationId, activeDock, notifications]);

  useEffect(() => {
    if (activeDock !== "chat" || !activeConversationId || activeConversationId === "system") {
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
    if (isDesktopRuntime) {
      document.title = APP_NAME;
      return;
    }
    document.title = totalUnread > 0 ? `(${totalUnread}) ${APP_NAME}` : APP_NAME;
  }, [isDesktopRuntime, totalUnread]);

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

  const friendById = useMemo(() => {
    const map = new Map<string, FriendItem>();
    for (const friend of friends) {
      map.set(friend.friendId, friend);
      map.set(friend.id, friend);
    }
    return map;
  }, [friends]);

  const visibleConversations = useMemo(
    () => conversations.map((conversation) => resolveConversationView(conversation, friendById)),
    [conversations, friendById],
  );

  const visibleConversationsWithDrafts = useMemo(
    () =>
      visibleConversations.map((conversation) => {
        const draft = drafts[conversation.id]?.trim();
        if (!draft) {
          return conversation;
        }
        return {
          ...conversation,
          lastMessage: summarizeDraftPreview(draft),
        };
      }),
    [drafts, visibleConversations],
  );

  useEffect(() => {
    if (!currentUser || activeConversationId || visibleConversations.length === 0) {
      return;
    }
    const firstConversation = visibleConversations.find((conversation) => conversation.type !== "system");
    if (firstConversation) {
      setActiveConversationId(firstConversation.id);
    }
  }, [activeConversationId, currentUser, setActiveConversationId, visibleConversations]);

  const emptyConversation = useMemo<Conversation>(
    () => ({
      id: "",
      type: "system",
      title: "",
      unreadCount: 0,
    }),
    [],
  );

  const visibleActiveConversation =
    visibleConversations.find((conversation) => conversation.id === activeConversationId) ||
    emptyConversation;

  const activePrivateFriend = useMemo(
    () =>
      visibleActiveConversation.type === "private" && visibleActiveConversation.targetUserId
        ? friends.find((item) => item.friendId === visibleActiveConversation.targetUserId)
        : undefined,
    [friends, visibleActiveConversation.targetUserId, visibleActiveConversation.type],
  );

  useEffect(() => {
    if (activeDock !== "chat" || !storedToken || visibleActiveConversation.type !== "group" || !visibleActiveConversation.id) {
      setGroupConversation(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const conversation = await fetchGroupConversation(storedToken, visibleActiveConversation.id);
        if (!cancelled) {
          setGroupConversation(conversation);
        }
      } catch {
        if (!cancelled) {
          setGroupConversation(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeDock, storedToken, visibleActiveConversation.id, visibleActiveConversation.type]);

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

  const handleUpdateGroupConversation = async (
    conversationId: string,
    patch: {
      avatar?: string;
      name?: string;
      announcement?: string;
      remark?: string;
      myNickname?: string;
      isMuted?: boolean;
    },
  ) => {
    const updated = await updateGroupConversationRemote(conversationId, patch);
    if (!updated) {
      return null;
    }

    setGroupConversation(updated);
    setConversations((previous) =>
      applyGroupConversationSummary(previous, conversationId, updated),
    );

    if (patch.myNickname !== undefined && currentUser) {
      updateConversationMemberNickname(conversationId, currentUser.id, patch.myNickname || currentUser.nickname);
    }

    return updated;
  };

  const handleUpdateGroupBotEnabled = async (conversationId: string, botEnabled: boolean) => {
    const updated = await updateGroupBotEnabledRemote(conversationId, botEnabled);
    if (!updated) {
      return null;
    }

    setGroupConversation(updated);
    setConversations((previous) =>
      applyGroupConversationSummary(previous, conversationId, updated),
    );
    return updated;
  };

  const activeMessages = useMemo(
    () => messages.filter((message) => message.conversationId === activeConversationId),
    [activeConversationId, messages],
  );
  const activeHistory = historyState[activeConversationId];
  const currentConversationDraft = drafts[activeConversationId] ?? "";

  const contactItems = useMemo(() => {
    const friendContacts = friends.map(mapFriendToContact);
    const groupContacts = conversations
      .filter((conversation) => conversation.type === "group")
      .map((conversation) => mapConversationToContact(conversation))
      .filter((item): item is ContactItem => Boolean(item));
    const extras = storedContacts.filter((item) => item.source !== "manual" && item.source !== "group");
    const merged = new Map<string, ContactItem>();
    for (const item of [...extras, ...groupContacts, ...friendContacts]) {
      merged.set(item.id, item);
    }
    return Array.from(merged.values());
  }, [conversations, friends, storedContacts]);

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

  const refreshFriendRequests = async (token: string) => {
    const items = await fetchFriendRequests(token);
    setFriendRequests(items);
  };

  const refreshPrivacy = async (token: string) => {
    const settings = await fetchPrivacySettings(token);
    setPrivacySettings(settings);
  };

  const refreshConversations = async (token: string) => {
    const remote = await fetchConversations(token);
    setConversations((previous) =>
      reconcileRemoteConversationState(
        previous,
        remote.map((item) => conversationFromPayload(item)),
      ),
    );
  };

  const refreshFavorites = async (token: string) => {
    const items = await fetchFavorites(token);
    setFavoriteItems(items);
  };

  const {
    refreshCaptcha,
    handleAuthExpired,
    handleAvatarPick,
    handleResetAvatar,
    handleProfileUpdate,
    handleChangePassword,
    handleLoginSubmit,
    handleRegisterSubmit,
    handleLogout,
  } = createAuthActions({
    authDraft,
    storedSettings,
    currentUser,
    storedToken,
    setAuthDraft,
    setAuthPending,
    setLoginError,
    setRegisterError,
    setCurrentUser,
    setStoredToken,
    setStoredContacts,
    setHistoryState,
    setConversations,
    setFavoriteItems,
    setSelectedFiles,
    setActiveDock,
    setActiveConversationId,
    setSelectedContactId,
    setFavoriteKeyword,
    setFavoriteType,
    setContactsManagementOpen,
    setFriends,
    setBlockedFriends,
    setFriendRequests,
    setPrivacySettings,
    setFriendPanelOpen,
    setFriendSearchResult,
    setFriendSearchError,
    setProfileCard,
    clearConversationDrafts: clearAllDrafts,
    processedMessageRef,
    processedNoticeRef,
    lastRequestCountRef,
    join,
    disconnect,
    resetSession,
    updateRealtimeProfile,
    addSystemNotice,
    refreshFriends,
    refreshFriendRequests,
    refreshPrivacy,
    refreshConversations,
    refreshFavorites,
  });

  const {
    refreshBlockedFriends,
    handleUpdateContact,
    handleSetContactPermission,
    handleDeleteFriend,
    handleToggleBlockFriend,
    handleFriendSearch,
    handleSendFriendRequest,
    handleAcceptFriendRequest,
    handleRejectFriendRequest,
    handlePrivacyChange,
    handleOpenProfileCard,
  } = createSocialActions({
    storedToken,
    friends,
    friendSearchResult,
    setFriends,
    setBlockedFriends,
    setFriendRequests,
    setPrivacySettings,
    setStoredContacts,
    setSelectedContactId,
    setFriendSearchResult,
    setFriendSearchError,
    setFriendSearching,
    setFriendSubmitting,
    setProfileCard,
    setConversations,
    handleAuthExpired,
    addSystemNotice,
    refreshConversations,
  });

  const {
    loadConversationHistory,
    handleMarkConversationRead,
    openConversation,
    handleOpenContactChat,
    handleCreateGroupConversation,
    handleSendText,
    handleSendImage,
    handleCaptureScreen,
    handleUpdateConversationSettings,
    handleUpdateGroupConversation: updateGroupConversationRemote,
    handleUpdateGroupBotEnabled: updateGroupBotEnabledRemote,
    handleClearConversation,
    handleDeleteConversation,
    toggleFavorite,
    handleCopyMessage,
    removeFavorite,
    clearFavorites,
    clearContacts,
    clearLoginCache,
    openFavorite,
    handleLeaveGroupConversation,
    handleDismissGroupConversation,
  } = createConversationActions({
    storedToken,
    currentUser,
    chatState: {
      activeConversationId,
      conversations,
      visibleActiveConversation,
      historyState,
    },
    chatStateActions: {
      setActiveDock,
      setActiveConversationId,
      setConversations,
      setHistoryState,
    },
    favoriteState: {
      favoriteItems,
    },
    favoriteActions: {
      setFavoriteItems,
      setFavoriteJumpMessageId,
    },
    localDataActions: {
      setStoredContacts,
      setSelectedContactId,
      setAuthDraft,
      removeStoredAuthDraft,
    },
    handleAuthExpired,
    refreshConversations,
    replaceConversationMessages,
    prependConversationMessages,
    sendTextMessage,
    sendImageMessage,
    addSystemNotice,
  });

  useEffect(() => {
    if (isMomentsStandalone || !window.myChatWindow?.onProfileAction) {
      return;
    }

    return window.myChatWindow.onProfileAction(({ action, profile }) => {
      if (action === "settings") {
        setActiveDock("settings");
        setProfileCard(null);
        return;
      }

      if (action === "send-request") {
        setFriendPanelOpen(true);
        setFriendSearchResult(profile);
        setProfileCard(null);
        return;
      }

      if (action === "chat") {
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
        });
        setProfileCard(null);
      }
    });
  }, [handleOpenContactChat, isMomentsStandalone]);

  useEffect(() => {
    if (activeDock !== "chat" || !activeConversationId || !storedToken) {
      return;
    }

    const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId);
    if (!activeConversation || activeConversation.unreadCount <= 0) {
      return;
    }
    if (document.hidden || !document.hasFocus()) {
      return;
    }

    void handleMarkConversationRead(activeConversationId);
  }, [activeConversationId, activeDock, conversations, storedToken]);

  // Standalone Moments window — render self-contained page
  if (isMomentsStandalone) {
    return <MomentsWindow />;
  }

  if (!authReady) {
    return null;
  }

  if (!currentUser) {
    return (
      <AuthScreen
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
      <AppShell
        activeDock={activeDock}
        onDockChange={setActiveDock}
        currentUser={currentUser}
        totalUnread={totalUnread}
        chatState={{
          visibleConversations: visibleConversationsWithDrafts,
          activeConversationId,
          visibleActiveConversation,
          status,
          activeMessages,
          activeHasMore: activeHistory?.hasMore ?? false,
          activeLoadingMore: activeHistory?.loading ?? false,
          notifications,
          groupConversation,
          favoriteIds,
          favoriteJumpMessageId,
          enterToSend: storedSettings.enterToSend,
          clearAfterSend: storedSettings.clearAfterSend,
          composerDisabledReason: activePrivateDisabledReason,
          draftContent: currentConversationDraft,
          streamingContent: streamingState?.conversationId === activeConversationId ? streamingState.content : undefined,
          streamingLoading: streamingState?.conversationId === activeConversationId ? streamingState.loading : undefined,
        }}
        chatActions={{
          onConversationChange: openConversation,
          onOpenAddFriend: () => {
            setFriendPanelOpen(true);
            setCreateGroupPanelOpen(false);
          },
          onOpenCreateGroup: () => {
            setCreateGroupPanelOpen(true);
            setFriendPanelOpen(false);
          },
          onTogglePinned: (conversation, next) =>
            void handleUpdateConversationSettings(conversation.id, { isPinned: next }),
          onMarkRead: (conversation) => void handleMarkConversationRead(conversation.id),
          onToggleMuted: (conversation, next) =>
            void handleUpdateConversationSettings(conversation.id, { isMuted: next }),
          onDeleteConversation: (conversation) =>
            void handleDeleteConversation(conversation, true),
          onHideConversation: (conversation) =>
            void handleDeleteConversation(conversation, false),
          onUploadImage: (file) => {
            if (!storedToken) {
              return Promise.reject(new Error("未登录"));
            }
            return uploadImage(storedToken, file);
          },
          onSendText: handleSendText,
          onSendImage: handleSendImage,
          onCaptureScreen: handleCaptureScreen,
          onDraftChange: (value) => setDraft(activeConversationId, value),
          onLoadMore: () => {
            if (!activeHistory?.hasMore || activeHistory.loading) {
              return;
            }
            void loadConversationHistory(activeConversationId, (activeHistory.page || 1) + 1);
          },
          onRetry: retryMessage,
          onRevoke: (message) =>
            revokeMessage({
              messageId: message.id,
              conversationId: message.conversationId,
              messageScope:
                message.messageScope === "private" ? "private" : "group",
              targetUserId: message.targetUserId,
            }),
          onDeleteLocal: removeLocalMessage,
          onToggleFavoriteMessage: toggleFavorite,
          onCopyMessage: handleCopyMessage,
          onCreateQuote: quoteFromMessage,
          onNotice: (title, content, level) =>
            addSystemNotice({
              eventType: `ui-${title}-${content}`,
              title,
              content,
              level,
            }),
          onJumpHandled: () => setFavoriteJumpMessageId(""),
          onToggleActiveConversationPinned: (next) =>
            void handleUpdateConversationSettings(visibleActiveConversation.id, {
              isPinned: next,
            }),
          onToggleActiveConversationMuted: (next) => {
            if (visibleActiveConversation.type === "group") {
              setGroupConversation((previous) =>
                previous ? { ...previous, isMuted: next } : previous,
              );
            }
            void handleUpdateConversationSettings(visibleActiveConversation.id, {
              isMuted: next,
            });
          },
          onClearConversation: () => void handleClearConversation(),
          onLeaveGroupConversation: (conversation) =>
            handleLeaveGroupConversation(conversation),
          onDismissGroupConversation: (conversation) =>
            handleDismissGroupConversation(conversation),
          onUpdateGroupConversation: handleUpdateGroupConversation,
          onUpdateGroupBotEnabled: handleUpdateGroupBotEnabled,
        }}
        contactItems={contactItems}
        starredContacts={starredContacts}
        selectedContactId={selectedContactId}
        contactsManagementOpen={contactsManagementOpen}
        requestCount={requestCount}
        filteredFavorites={filteredFavorites}
        favoriteItems={favoriteItems}
        favoriteType={favoriteType}
        favoriteKeyword={favoriteKeyword}
        onFavoriteTypeChange={setFavoriteType}
        onFavoriteKeywordChange={setFavoriteKeyword}
        selectedFiles={selectedFiles}
        friends={friends}
        friendRequests={friendRequests}
        selectedContact={selectedContact}
        privacySettings={privacySettings}
        blockedFriends={blockedFriends}
        friendPanelOpen={friendPanelOpen}
        createGroupPanelOpen={createGroupPanelOpen}
        friendSearchResult={friendSearchResult}
        friendSearching={friendSearching}
        friendSubmitting={friendSubmitting}
        friendSearchError={friendSearchError}
        profileCard={profileCard}
        onSelectContact={setSelectedContactId}
        onOpenContactsManagement={() => setContactsManagementOpen(true)}
        onOpenContactRequests={() => {
          setSelectedContactId("");
          setContactsManagementOpen(false);
        }}
        onOpenProfileCard={(userId, x, y) => void handleOpenProfileCard(userId, { x, y })}
        onOpenCurrentUserProfile={(x, y) => {
          if (!currentUser) {
            return;
          }
          setProfileCard({ profile: currentUserToProfile(currentUser), x, y });
        }}
        onOpenAvatarPreview={(src) => setAvatarPreviewSrc(src)}
        onCloseContactsManagement={() => setContactsManagementOpen(false)}
        onOpenChatFromContact={handleOpenContactChat}
        onOpenContactMoments={(contact) => {
          window.myChatMoments?.open({ userId: contact.friendId || contact.id });
        }}
        onUpdateContact={handleUpdateContact}
        onSetContactPermission={handleSetContactPermission}
        onAcceptRequest={(requestId) => void handleAcceptFriendRequest(requestId)}
        onRejectRequest={(requestId) => void handleRejectFriendRequest(requestId)}
        onDeleteFriend={(friendId) => void handleDeleteFriend(friendId)}
        onToggleBlock={(friendId, nextBlocked) =>
          void handleToggleBlockFriend(friendId, nextBlocked)}
        onRemoveFavorite={(id) => void removeFavorite(id)}
        onOpenFavorite={openFavorite}
        onPickFiles={setSelectedFiles}
        settings={storedSettings}
        onSettingsChange={setStoredSettings}
        onPrivacyChange={(next) => void handlePrivacyChange(next)}
        onProfileUpdate={handleProfileUpdate}
        onChangePassword={(oldPassword, newPassword, confirmPassword) =>
          handleChangePassword({ oldPassword, newPassword, confirmPassword })
        }
        onAvatarPick={handleAvatarPick}
        onResetAvatar={handleResetAvatar}
        onClearFavorites={clearFavorites}
        onClearContacts={clearContacts}
        onClearLoginCache={clearLoginCache}
        onUnblockFriend={(friendId) => void handleToggleBlockFriend(friendId, false)}
        onLogout={handleLogout}
        onCloseAddFriend={() => setFriendPanelOpen(false)}
        onCloseCreateGroup={() => setCreateGroupPanelOpen(false)}
        onCreateGroupConversation={handleCreateGroupConversation}
        onSearchFriend={(username) => void handleFriendSearch(username)}
        onSendFriendRequest={(message) => void handleSendFriendRequest(message)}
        onAcceptProfileRequest={(profile) => {
          const request =
            friendRequests.find((item) => item.id === profile.requestId) ??
            friendRequests.find(
              (item) =>
                item.direction === "received" &&
                item.user.id === profile.id &&
                item.status === "pending",
            );
          if (request) {
            void handleAcceptFriendRequest(request.id);
          }
        }}
        onOpenProfileFromPanel={(profile, x, y) => {
          setProfileCard({ profile, x, y });
        }}
        onOpenChatFromProfile={(profile) =>
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
        onOpenSettingsFromProfile={() => {
          setActiveDock("settings");
          setProfileCard(null);
        }}
        onCloseProfileCard={() => setProfileCard(null)}
        onOpenSendRequestFromProfile={(profile) => {
          setFriendPanelOpen(true);
          setFriendSearchResult(profile);
          setProfileCard(null);
        }}
        onOpenMomentsFromProfile={(profile) => {
          window.myChatMoments?.open({ userId: profile.id });
          setProfileCard(null);
        }}

      />

      <AvatarPreviewModal
        open={Boolean(avatarPreviewSrc)}
        src={avatarPreviewSrc}
        onClose={() => setAvatarPreviewSrc("")}
      />
    </>
  );
}

export default App;


