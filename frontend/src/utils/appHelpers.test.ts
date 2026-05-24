import assert from "node:assert/strict";
import test from "node:test";

import {
  mergeRemoteConversations,
  revokedMessagePreview,
  summarizeConversationMessage,
  summarizeConversationPreview,
  summarizeMessage,
} from "./appHelpers";
import type { ChatMessage, Conversation } from "../types/chat";

test("summarizeConversationPreview falls back to a generic file preview for URL content", () => {
  assert.equal(
    summarizeConversationPreview("file", "https://cdn.example.com/files/budget.xlsx?download=1"),
    "[文件]",
  );
});

test("summarizeMessage uses revoked preview semantics for self and peer", () => {
  const revokedSelf: ChatMessage = {
    id: "m1",
    conversationId: "c1",
    messageScope: "private",
    type: "chat",
    messageType: "text",
    senderId: "u-self",
    senderName: "Self",
    content: "hidden",
    createdAt: "2026-05-23 20:00:00",
    onlineCount: 0,
    avatar: "",
    isSelf: true,
    revoked: true,
  };
  const revokedPeer: ChatMessage = { ...revokedSelf, id: "m2", senderId: "u-peer", senderName: "Peer", isSelf: false };

  assert.equal(summarizeMessage(revokedSelf), revokedMessagePreview(true));
  assert.equal(summarizeMessage(revokedPeer), revokedMessagePreview(false));
});

test("summarizeConversationMessage prefixes group summaries with sender name", () => {
  assert.equal(
    summarizeConversationMessage({
      content: "meeting at 6",
      isSelf: false,
      messageScope: "group",
      messageType: "text",
      revoked: false,
      senderName: "Alice",
    }),
    "Alice：meeting at 6",
  );
});

test("mergeRemoteConversations trusts server unread count and preserves system conversation", () => {
  const previous: Conversation[] = [
    {
      id: "private:1:2",
      type: "private",
      title: "Peer",
      unreadCount: 8,
      lastMessageTime: "2026-05-23 10:00:00",
    },
    {
      id: "system",
      type: "system",
      title: "绯荤粺閫氱煡",
      unreadCount: 3,
    },
  ];
  const remote: Conversation[] = [
    {
      id: "private:1:2",
      type: "private",
      title: "Peer",
      unreadCount: 1,
      lastMessageTime: "2026-05-23 11:00:00",
    },
  ];

  const merged = mergeRemoteConversations(previous, remote);

  assert.equal(merged[0]?.id, "private:1:2");
  assert.equal(merged[0]?.unreadCount, 1);
  assert.equal(merged.some((item) => item.id === "system"), true);
});
