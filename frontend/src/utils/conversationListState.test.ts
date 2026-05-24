import assert from "node:assert/strict";
import test from "node:test";

import type { Conversation, GroupConversationPayload } from "../types/chat";
import {
  applyGroupConversationSummary,
  clearConversationUnread,
  reconcileRemoteConversationState,
  removeConversationLocally,
} from "./conversationListState";

test("clearConversationUnread only clears the targeted conversation", () => {
  const previous: Conversation[] = [
    { id: "c1", type: "private", title: "A", unreadCount: 3 },
    { id: "c2", type: "group", title: "B", unreadCount: 1 },
  ];

  const next = clearConversationUnread(previous, "c1");

  assert.equal(next[0]?.unreadCount, 0);
  assert.equal(next[1]?.unreadCount, 1);
});

test("reconcileRemoteConversationState applies refreshed server summary and unread baseline", () => {
  const previous: Conversation[] = [
    {
      id: "c1",
      type: "private",
      title: "Old",
      lastMessage: "draft local",
      lastMessageTime: "2026-05-23 10:00:00",
      unreadCount: 4,
      pinned: true,
    },
  ];
  const remote: Conversation[] = [
    {
      id: "c1",
      type: "private",
      title: "Remote Title",
      lastMessage: "server summary",
      lastMessageTime: "2026-05-23 11:00:00",
      unreadCount: 1,
      pinned: false,
    },
  ];

  const next = reconcileRemoteConversationState(previous, remote);

  assert.equal(next[0]?.title, "Remote Title");
  assert.equal(next[0]?.lastMessage, "server summary");
  assert.equal(next[0]?.lastMessageTime, "2026-05-23 11:00:00");
  assert.equal(next[0]?.unreadCount, 1);
  assert.equal(next[0]?.pinned, false);
});

test("applyGroupConversationSummary updates group shell fields without dropping unread state", () => {
  const previous: Conversation[] = [
    {
      id: "g1",
      type: "group",
      title: "Before",
      unreadCount: 2,
      avatar: "",
      announcement: "",
      memberCount: 3,
      muted: false,
    },
  ];
  const groupConversation: GroupConversationPayload = {
    id: "g1",
    type: "group",
    name: "After",
    avatar: "avatar.png",
    announcement: "new notice",
    myNickname: "",
    myRole: "owner",
    canEditGroupProfile: true,
    isMuted: true,
    memberCount: 6,
    members: [],
    remark: "",
  };

  const next = applyGroupConversationSummary(previous, "g1", groupConversation);

  assert.equal(next[0]?.title, "After");
  assert.equal(next[0]?.avatar, "avatar.png");
  assert.equal(next[0]?.announcement, "new notice");
  assert.equal(next[0]?.memberCount, 6);
  assert.equal(next[0]?.muted, true);
  assert.equal(next[0]?.unreadCount, 2);
});

test("removeConversationLocally removes only the requested conversation", () => {
  const previous: Conversation[] = [
    { id: "c1", type: "private", title: "A", unreadCount: 0 },
    { id: "c2", type: "group", title: "B", unreadCount: 0 },
  ];

  const next = removeConversationLocally(previous, "c1");

  assert.deepEqual(next.map((conversation) => conversation.id), ["c2"]);
});
