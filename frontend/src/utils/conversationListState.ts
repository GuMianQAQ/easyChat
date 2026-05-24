import type { Conversation, GroupConversationPayload } from "../types/chat";
import { mergeRemoteConversations, sortConversations, upsertConversation } from "./appHelpers";

export function clearConversationUnread(
  previous: Conversation[],
  conversationId: string,
): Conversation[] {
  return previous.map((conversation) =>
    conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
  );
}

export function reconcileRemoteConversationState(
  previous: Conversation[],
  remote: Conversation[],
): Conversation[] {
  return mergeRemoteConversations(previous, remote);
}

export function applyGroupConversationSummary(
  previous: Conversation[],
  conversationId: string,
  groupConversation: GroupConversationPayload,
): Conversation[] {
  return sortConversations(
    upsertConversation(previous, {
      ...previous.find((conversation) => conversation.id === conversationId),
      id: conversationId,
      type: "group",
      title: groupConversation.name,
      avatar: groupConversation.avatar,
      unreadCount:
        previous.find((conversation) => conversation.id === conversationId)?.unreadCount ?? 0,
      announcement: groupConversation.announcement,
      memberCount: groupConversation.memberCount,
      muted: groupConversation.isMuted,
    }),
  );
}

export function removeConversationLocally(
  previous: Conversation[],
  conversationId: string,
): Conversation[] {
  return previous.filter((conversation) => conversation.id !== conversationId);
}
