import assert from "node:assert/strict";
import test from "node:test";

import { applyIncomingConversationMessage, applyIncomingSystemNotice, isConversationActivelyVisible } from "./conversationState";
import type { ChatMessage, Conversation } from "../types/chat";

test("applyIncomingConversationMessage increments unread for hidden private message", () => {
  const previous: Conversation[] = [
    {
      id: "private:1:2",
      type: "private",
      title: "Peer",
      unreadCount: 1,
    },
  ];
  const latestMessage: Pick<
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
    | "type"
  > = {
    avatar: "",
    content: "hello world",
    conversationId: "private:1:2",
    createdAt: "2026-05-23 20:00:00",
    isSelf: false,
    messageScope: "private",
    messageType: "text",
    type: "chat",
    revoked: false,
    senderId: "u-peer",
    senderName: "Peer",
    targetName: "Self",
    targetUserId: "u-self",
  };

  const next = applyIncomingConversationMessage(previous, latestMessage, {
    isConversationVisible: false,
    title: "Peer",
  });

  assert.equal(next[0]?.unreadCount, 2);
  assert.equal(next[0]?.lastMessage, "hello world");
});

test("applyIncomingConversationMessage preserves unread count for self message", () => {
  const previous: Conversation[] = [
    {
      id: "private:1:2",
      type: "private",
      title: "Peer",
      unreadCount: 3,
    },
  ];
  const latestMessage = {
    avatar: "",
    content: "sent by me",
    conversationId: "private:1:2",
    createdAt: "2026-05-23 20:00:00",
    isSelf: true,
    messageScope: "private" as const,
    messageType: "text" as const,
    type: "chat" as const,
    revoked: false,
    senderId: "u-self",
    senderName: "Self",
    targetName: "Peer",
    targetUserId: "u-peer",
  };

  const next = applyIncomingConversationMessage(previous, latestMessage, {
    isConversationVisible: true,
    title: "Peer",
  });

  assert.equal(next[0]?.unreadCount, 3);
});

test("applyIncomingConversationMessage prefixes group previews with sender name", () => {
  const previous: Conversation[] = [
    {
      id: "group-1",
      type: "group",
      title: "Group",
      unreadCount: 0,
    },
  ];
  const latestMessage = {
    avatar: "",
    content: "meeting at 6",
    conversationId: "group-1",
    createdAt: "2026-05-23 20:00:00",
    isSelf: false,
    messageScope: "group" as const,
    messageType: "text" as const,
    type: "chat" as const,
    revoked: false,
    senderId: "u-peer",
    senderName: "Alice",
    targetName: undefined,
    targetUserId: undefined,
  };

  const next = applyIncomingConversationMessage(previous, latestMessage, {
    isConversationVisible: false,
    title: "Group",
  });

  assert.equal(next[0]?.lastMessage, "Alice：meeting at 6");
});

test("applyIncomingSystemNotice increments unread only when system conversation is hidden", () => {
  const previous: Conversation[] = [
    {
      id: "system",
      type: "system",
      title: "系统通知",
      unreadCount: 1,
    },
  ];

  const hidden = applyIncomingSystemNotice(previous, { content: "notice", time: "2026-05-23 20:00:00" }, {
    isConversationVisible: false,
  });
  assert.equal(hidden[0]?.unreadCount, 2);

  const visible = applyIncomingSystemNotice(previous, { content: "notice", time: "2026-05-23 20:00:00" }, {
    isConversationVisible: true,
  });
  assert.equal(visible[0]?.unreadCount, 1);
});

test("isConversationActivelyVisible requires active chat dock, matching conversation, and visible focus", () => {
  assert.equal(
    isConversationActivelyVisible(
      {
        activeConversationId: "c1",
        activeDock: "chat",
        isWindowVisibleFocused: true,
      },
      "c1",
    ),
    true,
  );
  assert.equal(
    isConversationActivelyVisible(
      {
        activeConversationId: "c2",
        activeDock: "chat",
        isWindowVisibleFocused: true,
      },
      "c1",
    ),
    false,
  );
});
