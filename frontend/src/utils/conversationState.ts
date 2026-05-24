import type { ChatMessage, Conversation, DockView } from "../types/chat";
import { sortConversations, summarizeConversationMessage, upsertConversation } from "./appHelpers";

interface ActiveConversationState {
  activeConversationId: string;
  activeDock: DockView;
  isWindowVisibleFocused: boolean;
}

export function isConversationActivelyVisible(
  state: ActiveConversationState,
  conversationId: string,
): boolean {
  return (
    state.isWindowVisibleFocused &&
    state.activeDock === "chat" &&
    state.activeConversationId === conversationId
  );
}

export function shouldIncrementUnreadCount(options: {
  isSelf: boolean;
  isConversationVisible: boolean;
}): boolean {
  return !options.isSelf && !options.isConversationVisible;
}

export function applyIncomingConversationMessage(
  previous: Conversation[],
  latestMessage: Pick<
    ChatMessage,
    | "avatar"
    | "content"
    | "conversationId"
    | "createdAt"
    | "isSelf"
    | "messageScope"
    | "messageType"
    | "revoked"
    | "senderId"
    | "senderName"
    | "targetName"
    | "targetUserId"
  >,
  options: {
    isConversationVisible: boolean;
    title: string;
  },
): Conversation[] {
  const isPrivate = latestMessage.messageScope === "private";
  const isGroup = latestMessage.messageScope === "group";
  const current =
    previous.find((conversation) => conversation.id === latestMessage.conversationId) ||
    ({
      id: latestMessage.conversationId,
      type: isPrivate ? "private" : isGroup ? "group" : "system",
      title: options.title,
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

  const nextUnreadCount = shouldIncrementUnreadCount({
    isSelf: latestMessage.isSelf,
    isConversationVisible: options.isConversationVisible,
  })
    ? current.unreadCount + 1
    : current.unreadCount;

  const next: Conversation = {
    ...current,
    title: options.title,
    avatar: isPrivate
      ? latestMessage.isSelf
        ? current.avatar || current.targetAvatar || ""
        : latestMessage.avatar || current.avatar || ""
      : current.avatar || "",
    lastMessage: summarizeConversationMessage(latestMessage),
    lastMessageTime: latestMessage.createdAt,
    unreadCount: nextUnreadCount,
    targetUserId: current.targetUserId,
    targetUsername: current.targetUsername,
    targetNickname: current.targetNickname,
    targetAvatar: current.targetAvatar,
    targetName: current.targetName,
  };

  return sortConversations(upsertConversation(previous, next));
}

export function applyIncomingSystemNotice(
  previous: Conversation[],
  notice: { content: string; time: string },
  options: { isConversationVisible: boolean },
): Conversation[] {
  const current =
    previous.find((conversation) => conversation.id === "system") ||
    ({ id: "system", type: "system", title: "系统通知", unreadCount: 0 } satisfies Conversation);

  return sortConversations(
    upsertConversation(previous, {
      ...current,
      lastMessage: notice.content,
      lastMessageTime: notice.time,
      unreadCount: options.isConversationVisible ? current.unreadCount : current.unreadCount + 1,
    }),
  );
}
