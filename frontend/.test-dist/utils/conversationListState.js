"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearConversationUnread = clearConversationUnread;
exports.reconcileRemoteConversationState = reconcileRemoteConversationState;
exports.applyGroupConversationSummary = applyGroupConversationSummary;
exports.removeConversationLocally = removeConversationLocally;
const appHelpers_1 = require("./appHelpers");
function clearConversationUnread(previous, conversationId) {
    return previous.map((conversation) => conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation);
}
function reconcileRemoteConversationState(previous, remote) {
    return (0, appHelpers_1.mergeRemoteConversations)(previous, remote);
}
function applyGroupConversationSummary(previous, conversationId, groupConversation) {
    const current = previous.find((conversation) => conversation.id === conversationId);
    return (0, appHelpers_1.sortConversations)((0, appHelpers_1.upsertConversation)(previous, {
        ...current,
        id: conversationId,
        type: "group",
        title: groupConversation.name,
        avatar: groupConversation.avatar,
        unreadCount: current?.unreadCount ?? 0,
        announcement: groupConversation.announcement,
        memberCount: groupConversation.memberCount,
        muted: groupConversation.isMuted,
    }));
}
function removeConversationLocally(previous, conversationId) {
    return previous.filter((conversation) => conversation.id !== conversationId);
}
