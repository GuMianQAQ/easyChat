import type { Dispatch, SetStateAction } from "react";
import type {
  ContactItem,
  ContactPermission,
  Conversation,
  FriendItem,
  FriendRequestItem,
  PrivacySettings,
  UserProfile,
} from "../types/chat";
import {
  acceptFriendRequest,
  blockFriend,
  deleteFriend,
  fetchBlockedFriends,
  fetchFriendRequests,
  fetchFriends,
  fetchPrivacySettings,
  fetchUserProfile,
  rejectFriendRequest,
  searchUserByUsername,
  sendFriendRequest,
  unblockFriend,
  updateFriend,
  updatePrivacySettings,
} from "../utils/friendsApi";
import { isAuthExpiredError } from "../utils/apiError";
import { conversationFromPayload, createPrivateConversation } from "../utils/chatApi";
import { sortConversations, upsertConversation } from "../utils/appHelpers";

interface CreateSocialActionsOptions {
  storedToken: string;
  friends: FriendItem[];
  friendSearchResult: UserProfile | null;
  setFriends: Dispatch<SetStateAction<FriendItem[]>>;
  setBlockedFriends: Dispatch<SetStateAction<FriendItem[]>>;
  setFriendRequests: Dispatch<SetStateAction<FriendRequestItem[]>>;
  setPrivacySettings: Dispatch<SetStateAction<PrivacySettings>>;
  setStoredContacts: Dispatch<SetStateAction<ContactItem[]>>;
  setSelectedContactId: Dispatch<SetStateAction<string>>;
  setFriendSearchResult: Dispatch<SetStateAction<UserProfile | null>>;
  setFriendSearchError: Dispatch<SetStateAction<string>>;
  setFriendSearching: Dispatch<SetStateAction<boolean>>;
  setFriendSubmitting: Dispatch<SetStateAction<boolean>>;
  setProfileCard: Dispatch<SetStateAction<{ profile: UserProfile; x: number; y: number } | null>>;
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
  handleAuthExpired: () => void;
  addSystemNotice: (options: { eventType: string; title: string; content: string; level?: "info" | "success" | "warning" | "error" }) => void;
  refreshConversations: (token: string) => Promise<void>;
}

export function createSocialActions(options: CreateSocialActionsOptions) {
  const {
    storedToken,
    friends,
    friendSearchResult,
    setFriends,
    setBlockedFriends,
    setFriendRequests,
    setPrivacySettings,
    setStoredContacts,
    setSelectedContactId,
    setFriendSearchResult,
    setFriendSearchError,
    setFriendSearching,
    setFriendSubmitting,
    setProfileCard,
    setConversations,
    handleAuthExpired,
    addSystemNotice,
    refreshConversations,
  } = options;

  const refreshFriends = async (token: string) => {
    const items = await fetchFriends(token);
    setFriends(items);
  };

  const refreshBlockedFriends = async (token: string) => {
    const items = await fetchBlockedFriends(token);
    setBlockedFriends(items);
  };

  const refreshFriendRequests = async (token: string) => {
    const items = await fetchFriendRequests(token);
    setFriendRequests(items);
  };

  const refreshPrivacy = async (token: string) => {
    const settings = await fetchPrivacySettings(token);
    setPrivacySettings(settings);
  };

  const handleAuthError = (error: unknown) => {
    if (isAuthExpiredError(error)) {
      handleAuthExpired();
      return true;
    }
    return false;
  };
  const updateContact = (contactId: string, patch: Partial<ContactItem>) => {
    setStoredContacts((previous) =>
      previous.map((contact) => (contact.id === contactId ? { ...contact, ...patch } : contact)),
    );
  };

  const handleUpdateContact = (contactId: string, patch: Partial<ContactItem>) => {
    const friend = friends.find((item) => item.friendId === contactId);
    if (friend && storedToken) {
      void (async () => {
        try {
          const updated = await updateFriend(storedToken, contactId, {
            remark: patch.remark ?? friend.remark,
            tags: Array.isArray(patch.tags) ? patch.tags : Array.isArray(friend.tags) ? friend.tags : [],
            phone: patch.phone ?? friend.phone ?? "",
            description: patch.description ?? friend.description ?? "",
            descriptionImages: Array.isArray(patch.descriptionImages)
              ? patch.descriptionImages
              : Array.isArray(friend.descriptionImages)
                ? friend.descriptionImages
                : [],
            isStarred: patch.isStarred ?? friend.isStarred,
            permission: (patch.permission ?? friend.permission) as ContactPermission,
          });
          setFriends((previous) => previous.map((item) => (item.friendId === contactId ? updated : item)));
        } catch (error) {
      if (handleAuthError(error)) {
        return;
      }
      addSystemNotice({
            eventType: `friend-update-${contactId}`,
            title: "联系人",
            content: error instanceof Error ? error.message : "联系人更新失败",
            level: "error",
          });
        }
      })();
      return;
    }

    updateContact(contactId, patch);
  };

  const handleSetContactPermission = (contactId: string, permission: ContactPermission) => {
    handleUpdateContact(contactId, { permission });
  };

  const handleDeleteFriend = async (friendId: string) => {
    if (!storedToken) {
      handleAuthExpired();
      return;
    }
    if (!window.confirm("删除后将不再显示在通讯录中，但聊天记录不会删除。")) {
      return;
    }
    try {
      await deleteFriend(storedToken, friendId);
      await refreshFriends(storedToken);
      await refreshBlockedFriends(storedToken);
      setSelectedContactId("");
      addSystemNotice({ eventType: `friend-delete-${friendId}`, title: "好友", content: "已删除好友", level: "success" });
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }
      addSystemNotice({
        eventType: `friend-delete-${friendId}`,
        title: "好友",
        content: error instanceof Error ? error.message : "删除好友失败",
        level: "error",
      });
    }
  };

  const handleToggleBlockFriend = async (friendId: string, nextBlocked: boolean) => {
    if (!storedToken) {
      handleAuthExpired();
      return;
    }
    const message = nextBlocked ? "加入黑名单后，对方将不能再给你发送消息。" : "确认将对方移出黑名单吗？";
    if (!window.confirm(message)) {
      return;
    }
    try {
      if (nextBlocked) {
        await blockFriend(storedToken, friendId);
        addSystemNotice({ eventType: `friend-block-${friendId}`, title: "黑名单", content: "已加入黑名单", level: "success" });
      } else {
        await unblockFriend(storedToken, friendId);
        addSystemNotice({ eventType: `friend-unblock-${friendId}`, title: "黑名单", content: "已移出黑名单", level: "success" });
      }
      await refreshFriends(storedToken);
      await refreshBlockedFriends(storedToken);
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }
      addSystemNotice({
        eventType: `friend-block-error-${friendId}`,
        title: "黑名单",
        content: error instanceof Error ? error.message : "操作失败",
        level: "error",
      });
    }
  };

  const handleFriendSearch = async (username: string) => {
    if (!storedToken) {
      handleAuthExpired();
      return;
    }
    const nextUsername = username.trim();
    if (!nextUsername) {
      setFriendSearchResult(null);
      setFriendSearchError("请输入账号");
      return;
    }
    setFriendSearching(true);
    setFriendSearchError("");
    try {
      const result = await searchUserByUsername(storedToken, nextUsername);
      setFriendSearchResult(result);
      if (!result) {
        setFriendSearchError("未找到该用户");
      }
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }
      setFriendSearchResult(null);
      setFriendSearchError(error instanceof Error ? error.message : "搜索失败");
    } finally {
      setFriendSearching(false);
    }
  };

  const handleSendFriendRequest = async (message: string) => {
    if (!storedToken || !friendSearchResult) {
      handleAuthExpired();
      return;
    }
    setFriendSubmitting(true);
    try {
      const result = await sendFriendRequest(storedToken, friendSearchResult.id, message);
      setFriendSearchResult(result.user);
      await refreshFriends(storedToken);
      await refreshFriendRequests(storedToken);
      if (result.status === "accepted") {
        const created = await createPrivateConversation(storedToken, result.user.id);
        const conversation = conversationFromPayload(created);
        setConversations((previous) => sortConversations(upsertConversation(previous, conversation)));
      }
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }
      setFriendSearchError(error instanceof Error ? error.message : "发送失败");
    } finally {
      setFriendSubmitting(false);
    }
  };

  const handleAcceptFriendRequest = async (requestId: string) => {
    if (!storedToken) {
      handleAuthExpired();
      return;
    }
    try {
      const friend = await acceptFriendRequest(storedToken, requestId);
      setFriends((previous) => {
        if (previous.some((item) => item.friendId === friend.friendId)) {
          return previous.map((item) => (item.friendId === friend.friendId ? friend : item));
        }
        return [...previous, friend];
      });
      setFriendRequests((previous) => previous.filter((item) => item.id !== requestId));
      await refreshFriends(storedToken);
      await refreshFriendRequests(storedToken);
      await refreshConversations(storedToken);
      addSystemNotice({
        eventType: `friend-accepted-${friend.friendId}`,
        title: "好友",
        content: "已添加好友",
        level: "success",
      });
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }
      addSystemNotice({
        eventType: `friend-accept-${requestId}`,
        title: "好友申请",
        content: error instanceof Error ? error.message : "处理失败",
        level: "error",
      });
    }
  };

  const handleRejectFriendRequest = async (requestId: string) => {
    if (!storedToken) {
      handleAuthExpired();
      return;
    }
    try {
      await rejectFriendRequest(storedToken, requestId);
      setFriendRequests((previous) => previous.filter((item) => item.id !== requestId));
      await refreshFriendRequests(storedToken);
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }
      addSystemNotice({
        eventType: `friend-reject-${requestId}`,
        title: "好友申请",
        content: error instanceof Error ? error.message : "处理失败",
        level: "error",
      });
    }
  };

  const handlePrivacyChange = async (next: PrivacySettings) => {
    if (!storedToken) {
      handleAuthExpired();
      return;
    }
    try {
      const saved = await updatePrivacySettings(storedToken, next);
      setPrivacySettings(saved);
      addSystemNotice({ eventType: "privacy-updated", title: "隐私", content: "已保存", level: "success" });
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }
      addSystemNotice({
        eventType: "privacy-update-failed",
        title: "隐私",
        content: error instanceof Error ? error.message : "保存失败",
        level: "error",
      });
    }
  };

  const handleOpenProfileCard = async (userId: string, anchor: { x: number; y: number }) => {
    if (!storedToken) {
      handleAuthExpired();
      return;
    }
    try {
      const profile = await fetchUserProfile(storedToken, userId);
      setProfileCard({ profile, x: anchor.x, y: anchor.y });
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }
      addSystemNotice({
        eventType: `profile-${userId}`,
        title: "资料",
        content: error instanceof Error ? error.message : "加载失败",
        level: "error",
      });
    }
  };

  return {
    refreshFriends,
    refreshBlockedFriends,
    refreshFriendRequests,
    refreshPrivacy,
    updateContact,
    handleUpdateContact,
    handleSetContactPermission,
    handleDeleteFriend,
    handleToggleBlockFriend,
    handleFriendSearch,
    handleSendFriendRequest,
    handleAcceptFriendRequest,
    handleRejectFriendRequest,
    handlePrivacyChange,
    handleOpenProfileCard,
  };
}
