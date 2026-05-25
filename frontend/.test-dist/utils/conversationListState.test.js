"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const conversationListState_1 = require("./conversationListState");
(0, node_test_1.default)("clearConversationUnread only clears the targeted conversation", () => {
    const previous = [
        { id: "c1", type: "private", title: "A", unreadCount: 3 },
        { id: "c2", type: "group", title: "B", unreadCount: 1 },
    ];
    const next = (0, conversationListState_1.clearConversationUnread)(previous, "c1");
    strict_1.default.equal(next[0]?.unreadCount, 0);
    strict_1.default.equal(next[1]?.unreadCount, 1);
});
(0, node_test_1.default)("reconcileRemoteConversationState applies refreshed server summary and unread baseline", () => {
    const previous = [
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
    const remote = [
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
    const next = (0, conversationListState_1.reconcileRemoteConversationState)(previous, remote);
    strict_1.default.equal(next[0]?.title, "Remote Title");
    strict_1.default.equal(next[0]?.lastMessage, "server summary");
    strict_1.default.equal(next[0]?.lastMessageTime, "2026-05-23 11:00:00");
    strict_1.default.equal(next[0]?.unreadCount, 1);
    strict_1.default.equal(next[0]?.pinned, false);
});
(0, node_test_1.default)("applyGroupConversationSummary updates group shell fields without dropping unread state", () => {
    const previous = [
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
    const groupConversation = {
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
    const next = (0, conversationListState_1.applyGroupConversationSummary)(previous, "g1", groupConversation);
    strict_1.default.equal(next[0]?.title, "After");
    strict_1.default.equal(next[0]?.avatar, "avatar.png");
    strict_1.default.equal(next[0]?.announcement, "new notice");
    strict_1.default.equal(next[0]?.memberCount, 6);
    strict_1.default.equal(next[0]?.muted, true);
    strict_1.default.equal(next[0]?.unreadCount, 2);
});
(0, node_test_1.default)("removeConversationLocally removes only the requested conversation", () => {
    const previous = [
        { id: "c1", type: "private", title: "A", unreadCount: 0 },
        { id: "c2", type: "group", title: "B", unreadCount: 0 },
    ];
    const next = (0, conversationListState_1.removeConversationLocally)(previous, "c1");
    strict_1.default.deepEqual(next.map((conversation) => conversation.id), ["c2"]);
});
