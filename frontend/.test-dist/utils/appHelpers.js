"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PRIVACY = exports.DEFAULT_SETTINGS = exports.DEFAULT_AUTH_DRAFT = exports.emptyRegisterForm = exports.USERNAME_PATTERN = exports.DEFAULT_ROOM_NAME = void 0;
exports.sanitizeAuthDraft = sanitizeAuthDraft;
exports.quoteFromMessage = quoteFromMessage;
exports.revokedMessagePreview = revokedMessagePreview;
exports.summarizeConversationPreview = summarizeConversationPreview;
exports.summarizeMessage = summarizeMessage;
exports.summarizeConversationMessage = summarizeConversationMessage;
exports.summarizeDraftPreview = summarizeDraftPreview;
exports.createBaseContacts = createBaseContacts;
exports.currentUserToProfile = currentUserToProfile;
exports.mapFriendToContact = mapFriendToContact;
exports.mapConversationToContact = mapConversationToContact;
exports.mergeContacts = mergeContacts;
exports.upsertConversation = upsertConversation;
exports.sortConversations = sortConversations;
exports.resolveConversationView = resolveConversationView;
exports.mergeRemoteConversations = mergeRemoteConversations;
exports.DEFAULT_ROOM_NAME = "系统通知";
exports.USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
const emptyRegisterForm = () => ({
    username: "",
    password: "",
    confirmPassword: "",
    nickname: "",
    avatar: "",
    captchaId: "",
    captchaCode: "",
    captchaImage: "",
});
exports.emptyRegisterForm = emptyRegisterForm;
exports.DEFAULT_AUTH_DRAFT = {
    mode: "login",
    login: {
        username: "",
        password: "",
    },
    register: (0, exports.emptyRegisterForm)(),
};
exports.DEFAULT_SETTINGS = {
    theme: "system",
    rememberProfile: true,
    clearAfterSend: true,
    enterToSend: true,
};
exports.DEFAULT_PRIVACY = {
    allowSearch: true,
    allowFriendRequest: true,
    requireFriendVerify: true,
};
function sanitizeAuthDraft(draft) {
    return {
        mode: draft.mode,
        login: {
            username: draft.login.username.trim(),
            password: "",
        },
        register: {
            ...draft.register,
            username: draft.register.username.trim(),
            password: "",
            confirmPassword: "",
            captchaCode: "",
        },
    };
}
function quoteFromMessage(message) {
    return {
        id: message.id,
        username: message.senderName,
        content: message.content,
        messageType: message.messageType,
        time: message.createdAt,
    };
}
function revokedMessagePreview(isSelf) {
    return isSelf ? "你撤回了一条消息" : "对方撤回了一条消息";
}
function normalizePreviewText(value) {
    const trimmed = value.trim();
    if (!trimmed) {
        return "";
    }
    if (trimmed === "undefined" || trimmed === "null" || trimmed === "[object Object]") {
        return "";
    }
    if (/^(https?:\/\/|data:)/i.test(trimmed)) {
        return "";
    }
    if (/^\s*[\[{].*[\]}]\s*$/s.test(trimmed)) {
        return "";
    }
    return trimmed.replace(/\s+/g, " ");
}
function shortenPreviewText(value, maxLength = 40) {
    const normalized = normalizePreviewText(value);
    if (!normalized) {
        return "";
    }
    return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}
function extractFileName(value) {
    const normalized = normalizePreviewText(value);
    if (!normalized) {
        return "";
    }
    const lastSlash = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
    const tail = lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
    return decodeURIComponent(tail.split("?")[0].split("#")[0]);
}
function summarizeConversationPreview(messageType, content) {
    if (messageType === "image") {
        return "[图片]";
    }
    if (messageType === "file") {
        const fileName = extractFileName(content);
        return fileName ? `[文件] ${fileName}` : "[文件]";
    }
    const text = normalizePreviewText(content);
    return text || "[消息]";
}
function summarizeMessage(message) {
    if (!message) {
        return "";
    }
    if (message.revoked) {
        return revokedMessagePreview(message.isSelf);
    }
    return summarizeConversationPreview(message.messageType, message.content);
}
function summarizeConversationMessage(message) {
    if (!message) {
        return "";
    }
    const summary = message.revoked
        ? revokedMessagePreview(message.isSelf)
        : summarizeConversationPreview(message.messageType, message.content);
    if (message.messageScope === "group") {
        return `${message.senderName}：${summary}`;
    }
    return summary;
}
function summarizeDraftPreview(content) {
    const text = shortenPreviewText(content);
    return text ? `[草稿] ${text}` : "[草稿]";
}
function createBaseContacts(user) {
    return [
        {
            id: user.id,
            name: user.nickname,
            avatar: user.avatar,
            username: user.username,
            permission: "chat",
            source: "self",
            lastSeenAt: "当前在线",
            gender: user.gender,
            region: user.region,
            signature: user.signature,
        },
        {
            id: "system-assistant",
            name: "系统助手",
            permission: "limited",
            source: "system",
            lastSeenAt: "本地通知",
            avatar: "",
        },
    ];
}
function currentUserToProfile(user) {
    return {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        gender: user.gender,
        region: user.region,
        signature: user.signature,
        momentCover: user.momentCover,
        isSelf: true,
        isFriend: true,
        requestStatus: "accepted",
        allowFriendRequest: false,
    };
}
function mapFriendToContact(friend) {
    return {
        id: friend.friendId,
        friendId: friend.friendId,
        username: friend.username,
        name: friend.nickname,
        avatar: friend.avatar,
        gender: friend.gender,
        region: friend.region,
        signature: friend.signature,
        remark: friend.remark,
        tags: Array.isArray(friend.tags) ? friend.tags : [],
        phone: friend.phone,
        description: friend.description,
        descriptionImages: Array.isArray(friend.descriptionImages) ? friend.descriptionImages : [],
        isStarred: friend.isStarred,
        isBlocked: friend.isBlocked,
        blockedAt: friend.blockedAt,
        blockedByPeer: friend.blockedByPeer,
        permission: friend.permission,
        lastSeenAt: friend.createdAt,
        addedAt: friend.createdAt,
        source: "manual",
    };
}
function mapConversationToContact(conversation) {
    if (conversation.type !== "group") {
        return null;
    }
    return {
        id: conversation.id,
        name: conversation.title,
        avatar: conversation.avatar || "",
        permission: "chat",
        source: "group",
        lastSeenAt: conversation.lastMessageTime,
        addedAt: conversation.lastMessageTime,
    };
}
function mergeContacts(previous, next) {
    const existing = new Map(previous.map((item) => [item.id, item]));
    return next.map((item) => {
        const cached = existing.get(item.id);
        if (!cached) {
            return item;
        }
        return {
            ...item,
            remark: cached.remark ?? item.remark,
            tags: Array.isArray(cached.tags) ? cached.tags : Array.isArray(item.tags) ? item.tags : [],
            phone: cached.phone ?? item.phone,
            description: cached.description ?? item.description,
            descriptionImages: Array.isArray(cached.descriptionImages)
                ? cached.descriptionImages
                : Array.isArray(item.descriptionImages)
                    ? item.descriptionImages
                    : [],
            isStarred: cached.isStarred ?? item.isStarred,
            permission: cached.permission ?? item.permission,
        };
    });
}
function upsertConversation(previous, nextConversation) {
    const index = previous.findIndex((item) => item.id === nextConversation.id);
    if (index === -1) {
        return [...previous, nextConversation];
    }
    const updated = [...previous];
    updated[index] = { ...updated[index], ...nextConversation };
    return updated;
}
function sortConversations(conversations) {
    return [...conversations].sort((left, right) => {
        if (left.pinned !== right.pinned) {
            return left.pinned ? -1 : 1;
        }
        const leftTime = left.lastMessageTime || "";
        const rightTime = right.lastMessageTime || "";
        return rightTime.localeCompare(leftTime);
    });
}
function resolveConversationView(conversation, friendsById) {
    if (conversation.type !== "private" || !conversation.targetUserId) {
        return conversation;
    }
    const friend = friendsById.get(conversation.targetUserId);
    if (!friend) {
        return conversation;
    }
    const displayName = friend.remark || friend.nickname;
    return {
        ...conversation,
        title: displayName,
        avatar: friend.avatar || conversation.avatar || "",
        targetNickname: friend.nickname,
        targetAvatar: friend.avatar || conversation.targetAvatar || "",
        targetName: displayName,
    };
}
function mergeRemoteConversations(previous, remote) {
    const local = new Map(previous.map((conversation) => [conversation.id, conversation]));
    const systemConversation = local.get("system") ||
        {
            id: "system",
            type: "system",
            title: "系统通知",
            unreadCount: 0,
        };
    const merged = remote.map((conversation) => ({
        ...conversation,
        unreadCount: conversation.unreadCount,
    }));
    if (!merged.find((conversation) => conversation.id === "system")) {
        merged.push(systemConversation);
    }
    return sortConversations(merged);
}
