import type { Dispatch, SetStateAction } from "react";
import type {
  AuthDraft,
  CurrentUser,
  PrivacySettings,
  UserSettings,
  ContactItem,
  FavoriteItem,
  Conversation,
  FileRecord,
} from "../types/chat";
import { changePassword, fetchCaptcha, login, register, updateProfile } from "../utils/auth";
import { isApiError, isAuthExpiredError } from "../utils/apiError";
import { prepareAvatarDataUrl } from "../utils/media";
import {
  createBaseContacts,
  DEFAULT_PRIVACY,
  emptyRegisterForm,
  mergeContacts,
  USERNAME_PATTERN,
} from "../utils/appHelpers";

interface CreateAuthActionsOptions {
  authDraft: AuthDraft;
  storedSettings: UserSettings;
  currentUser: CurrentUser | null;
  storedToken: string;
  setAuthDraft: Dispatch<SetStateAction<AuthDraft>>;
  setAuthPending: Dispatch<SetStateAction<boolean>>;
  setLoginError: Dispatch<SetStateAction<string>>;
  setRegisterError: Dispatch<SetStateAction<string>>;
  setCurrentUser: Dispatch<SetStateAction<CurrentUser | null>>;
  setStoredToken: (value: string) => void;
  setStoredContacts: Dispatch<SetStateAction<ContactItem[]>>;
  setHistoryState: Dispatch<SetStateAction<Record<string, { page: number; hasMore: boolean; loading: boolean; loaded: boolean }>>>;
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
  setFavoriteItems: Dispatch<SetStateAction<FavoriteItem[]>>;
  setSelectedFiles: Dispatch<SetStateAction<FileRecord[]>>;
  setActiveDock: Dispatch<SetStateAction<"chat" | "contacts" | "favorites" | "files" | "settings">>;
  setActiveConversationId: Dispatch<SetStateAction<string>>;
  setSelectedContactId: Dispatch<SetStateAction<string>>;
  setFavoriteKeyword: Dispatch<SetStateAction<string>>;
  setFavoriteType: Dispatch<SetStateAction<"all" | "image" | "chat">>;
  setContactsManagementOpen: Dispatch<SetStateAction<boolean>>;
  setFriends: Dispatch<SetStateAction<any[]>>;
  setBlockedFriends: Dispatch<SetStateAction<any[]>>;
  setFriendRequests: Dispatch<SetStateAction<any[]>>;
  setPrivacySettings: Dispatch<SetStateAction<PrivacySettings>>;
  setFriendPanelOpen: Dispatch<SetStateAction<boolean>>;
  setFriendSearchResult: Dispatch<SetStateAction<any>>;
  setFriendSearchError: Dispatch<SetStateAction<string>>;
  setProfileCard: Dispatch<SetStateAction<any>>;
  clearConversationDrafts: () => void;
  processedMessageRef: { current: string };
  processedNoticeRef: { current: string };
  lastRequestCountRef: { current: number };
  join: (session: { token: string; user: CurrentUser }) => void;
  disconnect: () => void;
  resetSession: () => void;
  updateRealtimeProfile: (user: CurrentUser) => void;
  addSystemNotice: (options: { eventType: string; title: string; content: string; level?: "info" | "success" | "warning" | "error" }) => void;
  refreshFriends: (token: string) => Promise<void>;
  refreshFriendRequests: (token: string) => Promise<void>;
  refreshPrivacy: (token: string) => Promise<void>;
  refreshConversations: (token: string) => Promise<void>;
  refreshFavorites: (token: string) => Promise<void>;
}

export function createAuthActions(options: CreateAuthActionsOptions) {
  const {
    authDraft,
    storedSettings,
    currentUser,
    storedToken,
    setAuthDraft,
    setAuthPending,
    setLoginError,
    setRegisterError,
    setCurrentUser,
    setStoredToken,
    setStoredContacts,
    setHistoryState,
    setConversations,
    setFavoriteItems,
    setSelectedFiles,
    setActiveDock,
    setActiveConversationId,
    setSelectedContactId,
    setFavoriteKeyword,
    setFavoriteType,
    setContactsManagementOpen,
    setFriends,
    setBlockedFriends,
    setFriendRequests,
    setPrivacySettings,
    setFriendPanelOpen,
    setFriendSearchResult,
    setFriendSearchError,
    setProfileCard,
    clearConversationDrafts,
    processedMessageRef,
    processedNoticeRef,
    lastRequestCountRef,
    join,
    disconnect,
    resetSession,
    updateRealtimeProfile,
    addSystemNotice,
    refreshFriends,
    refreshFriendRequests,
    refreshPrivacy,
    refreshConversations,
    refreshFavorites,
  } = options;

  const refreshCaptcha = async () => {
    try {
      const nextCaptcha = await fetchCaptcha();
      setAuthDraft((previous) => ({
        ...previous,
        register: {
          ...previous.register,
          captchaId: nextCaptcha.captchaId,
          captchaImage: nextCaptcha.image,
          captchaCode: "",
        },
      }));
    } catch {
      setRegisterError("验证码加载失败");
    }
  };

  const normalizeLoginError = (error: unknown) => {
    if (isApiError(error)) {
      if (error.status === 401) {
        return "账号或密码错误";
      }
      if (error.status === 0) {
        return "网络异常，请稍后重试";
      }
      if (error.status >= 500) {
        return "服务暂时不可用，请稍后重试";
      }
    }
    return error instanceof Error && error.message ? error.message : "账号或密码错误";
  };

  const normalizeRegisterError = (error: unknown) => {
    if (isApiError(error)) {
      if (error.status === 0) {
        return "网络异常，请稍后重试";
      }
      if (error.status >= 500) {
        return "服务暂时不可用，请稍后重试";
      }
    }
    return error instanceof Error && error.message ? error.message : "注册失败";
  };

  const beginSession = (user: CurrentUser, token: string) => {
    processedMessageRef.current = "";
    processedNoticeRef.current = "";
    setCurrentUser(user);
    setStoredToken(token);
    setStoredContacts((previous) => mergeContacts(previous, createBaseContacts(user)));
    setActiveDock("chat");
    setActiveConversationId("");
    setContactsManagementOpen(false);
    setHistoryState({});
    setConversations([]);
    setFriendSearchResult(null);
    setFriendSearchError("");
    setProfileCard(null);
    resetSession();
    join({ token, user });
    void refreshFriends(token);
    void refreshFriendRequests(token);
    void refreshPrivacy(token);
    void refreshConversations(token);
    void refreshFavorites(token);
  };

  const handleAuthExpired = () => {
    setStoredToken("");
    setCurrentUser(null);
    clearConversationDrafts();
    setLoginError("登录已过期，请重新登录");
    setRegisterError("");
    setActiveDock("chat");
    setActiveConversationId("");
    setSelectedContactId("");
    setFavoriteKeyword("");
    setFavoriteType("all");
    setFavoriteItems([]);
    setSelectedFiles([]);
    setStoredContacts([]);
    setContactsManagementOpen(false);
    setHistoryState({});
    setConversations([]);
    setFriends([]);
    setBlockedFriends([]);
    setFriendRequests([]);
    setPrivacySettings(DEFAULT_PRIVACY);
    setFriendPanelOpen(false);
    setFriendSearchResult(null);
    setFriendSearchError("");
    setProfileCard(null);
    resetSession();
  };

  const handleAuthAvatarPick = async (file: File) => {
    const avatar = await prepareAvatarDataUrl(file);
    setAuthDraft((previous) => ({
      ...previous,
      register: {
        ...previous.register,
        avatar,
      },
    }));
  };

  const handleProfileAvatarPick = async (file: File) => {
    if (!currentUser || !storedToken) {
      return;
    }
    const avatar = await prepareAvatarDataUrl(file);
    const nextUser = await updateProfile(storedToken, { avatar });
    setCurrentUser(nextUser);
    updateRealtimeProfile(nextUser);
    setStoredContacts((previous) =>
      previous.map((contact) =>
        contact.id === nextUser.id || contact.source === "self"
          ? {
              ...contact,
              id: nextUser.id,
              name: nextUser.nickname,
              username: nextUser.username,
              avatar: nextUser.avatar,
              gender: nextUser.gender,
              region: nextUser.region,
              signature: nextUser.signature,
            }
          : contact,
      ),
    );
    disconnect();
    join({ token: storedToken, user: nextUser });
  };

  const handleAvatarPick = async (file: File) => {
    try {
      if (!currentUser) {
        await handleAuthAvatarPick(file);
        return;
      }
      await handleProfileAvatarPick(file);
    } catch (error) {
      addSystemNotice({
        eventType: "avatar-error",
        title: "头像",
        content: error instanceof Error ? error.message : "头像处理失败",
        level: "error",
      });
    }
  };

  const handleResetAvatar = () => {
    if (!currentUser) {
      setAuthDraft((previous) => ({
        ...previous,
        register: {
          ...previous.register,
          avatar: "",
        },
      }));
      return;
    }

    if (!storedToken) {
      handleAuthExpired();
      return;
    }

    void (async () => {
      try {
        const nextUser = await updateProfile(storedToken, { avatar: "" });
        setCurrentUser(nextUser);
        updateRealtimeProfile(nextUser);
        setStoredContacts((previous) =>
          previous.map((contact) =>
            contact.id === nextUser.id || contact.source === "self"
              ? {
                  ...contact,
                  id: nextUser.id,
                  name: nextUser.nickname,
                  username: nextUser.username,
                  avatar: nextUser.avatar,
                  gender: nextUser.gender,
                  region: nextUser.region,
                  signature: nextUser.signature,
                }
              : contact,
          ),
        );
        disconnect();
        join({ token: storedToken, user: nextUser });
      } catch {
        handleAuthExpired();
      }
    })();
  };

  const handleProfileUpdate = async (
    patch: Partial<Pick<CurrentUser, "nickname" | "gender" | "region" | "signature">>,
  ): Promise<string | null> => {
    if (!currentUser || !storedToken) {
      return "登录已过期，请重新登录";
    }

    try {
      const nextUser = await updateProfile(storedToken, patch);
      setCurrentUser(nextUser);
      updateRealtimeProfile(nextUser);
      setStoredContacts((previous) =>
        previous.map((contact) =>
          contact.id === nextUser.id || contact.source === "self"
            ? {
                ...contact,
                id: nextUser.id,
                name: nextUser.nickname,
                username: nextUser.username,
                avatar: nextUser.avatar,
                gender: nextUser.gender,
                region: nextUser.region,
                signature: nextUser.signature,
                lastSeenAt: "当前在线",
              }
            : contact,
        ),
      );
      if (patch.nickname !== undefined) {
        disconnect();
        join({ token: storedToken, user: nextUser });
      }
      addSystemNotice({ eventType: "profile-updated", title: "资料", content: "资料已更新", level: "success" });
      return null;
    } catch (error) {
      if (isAuthExpiredError(error)) {
        handleAuthExpired();
      }
      return error instanceof Error ? error.message : "资料更新失败";
    }
  };

  const handleChangePassword = async (payload: {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<string | null> => {
    if (!currentUser || !storedToken) {
      return "账号已过期，请重新登录";
    }

    const oldPassword = payload.oldPassword.trim();
    const newPassword = payload.newPassword.trim();
    const confirmPassword = payload.confirmPassword.trim();
    if (!oldPassword) {
      return "请输入旧密码";
    }
    if (!newPassword) {
      return "请输入新密码";
    }
    if (!confirmPassword) {
      return "请输入确认密码";
    }
    if (newPassword !== confirmPassword) {
      return "两次输入的新密码不一致";
    }
    if (newPassword.length < 6 || newPassword.length > 32) {
      return "密码长度需为 6-32 位";
    }
    if (oldPassword === newPassword) {
      return "新密码不能和旧密码一样";
    }

    try {
      await changePassword(storedToken, { oldPassword, newPassword, confirmPassword });
      handleLogout();
      setLoginError("密码已修改，请重新登录");
      return null;
    } catch (error) {
      if (isAuthExpiredError(error)) {
        handleAuthExpired();
        return null;
      }
      if (isApiError(error)) {
        if (error.status === 401) {
          return "旧密码错误";
        }
        if (error.status === 0) {
          return "网络异常，请稍后重试";
        }
        if (error.status >= 500) {
          return "服务暂时不可用，请稍后重试";
        }
      }
      return error instanceof Error && error.message ? error.message : "密码修改失败";
    }
  };

  const handleLoginSubmit = async () => {
    const username = authDraft.login.username.trim();
    const password = authDraft.login.password;

    if (!username) {
      setLoginError("请输入账号");
      return;
    }
    if (!password) {
      setLoginError("请输入密码");
      return;
    }

    setAuthPending(true);
    setLoginError("");
    setRegisterError("");

    try {
      const response = await login({ username, password });
      beginSession(response.user, response.token);
      setAuthDraft((previous) => ({
        ...previous,
        mode: "login",
        login: { username: storedSettings.rememberProfile ? username : "", password: "" },
      }));
    } catch (error) {
      setLoginError(normalizeLoginError(error));
    } finally {
      setAuthPending(false);
    }
  };

  const handleRegisterSubmit = async () => {
    const form = authDraft.register;
    const username = form.username.trim();
    const nickname = form.nickname.trim();

    if (!username) {
      setRegisterError("请输入账号");
      return;
    }
    if (!USERNAME_PATTERN.test(username)) {
      setRegisterError("账号需为 3-20 位字母、数字或下划线");
      return;
    }
    if (!form.password) {
      setRegisterError("请输入密码");
      return;
    }
    if (form.password.length < 6) {
      setRegisterError("密码至少 6 位");
      return;
    }
    if (form.confirmPassword !== form.password) {
      setRegisterError("两次密码不一致");
      return;
    }
    if (!nickname) {
      setRegisterError("昵称不能为空");
      return;
    }
    if (nickname.length > 20) {
      setRegisterError("昵称最多 20 个字符");
      return;
    }
    if (!form.captchaCode.trim()) {
      setRegisterError("请输入验证码");
      return;
    }

    setAuthPending(true);
    setLoginError("");
    setRegisterError("");

    try {
      const response = await register({
        username,
        password: form.password,
        confirmPassword: form.confirmPassword,
        nickname,
        avatar: form.avatar,
        captchaId: form.captchaId,
        captchaCode: form.captchaCode.trim(),
      });
      beginSession(response.user, response.token);
      setAuthDraft({
        mode: "login",
        login: { username: storedSettings.rememberProfile ? username : "", password: "" },
        register: emptyRegisterForm(),
      });
    } catch (error) {
      const message = normalizeRegisterError(error);
      setRegisterError(message);
      if (message.includes("验证码")) {
        void refreshCaptcha();
      }
    } finally {
      setAuthPending(false);
    }
  };

  const handleLogout = () => {
    disconnect();
    resetSession();
    setCurrentUser(null);
    setStoredToken("");
    clearConversationDrafts();
    setActiveDock("chat");
    setActiveConversationId("");
    setSelectedContactId("");
    setFavoriteKeyword("");
    setFavoriteType("all");
    setFavoriteItems([]);
    setSelectedFiles([]);
    setStoredContacts([]);
    setContactsManagementOpen(false);
    setHistoryState({});
    setConversations([]);
    processedMessageRef.current = "";
    processedNoticeRef.current = "";
    lastRequestCountRef.current = 0;
    setLoginError("");
    setRegisterError("");
    setFriends([]);
    setBlockedFriends([]);
    setFriendRequests([]);
    setPrivacySettings(DEFAULT_PRIVACY);
    setFriendPanelOpen(false);
    setFriendSearchResult(null);
    setFriendSearchError("");
    setProfileCard(null);
    setAuthDraft((previous) => ({
      mode: "login",
      login: { username: storedSettings.rememberProfile ? previous.login.username.trim() : "", password: "" },
      register: emptyRegisterForm(),
    }));
  };

  return {
    refreshCaptcha,
    beginSession,
    handleAuthExpired,
    handleAvatarPick,
    handleResetAvatar,
    handleProfileUpdate,
    handleChangePassword,
    handleLoginSubmit,
    handleRegisterSubmit,
    handleLogout,
  };
}
