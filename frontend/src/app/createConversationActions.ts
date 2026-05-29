import type { Dispatch, SetStateAction } from "react";
import type {
  AuthDraft,
  ChatMessage,
  ContactItem,
  Conversation,
  CurrentUser,
  DockView,
  GroupConversationPayload,
  FavoriteItem,
  MessageQuote,
  NotificationItem,
} from "../types/chat";
import {
  clearConversationUnread,
  reconcileRemoteConversationState,
  removeConversationLocally,
} from "../utils/conversationListState";
import {
  clearConversationMessages,
  conversationFromPayload,
  createFavorite,
  createGroupConversation,
  createPrivateConversation,
  dismissGroupConversation,
  deleteConversation,
  deleteFavorite,
  fetchConversations,
  fetchMessages,
  leaveGroupConversation,
  markConversationRead,
  updateConversationSettings,
  updateGroupBotEnabled,
  updateGroupConversation,
  uploadImage,
} from "../utils/chatApi";
import {
  DEFAULT_AUTH_DRAFT,
  createBaseContacts,
  sortConversations,
  upsertConversation,
} from "../utils/appHelpers";
import { isAuthExpiredError } from "../utils/apiError";
import { captureDisplayFrame, dataUrlToBlob } from "../utils/media";

type HistoryState = Record<
  string,
  { page: number; hasMore: boolean; loading: boolean; loaded: boolean }
>;

interface CreateConversationActionsOptions {
  storedToken: string;
  currentUser: CurrentUser | null;
  chatState: {
    activeConversationId: string;
    conversations: Conversation[];
    visibleActiveConversation: Conversation;
    historyState: HistoryState;
  };
  chatStateActions: {
    setActiveDock: Dispatch<SetStateAction<DockView>>;
    setActiveConversationId: Dispatch<SetStateAction<string>>;
    setConversations: Dispatch<SetStateAction<Conversation[]>>;
    setHistoryState: Dispatch<SetStateAction<HistoryState>>;
  };
  favoriteState: {
    favoriteItems: FavoriteItem[];
  };
  favoriteActions: {
    setFavoriteItems: Dispatch<SetStateAction<FavoriteItem[]>>;
    setFavoriteJumpMessageId: Dispatch<SetStateAction<string>>;
  };
  localDataActions: {
    setStoredContacts: Dispatch<SetStateAction<ContactItem[]>>;
    setSelectedContactId: Dispatch<SetStateAction<string>>;
    setAuthDraft: Dispatch<SetStateAction<AuthDraft>>;
    removeStoredAuthDraft: () => void;
  };
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
  chatState,
  chatStateActions,
  favoriteState,
  favoriteActions,
  localDataActions,
  handleAuthExpired,
  refreshConversations,
  replaceConversationMessages,
  prependConversationMessages,
  sendTextMessage,
  sendImageMessage,
  addSystemNotice,
}: CreateConversationActionsOptions) {
  const { activeConversationId, conversations, visibleActiveConversation, historyState } = chatState;
  const { setActiveDock, setActiveConversationId, setConversations, setHistoryState } =
    chatStateActions;
  const { favoriteItems } = favoriteState;
  const { setFavoriteItems, setFavoriteJumpMessageId } = favoriteActions;
  const { setStoredContacts, setSelectedContactId, setAuthDraft, removeStoredAuthDraft } =
    localDataActions;
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
    setConversations((previous) => clearConversationUnread(previous, conversationId));

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
    setConversations((previous) => clearConversationUnread(previous, conversationId));
    if (storedToken) {
      void handleMarkConversationRead(conversationId);
    }
  };

  const handleOpenContactChat = async (contact: ContactItem) => {
    if (contact.source === "group") {
      openConversation(contact.id);
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
      avatar?: string;
      name?: string;
      announcement?: string;
      remark?: string;
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

  const handleUpdateGroupBotEnabled = async (
    conversationId: string,
    botEnabled: boolean,
  ): Promise<GroupConversationPayload | null> => {
    if (!storedToken) {
      handleAuthExpired();
      return null;
    }

    try {
      return await updateGroupBotEnabled(storedToken, conversationId, botEnabled);
    } catch (error) {
      if (handleAuthError(error)) {
        return null;
      }
      addSystemNotice({
        eventType: `group-bot-toggle-${conversationId}`,
        title: "群机器人",
        content: error instanceof Error ? error.message : "群机器人设置失败",
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
      const nextConversations = reconcileRemoteConversationState(conversations, remoteItems);
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

  const applyRemovedConversation = (removedConversationId: string, nextConversations: Conversation[]) => {
    setConversations(removeConversationLocally(nextConversations, removedConversationId));
    setFavoriteItems((previous) => previous.filter((item) => item.conversationId !== removedConversationId));
    replaceConversationMessages(removedConversationId, []);
    setHistoryState((previous) => {
      const next = { ...previous };
      delete next[removedConversationId];
      return next;
    });
    if (activeConversationId === removedConversationId) {
      const fallback = nextConversations.find((item) => item.type !== "system");
      setActiveConversationId(fallback?.id || "");
    }
  };

  const handleLeaveGroupConversation = async (conversation: Conversation) => {
    if (!storedToken) {
      handleAuthExpired();
      return false;
    }

    try {
      await leaveGroupConversation(storedToken, conversation.id);
      const remoteItems = (await fetchConversations(storedToken)).map((item) => conversationFromPayload(item));
      const nextConversations = reconcileRemoteConversationState(conversations, remoteItems);
      applyRemovedConversation(conversation.id, nextConversations);
      addSystemNotice({
        eventType: `group-leave-${conversation.id}`,
        title: "群聊",
        content: "你已退出群聊",
        level: "info",
      });
      return true;
    } catch (error) {
      if (handleAuthError(error)) {
        return false;
      }
      addSystemNotice({
        eventType: `group-leave-error-${conversation.id}`,
        title: "群聊",
        content: error instanceof Error ? error.message : "退出群聊失败",
        level: "error",
      });
      return false;
    }
  };

  const handleDismissGroupConversation = async (conversation: Conversation) => {
    if (!storedToken) {
      handleAuthExpired();
      return false;
    }

    try {
      await dismissGroupConversation(storedToken, conversation.id);
      const remoteItems = (await fetchConversations(storedToken)).map((item) => conversationFromPayload(item));
      const nextConversations = reconcileRemoteConversationState(conversations, remoteItems);
      applyRemovedConversation(conversation.id, nextConversations);
      addSystemNotice({
        eventType: `group-dismiss-${conversation.id}`,
        title: "群聊",
        content: "群聊已解散",
        level: "info",
      });
      return true;
    } catch (error) {
      if (handleAuthError(error)) {
        return false;
      }
      addSystemNotice({
        eventType: `group-dismiss-error-${conversation.id}`,
        title: "群聊",
        content: error instanceof Error ? error.message : "解散群聊失败",
        level: "error",
      });
      return false;
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
    handleUpdateGroupBotEnabled,
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
    handleLeaveGroupConversation,
    handleDismissGroupConversation,
  };
}
