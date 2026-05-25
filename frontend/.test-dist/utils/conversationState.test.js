"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const conversationState_1 = require("./conversationState");
(0, node_test_1.default)("applyIncomingConversationMessage increments unread for hidden private message", () => {
    const previous = [
        {
            id: "private:1:2",
            type: "private",
            title: "Peer",
            unreadCount: 1,
        },
    ];
    const latestMessage = {
        avatar: "",
        content: "hello world",
        conversationId: "private:1:2",
        createdAt: "2026-05-23 20:00:00",
        isSelf: false,
        messageScope: "private",
        messageType: "text",
        revoked: false,
        senderId: "u-peer",
        senderName: "Peer",
        targetName: "Self",
        targetUserId: "u-self",
    };
    const next = (0, conversationState_1.applyIncomingConversationMessage)(previous, latestMessage, {
        isConversationVisible: false,
        title: "Peer",
    });
    strict_1.default.equal(next[0]?.unreadCount, 2);
    strict_1.default.equal(next[0]?.lastMessage, "hello world");
});
(0, node_test_1.default)("applyIncomingConversationMessage preserves unread count for self message", () => {
    const previous = [
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
        messageScope: "private",
        messageType: "text",
        revoked: false,
        senderId: "u-self",
        senderName: "Self",
        targetName: "Peer",
        targetUserId: "u-peer",
    };
    const next = (0, conversationState_1.applyIncomingConversationMessage)(previous, latestMessage, {
        isConversationVisible: true,
        title: "Peer",
    });
    strict_1.default.equal(next[0]?.unreadCount, 3);
});
(0, node_test_1.default)("applyIncomingConversationMessage prefixes group previews with sender name", () => {
    const previous = [
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
        messageScope: "group",
        messageType: "text",
        revoked: false,
        senderId: "u-peer",
        senderName: "Alice",
        targetName: undefined,
        targetUserId: undefined,
    };
    const next = (0, conversationState_1.applyIncomingConversationMessage)(previous, latestMessage, {
        isConversationVisible: false,
        title: "Group",
    });
    strict_1.default.equal(next[0]?.lastMessage, "Alice：meeting at 6");
});
(0, node_test_1.default)("applyIncomingSystemNotice increments unread only when system conversation is hidden", () => {
    const previous = [
        {
            id: "system",
            type: "system",
            title: "系统通知",
            unreadCount: 1,
        },
    ];
    const hidden = (0, conversationState_1.applyIncomingSystemNotice)(previous, { content: "notice", time: "2026-05-23 20:00:00" }, {
        isConversationVisible: false,
    });
    strict_1.default.equal(hidden[0]?.unreadCount, 2);
    const visible = (0, conversationState_1.applyIncomingSystemNotice)(previous, { content: "notice", time: "2026-05-23 20:00:00" }, {
        isConversationVisible: true,
    });
    strict_1.default.equal(visible[0]?.unreadCount, 1);
});
(0, node_test_1.default)("isConversationActivelyVisible requires active chat dock, matching conversation, and visible focus", () => {
    strict_1.default.equal((0, conversationState_1.isConversationActivelyVisible)({
        activeConversationId: "c1",
        activeDock: "chat",
        isWindowVisibleFocused: true,
    }, "c1"), true);
    strict_1.default.equal((0, conversationState_1.isConversationActivelyVisible)({
        activeConversationId: "c2",
        activeDock: "chat",
        isWindowVisibleFocused: true,
    }, "c1"), false);
});
