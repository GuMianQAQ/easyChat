import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ChatMessage,
  ChatMessageType,
  ClientChatPayload,
  ClientMessagePayload,
  ConnectionStatus,
  CurrentUser,
  MessageQuote,
  NotificationItem,
  ServerMessage,
} from "../types/chat";
import { safeNumber, safeText } from "../utils/safeText";

const defaultRoomName = "公共聊天室";

interface JoinSession {
  token: string;
  user: CurrentUser;
}

interface SendMessageOptions {
  conversationId: string;
  messageScope: "public" | "private";
  targetUserId?: string;
  targetName?: string;
  content: string;
  quote?: MessageQuote | null;
}

interface RevokeOptions {
  messageId: string;
  conversationId: string;
  messageScope: "public" | "private";
  targetUserId?: string;
}

interface NoticeOptions {
  eventType: string;
  title: string;
  content: string;
  level?: NotificationItem["level"];
}

interface UseChatSocketResult {
  status: ConnectionStatus;
  messages: ChatMessage[];
  notifications: NotificationItem[];
  onlineCount: number;
  currentUserId: string;
  currentUsername: string;
  roomName: string;
  join: (session: JoinSession) => void;
  reconnect: () => void;
  updateProfile: (user: CurrentUser) => void;
  replaceConversationMessages: (conversationId: string, items: ServerMessage[]) => void;
  prependConversationMessages: (conversationId: string, items: ServerMessage[]) => void;
  sendTextMessage: (options: SendMessageOptions) => boolean;
  sendImageMessage: (options: SendMessageOptions) => boolean;
  retryMessage: (messageId: string) => void;
  revokeMessage: (options: RevokeOptions) => void;
  removeLocalMessage: (messageId: string) => void;
  disconnect: () => void;
  resetSession: () => void;
  addSystemNotice: (options: NoticeOptions) => void;
}

function createId(prefix: string, seed: number): string {
  return `${prefix}-${Date.now()}-${seed}`;
}

function nowLabel(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const seconds = `${date.getSeconds()}`.padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function createNotice(
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

function normalizeQuote(quote?: MessageQuote | null): MessageQuote | null {
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

function mapIncomingMessage(message: ServerMessage, currentUserId: string, seed: number): ChatMessage {
  const senderId = safeText(message.senderId);
  const revoked = Boolean(message.revoked);

  return {
    id: safeText(message.id) || createId("server", seed),
    conversationId: safeText(message.conversationId),
    messageScope:
      message.messageScope === "private"
        ? "private"
        : message.messageScope === "system"
          ? "system"
          : "public",
    type: message.type,
    messageType: message.messageType === "image" ? "image" : "text",
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

function sortMessages(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((left, right) => {
    const timeCompare = left.createdAt.localeCompare(right.createdAt);
    if (timeCompare !== 0) {
      return timeCompare;
    }
    return left.id.localeCompare(right.id);
  });
}

function mergeMessages(previous: ChatMessage[], next: ChatMessage[]): ChatMessage[] {
  const messageMap = new Map(previous.map((message) => [message.id, message]));
  for (const message of next) {
    const current = messageMap.get(message.id);
    messageMap.set(message.id, current ? { ...current, ...message, status: message.status ?? current.status } : message);
  }
  return sortMessages(Array.from(messageMap.values()));
}

export function useChatSocket(): UseChatSocketResult {
  const socketRef = useRef<WebSocket | null>(null);
  const sessionRef = useRef(0);
  const sequenceRef = useRef(0);
  const lastJoinRef = useRef<JoinSession | null>(null);
  const latestNoticeRef = useRef<{ eventType: string; content: string; time: number } | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [currentAvatar, setCurrentAvatar] = useState("");
  const [roomName, setRoomName] = useState(defaultRoomName);

  const addSystemNotice = useCallback(
    ({ eventType, title, content, level = "info" }: NoticeOptions) => {
      const now = Date.now();
      const latest = latestNoticeRef.current;
      if (latest && latest.eventType === eventType && latest.content === content && now - latest.time < 3000) {
        return;
      }

      latestNoticeRef.current = { eventType, content, time: now };
      setNotifications((previous) => [
        createNotice(eventType, title, content, level, ++sequenceRef.current),
        ...previous,
      ]);
    },
    [],
  );

  const closeSocket = useCallback(() => {
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket) {
      socket.close();
    }
  }, []);

  const disconnect = useCallback(() => {
    sessionRef.current += 1;
    closeSocket();
    setStatus("disconnected");
    setOnlineCount(0);
  }, [addSystemNotice, closeSocket]);

  const resetSession = useCallback(() => {
    sessionRef.current += 1;
    closeSocket();
    setStatus("disconnected");
    setMessages([]);
    setNotifications([]);
    setOnlineCount(0);
    setCurrentUserId("");
    setCurrentUsername("");
    setCurrentAvatar("");
    setRoomName(defaultRoomName);
    lastJoinRef.current = null;
    latestNoticeRef.current = null;
  }, [closeSocket]);

  const upsertServerMessages = useCallback((items: ServerMessage[]) => {
    const userID = currentUserId || lastJoinRef.current?.user.id || "";
    setMessages((previous) =>
      mergeMessages(
        previous,
        items.map((item) => mapIncomingMessage(item, userID, ++sequenceRef.current)),
      ),
    );
  }, [currentUserId]);

  const replaceConversationMessages = useCallback(
    (conversationId: string, items: ServerMessage[]) => {
      const userID = currentUserId || lastJoinRef.current?.user.id || "";
      const mapped = items.map((item) => mapIncomingMessage(item, userID, ++sequenceRef.current));
      setMessages((previous) =>
        mergeMessages(
          previous.filter((message) => message.conversationId !== conversationId),
          mapped,
        ),
      );
    },
    [currentUserId],
  );

  const prependConversationMessages = useCallback(
    (conversationId: string, items: ServerMessage[]) => {
      const userID = currentUserId || lastJoinRef.current?.user.id || "";
      const mapped = items.map((item) => mapIncomingMessage(item, userID, ++sequenceRef.current));
      setMessages((previous) => {
        const current = previous.filter((message) => message.conversationId === conversationId);
        const others = previous.filter((message) => message.conversationId !== conversationId);
        return [...others, ...mergeMessages(current, mapped)];
      });
    },
    [currentUserId],
  );

  const connect = useCallback(
    (session: JoinSession) => {
      const token = session.token.trim();
      if (!token) {
        addSystemNotice({ eventType: "auth-missing-token", title: "登录", content: "登录已过期，请重新登录", level: "error" });
        return;
      }
      if (
        socketRef.current &&
        (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      const nextSession = sessionRef.current + 1;
      sessionRef.current = nextSession;
      lastJoinRef.current = session;

      setCurrentUserId(session.user.id);
      setCurrentUsername(session.user.nickname);
      setCurrentAvatar(session.user.avatar);
      setRoomName(defaultRoomName);
      setStatus("connecting");

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(`${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`);
      socketRef.current = socket;

      socket.onopen = () => {
        if (sessionRef.current !== nextSession || socketRef.current !== socket) {
          socket.close();
          return;
        }
        setStatus("connected");
      };

      socket.onmessage = (event) => {
        if (sessionRef.current !== nextSession || socketRef.current !== socket) {
          return;
        }

        let parsed: ServerMessage;
        try {
          parsed = JSON.parse(event.data) as ServerMessage;
        } catch {
          addSystemNotice({ eventType: "socket-parse-error", title: "消息", content: "消息解析失败", level: "error" });
          return;
        }

        if (!["chat", "system", "users", "error", "revoke"].includes(parsed.type)) {
          return;
        }

        if (parsed.type === "users") {
          setOnlineCount(safeNumber(parsed.onlineCount));
          return;
        }

        if (parsed.type === "revoke") {
          const targetId = safeText((parsed as ServerMessage & { messageId?: string }).messageId || parsed.id);
          const isSelf = safeText(parsed.senderId) === session.user.id;
          setMessages((previous) =>
            previous.map((message) =>
              message.id === targetId
                ? {
                    ...message,
                    messageType: "text",
                    content: isSelf ? "你撤回了一条消息" : "对方撤回了一条消息",
                    revoked: true,
                    status: "sent",
                  }
                : message,
            ),
          );
          return;
        }

        if (parsed.type === "error") {
          addSystemNotice({
            eventType: "socket-error-message",
            title: "通知",
            content: safeText(parsed.content),
            level: "error",
          });
          return;
        }

        upsertServerMessages([parsed]);
        setOnlineCount(safeNumber(parsed.onlineCount));
      };

      socket.onerror = () => {
        if (sessionRef.current !== nextSession) {
          return;
        }
        setStatus("failed");
        addSystemNotice({ eventType: "socket-connect-failed", title: "连接", content: "连接失败", level: "error" });
      };

      socket.onclose = () => {
        if (sessionRef.current !== nextSession) {
          return;
        }
        socketRef.current = null;
        setStatus((current) => (current === "failed" ? "failed" : "disconnected"));
        setOnlineCount(0);
      };
    },
    [addSystemNotice, upsertServerMessages],
  );

  const reconnect = useCallback(() => {
    if (!lastJoinRef.current) {
      addSystemNotice({ eventType: "socket-reconnect-before-login", title: "连接", content: "请先登录", level: "error" });
      return;
    }
    closeSocket();
    connect(lastJoinRef.current);
  }, [addSystemNotice, closeSocket, connect]);

  const updateProfile = useCallback((user: CurrentUser) => {
    setCurrentUserId(user.id);
    setCurrentUsername(user.nickname);
    setCurrentAvatar(user.avatar);
    if (lastJoinRef.current) {
      lastJoinRef.current = { ...lastJoinRef.current, user };
    }
  }, []);

  const sendOptimistic = useCallback(
    (
      messageType: ChatMessageType,
      { conversationId, messageScope, targetUserId = "", targetName = "", content, quote }: SendMessageOptions,
      id?: string,
    ) => {
      const socket = socketRef.current;
      const messageId = id || createId("msg", ++sequenceRef.current);
      const nextQuote = normalizeQuote(quote);

      const optimistic: ChatMessage = {
        id: messageId,
        conversationId,
        messageScope,
        type: "chat",
        messageType,
        senderId: currentUserId,
        senderName: currentUsername,
        targetUserId,
        targetName,
        content,
        createdAt: nowLabel(),
        onlineCount,
        avatar: currentAvatar,
        isSelf: true,
        quote: nextQuote,
        status: "sending",
        revoked: false,
      };

      setMessages((previous) => mergeMessages(previous, [optimistic]));

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        setMessages((previous) =>
          previous.map((message) => (message.id === messageId ? { ...message, status: "failed" } : message)),
        );
        addSystemNotice({ eventType: "socket-send-before-connect", title: "发送", content: "未连接", level: "error" });
        return false;
      }

      const payload: ClientChatPayload = {
        id: messageId,
        conversationId,
        messageScope,
        type: "chat",
        messageType,
        targetUserId,
        targetName,
        content,
        avatar: currentAvatar,
        quote: nextQuote,
      };

      try {
        const wirePayload: ClientMessagePayload = payload;
        socket.send(JSON.stringify(wirePayload));
      } catch {
        setMessages((previous) =>
          previous.map((message) => (message.id === messageId ? { ...message, status: "failed" } : message)),
        );
        addSystemNotice({ eventType: "socket-send-failed", title: "发送", content: "发送失败", level: "error" });
        return false;
      }

      return true;
    },
    [addSystemNotice, currentAvatar, currentUserId, currentUsername, onlineCount],
  );

  const sendTextMessage = useCallback(
    (options: SendMessageOptions) => {
      const trimmed = options.content.trim();
      if (!trimmed) {
        addSystemNotice({ eventType: "message-empty", title: "发送", content: "消息不能为空", level: "error" });
        return false;
      }
      if (trimmed.length > 500) {
        addSystemNotice({ eventType: "message-too-long", title: "发送", content: "消息最多 500 个字符", level: "error" });
        return false;
      }
      return sendOptimistic("text", { ...options, content: trimmed });
    },
    [addSystemNotice, sendOptimistic],
  );

  const sendImageMessage = useCallback(
    (options: SendMessageOptions) => {
      if (!options.content.trim()) {
        addSystemNotice({ eventType: "image-empty", title: "发送", content: "图片不能为空", level: "error" });
        return false;
      }
      return sendOptimistic("image", options);
    },
    [addSystemNotice, sendOptimistic],
  );

  const retryMessage = useCallback(
    (messageId: string) => {
      const message = messages.find((item) => item.id === messageId);
      if (!message || message.type !== "chat" || !message.isSelf) {
        return;
      }
      void sendOptimistic(
        message.messageType,
        {
          conversationId: message.conversationId,
          messageScope: message.messageScope === "private" ? "private" : "public",
          targetUserId: message.targetUserId,
          targetName: message.targetName,
          content: message.content,
          quote: message.quote,
        },
        message.id,
      );
    },
    [messages, sendOptimistic],
  );

  const revokeMessage = useCallback(
    ({ messageId, conversationId, messageScope, targetUserId = "" }: RevokeOptions) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        addSystemNotice({ eventType: "revoke-before-connect", title: "撤回", content: "未连接", level: "error" });
        return;
      }

      try {
        const payload: ClientMessagePayload = {
          id: messageId,
          conversationId,
          messageScope,
          targetUserId,
          type: "revoke",
        };
        socket.send(JSON.stringify(payload));
      } catch {
        addSystemNotice({ eventType: "revoke-failed", title: "撤回", content: "撤回失败", level: "error" });
      }
    },
    [addSystemNotice],
  );

  const removeLocalMessage = useCallback((messageId: string) => {
    setMessages((previous) => previous.filter((message) => message.id !== messageId));
  }, []);

  useEffect(() => {
    return () => {
      closeSocket();
    };
  }, [closeSocket]);

  return {
    status,
    messages,
    notifications,
    onlineCount,
    currentUserId,
    currentUsername,
    roomName,
    join: connect,
    reconnect,
    updateProfile,
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
  };
}
