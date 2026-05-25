"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isConversationActivelyVisible = isConversationActivelyVisible;
exports.shouldIncrementUnreadCount = shouldIncrementUnreadCount;
exports.applyIncomingConversationMessage = applyIncomingConversationMessage;
exports.applyIncomingSystemNotice = applyIncomingSystemNotice;
const appHelpers_1 = require("./appHelpers");
function isConversationActivelyVisible(state, conversationId) {
    return (state.isWindowVisibleFocused &&
        state.activeDock === "chat" &&
        state.activeConversationId === conversationId);
}
function shouldIncrementUnreadCount(options) {
    return !options.isSelf && !options.isConversationVisible;
}
function applyIncomingConversationMessage(previous, latestMessage, options) {
    const isPrivate = latestMessage.messageScope === "private";
    const isGroup = latestMessage.messageScope === "group";
    const current = previous.find((conversation) => conversation.id === latestMessage.conversationId) ||
        {
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
        };
    const nextUnreadCount = shouldIncrementUnreadCount({
        isSelf: latestMessage.isSelf,
        isConversationVisible: options.isConversationVisible,
    })
        ? current.unreadCount + 1
        : current.unreadCount;
    const next = {
        ...current,
        title: options.title,
        avatar: isPrivate
            ? latestMessage.isSelf
                ? current.avatar || current.targetAvatar || ""
                : latestMessage.avatar || current.avatar || ""
            : current.avatar || "",
        lastMessage: (0, appHelpers_1.summarizeConversationMessage)(latestMessage),
        lastMessageTime: latestMessage.createdAt,
        unreadCount: nextUnreadCount,
        targetUserId: current.targetUserId,
        targetUsername: current.targetUsername,
        targetNickname: current.targetNickname,
        targetAvatar: current.targetAvatar,
        targetName: current.targetName,
    };
    return (0, appHelpers_1.sortConversations)((0, appHelpers_1.upsertConversation)(previous, next));
}
function applyIncomingSystemNotice(previous, notice, options) {
    const current = previous.find((conversation) => conversation.id === "system") ||
        { id: "system", type: "system", title: "系统通知", unreadCount: 0 };
    return (0, appHelpers_1.sortConversations)((0, appHelpers_1.upsertConversation)(previous, {
        ...current,
        lastMessage: notice.content,
        lastMessageTime: notice.time,
        unreadCount: options.isConversationVisible ? current.unreadCount : current.unreadCount + 1,
    }));
}
