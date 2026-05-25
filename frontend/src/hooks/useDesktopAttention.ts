import { useCallback, useEffect, useMemo, useRef } from "react";

import type { Conversation, DockView, FriendItem } from "../types/chat";
import { summarizeConversationPreview } from "../utils/appHelpers";
import {
  deleteDesktopAttentionPreview,
  latestDesktopAttentionPreview,
  nextDesktopAttentionCount,
  upsertDesktopAttentionPreview,
  type DesktopAttentionPreview,
} from "../utils/desktopAttention";

function buildAttentionPreviewSummary(message: {
  messageType: string;
  content: string;
}) {
  const summary = summarizeConversationPreview(message.messageType, message.content);
  if (summary === "[图片]" || summary === "[文件]") {
    return summary;
  }
  return summary.length > 30 ? `${summary.slice(0, 30)}...` : summary;
}

function resolveFriendDisplayName(friend?: FriendItem, fallback?: string) {
  return (
    friend?.remark?.trim() ||
    friend?.nickname?.trim() ||
    friend?.username?.trim() ||
    fallback ||
    "好友消息"
  );
}

function buildDesktopAttentionPreview(options: {
  message: {
    conversationId: string;
    messageScope: "private" | "group" | "system";
    senderId: string;
    senderName: string;
    avatar: string;
    isSelf: boolean;
    targetUserId?: string;
    targetName?: string;
    messageType: string;
    content: string;
  };
  conversationById: Map<string, Conversation>;
  friendByUserId: Map<string, FriendItem>;
  count: number;
}) {
  const { message, conversationById, friendByUserId, count } = options;
  const summary = buildAttentionPreviewSummary(message);
  const conversation = conversationById.get(message.conversationId);

  if (message.messageScope === "group") {
    const senderFriend = friendByUserId.get(message.senderId);
    const senderDisplayName = resolveFriendDisplayName(senderFriend, message.senderName);
    return {
      title: conversation?.title || "群聊",
      content: `${senderDisplayName}：${summary}`,
      count,
      avatar: conversation?.avatar || "",
      conversationId: message.conversationId,
      messageScope: "group" as const,
    };
  }

  if (message.messageScope === "private") {
    const counterpartUserId = message.isSelf ? message.targetUserId : message.senderId;
    const counterpartFriend = counterpartUserId ? friendByUserId.get(counterpartUserId) : undefined;
    const title = resolveFriendDisplayName(
      counterpartFriend,
      message.isSelf ? message.targetName : message.senderName,
    );

    return {
      title,
      content: summary,
      count,
      avatar:
        counterpartFriend?.avatar ||
        (!message.isSelf ? message.avatar : "") ||
        conversation?.targetAvatar ||
        conversation?.avatar ||
        "",
      conversationId: message.conversationId,
      messageScope: "private" as const,
    };
  }

  return {
    title: "系统通知",
    content: summary,
    count,
    avatar: "",
    conversationId: message.conversationId,
    messageScope: "system" as const,
  };
}

interface UseDesktopAttentionOptions {
  activeConversationId: string;
  activeDock: DockView;
  conversations: Conversation[];
  enabled: boolean;
  friends: FriendItem[];
  onAttentionOpenConversation: (payload: {
    conversationId: string;
    activeDock: DockView;
  }) => void;
}

interface IncomingDesktopAttentionMessage {
  conversationId: string;
  messageScope: "private" | "group" | "system";
  senderId: string;
  senderName: string;
  avatar: string;
  isSelf: boolean;
  targetUserId?: string;
  targetName?: string;
  messageType: string;
  content: string;
}

export function useDesktopAttention({
  activeConversationId,
  activeDock,
  conversations,
  enabled,
  friends,
  onAttentionOpenConversation,
}: UseDesktopAttentionOptions) {
  const conversationById = useMemo(
    () => new Map(conversations.map((conversation) => [conversation.id, conversation])),
    [conversations],
  );
  const friendByUserId = useMemo(() => {
    const map = new Map<string, FriendItem>();
    for (const friend of friends) {
      map.set(friend.friendId, friend);
      map.set(friend.id, friend);
    }
    return map;
  }, [friends]);
  const activeDockRef = useRef(activeDock);
  const activeConversationRef = useRef(activeConversationId);
  const attentionRef = useRef<Set<string>>(new Set());
  const unreadRef = useRef<Map<string, number>>(new Map());
  const previewRef = useRef<Map<string, DesktopAttentionPreview>>(new Map());

  useEffect(() => {
    activeDockRef.current = activeDock;
  }, [activeDock]);

  useEffect(() => {
    activeConversationRef.current = activeConversationId;
  }, [activeConversationId]);

  const clearConversationAttention = useCallback(
    async (conversationId: string) => {
      if (!enabled || !conversationId || !attentionRef.current.has(conversationId)) {
        return;
      }

      try {
        const state = await window.myChatWindow?.getVisibilityState?.();
        if (!state || !state.isVisible || !state.isFocused || state.isMinimized) {
          return;
        }

        attentionRef.current.delete(conversationId);
        unreadRef.current.delete(conversationId);
        previewRef.current = deleteDesktopAttentionPreview(previewRef.current, conversationId);
        const result = await window.myChatWindow?.clearAttentionConversation?.(conversationId);

        const latestPreview = latestDesktopAttentionPreview(previewRef.current);
        if (latestPreview) {
          void window.myChatWindow?.updateAttentionPreview?.(latestPreview);
        } else if (!result || result.remaining <= 0) {
          void window.myChatWindow?.stopAttention?.();
        }
      } catch {
        // Ignore runtime visibility probe failures.
      }
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const clearActiveConversationAttention = () => {
      void clearConversationAttention(activeConversationRef.current);
    };

    window.addEventListener("focus", clearActiveConversationAttention);
    window.addEventListener("pointerdown", clearActiveConversationAttention);
    return () => {
      window.removeEventListener("focus", clearActiveConversationAttention);
      window.removeEventListener("pointerdown", clearActiveConversationAttention);
    };
  }, [clearConversationAttention, enabled]);

  useEffect(() => {
    if (!enabled || !window.myChatWindow?.onAttentionOpenConversation) {
      return;
    }

    return window.myChatWindow.onAttentionOpenConversation(onAttentionOpenConversation);
  }, [enabled, onAttentionOpenConversation]);

  useEffect(() => {
    if (!enabled || activeDock !== "chat" || !activeConversationId) {
      return;
    }
    void clearConversationAttention(activeConversationId);
  }, [activeConversationId, activeDock, clearConversationAttention, enabled]);

  const syncIncomingAttention = useCallback(
    async (
      message: IncomingDesktopAttentionMessage,
      options: {
        browserVisibleAndFocused: boolean;
        isCurrentConversationOpen: boolean;
      },
    ) => {
      if (!enabled || message.isSelf) {
        return;
      }

      let desktopVisibleAndFocused = options.browserVisibleAndFocused;
      if (window.myChatWindow?.getVisibilityState) {
        try {
          const state = await window.myChatWindow.getVisibilityState();
          desktopVisibleAndFocused = state.isVisible && state.isFocused && !state.isMinimized;
        } catch {
          desktopVisibleAndFocused = options.browserVisibleAndFocused;
        }
      }

      const shouldStartDesktopAttention =
        !desktopVisibleAndFocused || !options.isCurrentConversationOpen;

      if (shouldStartDesktopAttention) {
        const nextUnread = nextDesktopAttentionCount(unreadRef.current, message.conversationId);
        unreadRef.current.set(message.conversationId, nextUnread);
        const preview = buildDesktopAttentionPreview({
          message,
          conversationById,
          friendByUserId,
          count: nextUnread,
        });
        previewRef.current = upsertDesktopAttentionPreview(previewRef.current, preview);
        attentionRef.current.add(message.conversationId);
        void window.myChatWindow?.updateAttentionPreview?.(preview);
        void window.myChatWindow?.startAttention?.(message.conversationId);
        return;
      }

      await clearConversationAttention(message.conversationId);
    },
    [clearConversationAttention, conversationById, enabled, friendByUserId],
  );

  return {
    syncIncomingAttention,
  };
}
