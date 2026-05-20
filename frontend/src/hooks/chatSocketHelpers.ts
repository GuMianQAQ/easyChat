import type { ChatMessage, MessageQuote, NotificationItem, ServerMessage } from "../types/chat";
import { safeNumber, safeText } from "../utils/safeText";

export function createId(prefix: string, seed: number): string {
  return `${prefix}-${Date.now()}-${seed}`;
}

export function nowLabel(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const seconds = `${date.getSeconds()}`.padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function createNotice(
  eventType: string,
  title: string,
  content: string,
  level: NotificationItem["level"],
  seed: number,
): NotificationItem {
  return {
    id: createId("notice", seed),
    title,
    content,
    level,
    eventType,
    time: nowLabel(),
  };
}

export function normalizeQuote(quote?: MessageQuote | null): MessageQuote | null {
  if (!quote?.id) {
    return null;
  }

  return {
    id: safeText(quote.id),
    username: safeText(quote.username),
    content: safeText(quote.content),
    messageType: quote.messageType === "image" ? "image" : "text",
    time: safeText(quote.time),
  };
}

export function mapIncomingMessage(message: ServerMessage, currentUserId: string, seed: number): ChatMessage {
  const senderId = safeText(message.senderId);
  const revoked = Boolean(message.revoked);

  return {
    id: safeText(message.id) || createId("server", seed),
    conversationId: safeText(message.conversationId),
    messageScope:
      message.messageScope === "private"
        ? "private"
        : message.messageScope === "group"
          ? "group"
        : message.messageScope === "system"
          ? "system"
          : "system",
    type: message.type,
    messageType:
      message.messageType === "image"
        ? "image"
        : message.messageType === "file"
          ? "file"
          : "text",
    senderId,
    senderName: safeText(message.senderName),
    targetUserId: safeText(message.targetUserId),
    targetName: safeText(message.targetName),
    content: safeText(message.content),
    createdAt: safeText(message.createdAt),
    onlineCount: safeNumber(message.onlineCount),
    avatar: safeText(message.avatar),
    isSelf: message.type === "chat" && senderId === currentUserId,
    quote: normalizeQuote(message.quote),
    status: message.type === "chat" ? "sent" : undefined,
    revoked,
  };
}

export function sortMessages(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((left, right) => {
    const timeCompare = left.createdAt.localeCompare(right.createdAt);
    if (timeCompare !== 0) {
      return timeCompare;
    }
    return left.id.localeCompare(right.id);
  });
}

export function mergeMessages(previous: ChatMessage[], next: ChatMessage[]): ChatMessage[] {
  const messageMap = new Map(previous.map((message) => [message.id, message]));
  for (const message of next) {
    const current = messageMap.get(message.id);
    messageMap.set(message.id, current ? { ...current, ...message, status: message.status ?? current.status } : message);
  }
  return sortMessages(Array.from(messageMap.values()));
}
