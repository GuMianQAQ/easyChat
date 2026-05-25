"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const appHelpers_1 = require("./appHelpers");
(0, node_test_1.default)("summarizeConversationPreview falls back to a generic file preview for URL content", () => {
    strict_1.default.equal((0, appHelpers_1.summarizeConversationPreview)("file", "https://cdn.example.com/files/budget.xlsx?download=1"), "[文件]");
});
(0, node_test_1.default)("summarizeMessage uses revoked preview semantics for self and peer", () => {
    const revokedSelf = {
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
    const revokedPeer = { ...revokedSelf, id: "m2", senderId: "u-peer", senderName: "Peer", isSelf: false };
    strict_1.default.equal((0, appHelpers_1.summarizeMessage)(revokedSelf), (0, appHelpers_1.revokedMessagePreview)(true));
    strict_1.default.equal((0, appHelpers_1.summarizeMessage)(revokedPeer), (0, appHelpers_1.revokedMessagePreview)(false));
});
(0, node_test_1.default)("summarizeConversationMessage prefixes group summaries with sender name", () => {
    strict_1.default.equal((0, appHelpers_1.summarizeConversationMessage)({
        content: "meeting at 6",
        isSelf: false,
        messageScope: "group",
        messageType: "text",
        revoked: false,
        senderName: "Alice",
    }), "Alice：meeting at 6");
});
(0, node_test_1.default)("mergeRemoteConversations trusts server unread count and preserves system conversation", () => {
    const previous = [
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
    const remote = [
        {
            id: "private:1:2",
            type: "private",
            title: "Peer",
            unreadCount: 1,
            lastMessageTime: "2026-05-23 11:00:00",
        },
    ];
    const merged = (0, appHelpers_1.mergeRemoteConversations)(previous, remote);
    strict_1.default.equal(merged[0]?.id, "private:1:2");
    strict_1.default.equal(merged[0]?.unreadCount, 1);
    strict_1.default.equal(merged.some((item) => item.id === "system"), true);
});
