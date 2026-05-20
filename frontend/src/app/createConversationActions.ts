import type { Dispatch, SetStateAction } from "react";
import type {
  AuthDraft,
  ChatMessage,
  ContactItem,
  Conversation,
  CurrentUser,
  GroupConversationPayload,
  FavoriteItem,
  MessageQuote,
  NotificationItem,
} from "../types/chat";
import {
  clearConversationMessages,
  conversationFromPayload,
  createFavorite,
  createGroupConversation,
  createPrivateConversation,
  deleteConversation,
  deleteFavorite,
  fetchConversations,
  fetchMessages,
  markConversationRead,
  updateConversationSettings,
  updateGroupConversation,
  uploadImage,
} from "../utils/chatApi";
import { DEFAULT_AUTH_DRAFT, createBaseContacts, mergeRemoteConversations, sortConversations, upsertConversation } from "../utils/appHelpers";
import { isAuthExpiredError } from "../utils/apiError";
import { captureDisplayFrame, dataUrlToBlob } from "../utils/media";

type HistoryState = Record<
  string,
  { page: number; hasMore: boolean; loading: boolean; loaded: boolean }
>;

interface CreateConversationActionsOptions {
  storedToken: string;
  currentUser: CurrentUser | null;
  activeConversationId: string;
  conversations: Conversation[];
  visibleActiveConversation: Conversation;
  favoriteItems: FavoriteItem[];
  historyState: HistoryState;
  setActiveDock: Dispatch<SetStateAction<"chat" | "contacts" | "favorites" | "files" | "settings">>;
  setActiveConversationId: Dispatch<SetStateAction<string>>;
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
  setHistoryState: Dispatch<SetStateAction<HistoryState>>;
  setFavoriteItems: Dispatch<SetStateAction<FavoriteItem[]>>;
  setFavoriteJumpMessageId: Dispatch<SetStateAction<string>>;
  setStoredContacts: Dispatch<SetStateAction<ContactItem[]>>;
  setSelectedContactId: Dispatch<SetStateAction<string>>;
  setAuthDraft: Dispatch<SetStateAction<AuthDraft>>;
  removeStoredAuthDraft: () => void;
  handleAuthExpired: () => void;
  refreshConversations: (token: string) => Promise<void>;
  replaceConversationMessages: (conversationId: string, items: import("../types/chat").ServerMessage[]) => void;
  prependConversationMessages: (conversationId: string, items: import("../types/chat").ServerMessage[]) => void;
  sendTextMessage: (options: {
    conversationId: string;
    messageScope: "private" | "group";
    targetUserId?: string;
    targetName?: string;
    content: string;
    quote?: MessageQuote | null;
  }) => boolean;
  sendImageMessage: (options: {
    conversationId: string;
    messageScope: "private" | "group";
    targetUserId?: string;
    targetName?: string;
    content: string;
    quote?: MessageQuote | null;
  }) => boolean;
  addSystemNotice: (options: {
    eventType: string;
    title: string;
    content: string;
    level?: NotificationItem["level"];
  }) => void;
}

export function createConversationActions({
  storedToken,
  currentUser,
  activeConversationId,
  conversations,
  visibleActiveConversation,
  favoriteItems,
  historyState,
  setActiveDock,
  setActiveConversationId,
  setConversations,
  setHistoryState,
  setFavoriteItems,
  setFavoriteJumpMessageId,
  setStoredContacts,
  setSelectedContactId,
  setAuthDraft,
  removeStoredAuthDraft,
  handleAuthExpired,
  refreshConversations,
  replaceConversationMessages,
  prependConversationMessages,
  sendTextMessage,
  sendImageMessage,
  addSystemNotice,
}: CreateConversationActionsOptions) {
  const handleAuthError = (error: unknown) => {
    if (isAuthExpiredError(error)) {
      handleAuthExpired();
      return true;
    }
    return false;
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
      if (handleAuthError(error)) {
        return;
      }
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
      if (handleAuthError(error)) {
        return;
      }
      addSystemNotice({
        eventType: `conversation-read-${conversationId}`,
        title: "会话",
        content: error instanceof Error ? error.message : "标为已读失败",
        level: "error",
      });
    }
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
      if (handleAuthError(error)) {
        return;
      }
      addSystemNotice({
        eventType: `private-conversation-${contact.id}`,
        title: "会话",
        content: error instanceof Error ? error.message : "会话创建失败",
        level: "error",
      });
    }
  };

  const handleCreateGroupConversation = async (name: string, memberIds: string[]) => {
    if (!storedToken) {
      handleAuthExpired();
      return "";
    }

    try {
      const created = await createGroupConversation(storedToken, name, memberIds);
      const conversation = conversationFromPayload(created);
      setConversations((previous) => sortConversations(upsertConversation(previous, conversation)));
      openConversation(conversation.id);
      return conversation.id;
    } catch (error) {
      if (handleAuthError(error)) {
        return "";
      }
      addSystemNotice({
        eventType: "group-conversation-create",
        title: "群聊",
        content: error instanceof Error ? error.message : "创建群聊失败",
        level: "error",
      });
      return "";
    }
  };

  const handleUpdateGroupConversation = async (
    conversationId: string,
    patch: {
      name?: string;
      announcement?: string;
      myNickname?: string;
      isMuted?: boolean;
    },
  ): Promise<GroupConversationPayload | null> => {
    if (!storedToken) {
      handleAuthExpired();
      return null;
    }

    try {
      return await updateGroupConversation(storedToken, conversationId, patch);
    } catch (error) {
      if (handleAuthError(error)) {
        return null;
      }
      addSystemNotice({
        eventType: `group-conversation-update-${conversationId}`,
        title: "缇よ亰",
        content: error instanceof Error ? error.message : "淇敼缇よ亰澶辫触",
        level: "error",
      });
      return null;
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
      conversationId: visibleActiveConversation.id,
      messageScope: "group" as const,
      content,
      quote,
    };
  };

  const handleSendText = (content: string, quote?: MessageQuote | null) => {
    return sendTextMessage(buildSendOptions(content, quote));
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
      if (handleAuthError(error)) {
        return false;
      }
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
      if (handleAuthError(error)) {
        return false;
      }
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
      if (handleAuthError(error)) {
        return;
      }
      addSystemNotice({
        eventType: `conversation-settings-${conversationId}`,
        title: "会话",
        content: error instanceof Error ? error.message : "会话设置保存失败",
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
      if (handleAuthError(error)) {
        return;
      }
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
        const fallback = nextConversations.find((item) => item.type !== "system");
        setActiveConversationId(fallback?.id || "");
      }
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }
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
      if (handleAuthError(error)) {
        return;
      }
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
      if (handleAuthError(error)) {
        return;
      }
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

  const openFavorite = (item: FavoriteItem) => {
    openConversation(item.conversationId);
    void (async () => {
      await loadConversationHistory(item.conversationId, 1);
      setFavoriteJumpMessageId(item.messageId);
    })();
  };

  return {
    loadConversationHistory,
    handleMarkConversationRead,
    openConversation,
    handleOpenContactChat,
    handleCreateGroupConversation,
    handleUpdateGroupConversation,
    handleSendText,
    handleSendImage,
    handleCaptureScreen,
    handleUpdateConversationSettings,
    handleClearConversation,
    handleDeleteConversation,
    toggleFavorite,
    handleCopyMessage,
    removeFavorite,
    clearFavorites,
    clearContacts,
    clearLoginCache,
    openFavorite,
  };
}
