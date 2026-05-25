import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, MouseEvent as ReactMouseEvent } from "react";
import type { CurrentUser, MomentItem, UserProfile } from "../../types/chat";
import {
  addMomentComment,
  createMoment,
  deleteMoment,
  deleteMomentComment,
  fetchMomentsFeed,
  likeMoment,
  unlikeMoment,
} from "../../utils/momentsApi";
import { uploadImage } from "../../utils/chatApi";
import { fetchCurrentUser, updateProfile } from "../../utils/auth";
import { fetchUserProfile } from "../../utils/friendsApi";
import { currentUserToProfile } from "../../utils/appHelpers";
import { resolveMediaUrl } from "../../config/env";
import DesktopWindowFrame from "../app/DesktopWindowFrame";
import UserProfileCard from "../common/UserProfileCard";
import MomentsView from "./MomentsView";
import "../../styles/moments.css";

const DEFAULT_COVER_URL = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 720" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#7a95b8" />
        <stop offset="30%" stop-color="#8fa8c4" />
        <stop offset="62%" stop-color="#b7c7d7" />
        <stop offset="100%" stop-color="#d9d4c8" />
      </linearGradient>
      <radialGradient id="warm" cx="20%" cy="24%" r="32%">
        <stop offset="0%" stop-color="#fff0d6" stop-opacity="0.95" />
        <stop offset="100%" stop-color="#fff0d6" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="cool" cx="76%" cy="28%" r="30%">
        <stop offset="0%" stop-color="#c2dcff" stop-opacity="0.88" />
        <stop offset="100%" stop-color="#c2dcff" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="veil" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#0f172a" stop-opacity="0.02" />
        <stop offset="100%" stop-color="#0f172a" stop-opacity="0.18" />
      </linearGradient>
    </defs>
    <rect width="1600" height="720" fill="url(#bg)" />
    <rect width="1600" height="720" fill="url(#warm)" />
    <rect width="1600" height="720" fill="url(#cool)" />
    <rect width="1600" height="720" fill="url(#veil)" />
  </svg>
`)}`;

type FeedbackTone = "success" | "error" | "info";

interface FeedbackState {
  tone: FeedbackTone;
  text: string;
}

function getToken(): string {
  try {
    const stored = localStorage.getItem("easychat:token");
    if (!stored) {
      return "";
    }
    try {
      const parsed = JSON.parse(stored);
      return typeof parsed === "string" ? parsed : "";
    } catch {
      return stored;
    }
  } catch {
    return "";
  }
}

function isDataUrlLike(value: string): boolean {
  return value.startsWith("data:image/") || value.startsWith("http") || value.startsWith("/");
}

function normalizeCoverUrl(value?: string): string | null {
  if (!value) {
    return null;
  }
  if (isDataUrlLike(value)) {
    return value.startsWith("/") ? resolveMediaUrl(value) : value;
  }
  return resolveMediaUrl(value);
}

export default function MomentsWindow() {
  const token = getToken();
  const fileRef = useRef<HTMLInputElement>(null);
  const gestureStateRef = useRef<
    | {
        kind: "move";
        startScreenX: number;
        startScreenY: number;
        startX: number;
        startY: number;
      }
    | null
  >(null);
  const gestureFrameRef = useRef<number | null>(null);
  const gesturePendingRef = useRef<{ kind: "move"; x: number; y: number } | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [launchContext, setLaunchContext] = useState<{ userId?: string }>({});
  const [moments, setMoments] = useState<MomentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [profileCard, setProfileCard] = useState<{ profile: UserProfile; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!feedback) {
      return;
    }
    const timer = window.setTimeout(() => setFeedback(null), 2600);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (!window.myChatDesktop || !window.myChatWindow) {
      return undefined;
    }

    const flushGesture = () => {
      gestureFrameRef.current = null;
      const payload = gesturePendingRef.current;
      if (!payload) {
        return;
      }
      gesturePendingRef.current = null;
      void window.myChatWindow?.moveFrame({ x: payload.x, y: payload.y });
    };

    const handleMouseMove = (event: MouseEvent) => {
      const state = gestureStateRef.current;
      if (!state) {
        return;
      }

      const deltaX = event.screenX - state.startScreenX;
      const deltaY = event.screenY - state.startScreenY;
      if (Math.abs(deltaX) < 3 && Math.abs(deltaY) < 3) {
        return;
      }
      gesturePendingRef.current = {
        kind: "move",
        x: state.startX + deltaX,
        y: state.startY + deltaY,
      };

      if (gestureFrameRef.current === null) {
        gestureFrameRef.current = window.requestAnimationFrame(flushGesture);
      }
    };

    const handleGestureEnd = () => {
      gestureStateRef.current = null;
      gesturePendingRef.current = null;
      if (gestureFrameRef.current !== null) {
        window.cancelAnimationFrame(gestureFrameRef.current);
        gestureFrameRef.current = null;
      }
      document.body.classList.remove("moments-window-dragging");
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleGestureEnd);
    window.addEventListener("blur", handleGestureEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleGestureEnd);
      window.removeEventListener("blur", handleGestureEnd);
      if (gestureFrameRef.current !== null) {
        window.cancelAnimationFrame(gestureFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!window.myChatMoments) {
      return;
    }

    let cancelled = false;
    void window.myChatMoments.getContext().then((context) => {
      if (!cancelled) {
        setLaunchContext(context || {});
      }
    });

    const unsubscribe = window.myChatMoments.onContextChange((context) => {
      setLaunchContext(context || {});
      setContextMenu(null);
      setProfileCard(null);
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setProfileCard(null);
      try {
        const user = await fetchCurrentUser(token);
        if (cancelled) {
          return;
        }
        setCurrentUser(user);

        const requestedUserId = launchContext.userId?.trim() || "";
        const targetUserId = requestedUserId && requestedUserId !== user.id ? requestedUserId : undefined;

        const [items, profile] = await Promise.all([
          fetchMomentsFeed(token, targetUserId),
          targetUserId ? fetchUserProfile(token, targetUserId) : Promise.resolve(currentUserToProfile(user)),
        ]);

        if (cancelled) {
          return;
        }

        setMoments(items);
        setTargetProfile(profile);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setMoments([]);
        setTargetProfile(null);
        setFeedback({
          tone: "error",
          text: error instanceof Error ? error.message : "朋友圈加载失败",
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [launchContext.userId, token]);

  const viewedProfile = useMemo(() => {
    if (targetProfile) {
      return targetProfile;
    }
    if (currentUser) {
      return currentUserToProfile(currentUser);
    }
    return null;
  }, [currentUser, targetProfile]);

  const isSelfView = Boolean(currentUser && viewedProfile && viewedProfile.id === currentUser.id);
  const coverUrl = normalizeCoverUrl(viewedProfile?.momentCover) || DEFAULT_COVER_URL;

  const refreshSelfProfile = useCallback(async () => {
    if (!token) {
      return null;
    }
    const user = await fetchCurrentUser(token);
    setCurrentUser(user);
    const profile = currentUserToProfile(user);
    setTargetProfile((prev) => (prev?.isSelf ? profile : prev));
    return user;
  }, [token]);

  const handleCreate = useCallback(
    async (content: string, images: string[]) => {
      if (!token || !isSelfView) {
        return;
      }
      try {
        const post = await createMoment(token, { content, images });
        setMoments((prev) => [post, ...prev]);
      } catch (error) {
        setFeedback({
          tone: "error",
          text: error instanceof Error ? error.message : "发布动态失败",
        });
      }
    },
    [isSelfView, token],
  );

  const handleLike = useCallback(
    async (momentId: string, liked: boolean) => {
      if (!token) {
        return;
      }
      try {
        if (liked) {
          await unlikeMoment(token, momentId);
        } else {
          await likeMoment(token, momentId);
        }
        setMoments((prev) =>
          prev.map((moment) =>
            moment.id === momentId
              ? {
                  ...moment,
                  likedByMe: !liked,
                  likeCount: liked ? Math.max(0, moment.likeCount - 1) : moment.likeCount + 1,
                }
              : moment,
          ),
        );
      } catch (error) {
        setFeedback({
          tone: "error",
          text: error instanceof Error ? error.message : "点赞失败",
        });
      }
    },
    [token],
  );

  const handleDelete = useCallback(
    async (momentId: string) => {
      if (!token) {
        return;
      }
      try {
        await deleteMoment(token, momentId);
        setMoments((prev) => prev.filter((moment) => moment.id !== momentId));
      } catch (error) {
        setFeedback({
          tone: "error",
          text: error instanceof Error ? error.message : "删除动态失败",
        });
      }
    },
    [token],
  );

  const handleAddComment = useCallback(
    async (momentId: string, content: string) => {
      if (!token) {
        return;
      }
      try {
        const comment = await addMomentComment(token, momentId, content);
        setMoments((prev) =>
          prev.map((moment) =>
            moment.id === momentId
              ? { ...moment, comments: [...moment.comments, comment] }
              : moment,
          ),
        );
      } catch (error) {
        setFeedback({
          tone: "error",
          text: error instanceof Error ? error.message : "评论失败",
        });
      }
    },
    [token],
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      if (!token) {
        return;
      }
      try {
        await deleteMomentComment(token, commentId);
        setMoments((prev) =>
          prev.map((moment) => ({
            ...moment,
            comments: moment.comments.filter((comment) => comment.id !== commentId),
          })),
        );
      } catch (error) {
        setFeedback({
          tone: "error",
          text: error instanceof Error ? error.message : "删除评论失败",
        });
      }
    },
    [token],
  );

  const handleUploadImage = useCallback(
    async (file: File): Promise<string> => {
      if (!token) {
        throw new Error("请先登录");
      }
      return uploadImage(token, file);
    },
    [token],
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleCoverDoubleClick = useCallback(() => {
    setCoverPreviewUrl(coverUrl);
  }, [coverUrl]);

  const handleViewCover = useCallback(() => {
    closeContextMenu();
    setCoverPreviewUrl(coverUrl);
  }, [closeContextMenu, coverUrl]);

  const handleChangeCover = useCallback(() => {
    closeContextMenu();
    fileRef.current?.click();
  }, [closeContextMenu]);

  const handleResetCover = useCallback(async () => {
    closeContextMenu();
    if (!token || !isSelfView) {
      return;
    }
    try {
      await updateProfile(token, { momentCover: "" });
      await refreshSelfProfile();
      setFeedback({ tone: "success", text: "已恢复默认封面" });
    } catch (error) {
      setFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "重置封面失败",
      });
    }
  }, [closeContextMenu, isSelfView, refreshSelfProfile, token]);

  const handleCoverFilePick = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !token || !isSelfView) {
        if (fileRef.current) {
          fileRef.current.value = "";
        }
        return;
      }

      setFeedback({ tone: "info", text: "正在更新封面..." });
      try {
        const url = await uploadImage(token, file);
        await updateProfile(token, { momentCover: url });
        await refreshSelfProfile();
        setFeedback({ tone: "success", text: "朋友圈封面已更新" });
      } catch (error) {
        setFeedback({
          tone: "error",
          text: error instanceof Error ? error.message : "更换封面失败",
        });
      } finally {
        if (fileRef.current) {
          fileRef.current.value = "";
        }
      }
    },
    [isSelfView, refreshSelfProfile, token],
  );

  const handleCoverContextMenu = useCallback(
    (event: ReactMouseEvent) => {
      if (!isSelfView) {
        return;
      }
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY });
    },
    [isSelfView],
  );

  const handleCoverMouseDown = useCallback(
    async (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!window.myChatDesktop || !window.myChatWindow || event.button !== 0) {
        return;
      }
      const bounds = await window.myChatWindow.getBounds();
      gestureStateRef.current = {
        kind: "move",
        startScreenX: event.screenX,
        startScreenY: event.screenY,
        startX: bounds.x,
        startY: bounds.y,
      };
      document.body.classList.add("moments-window-dragging");
    },
    [],
  );

  const openProfileCard = useCallback(
    async (userId: string, anchor: { x: number; y: number }) => {
      if (!token) {
        return;
      }
      try {
        const profile =
          currentUser && userId === currentUser.id
            ? currentUserToProfile(currentUser)
            : await fetchUserProfile(token, userId);
        setProfileCard({ profile, x: anchor.x, y: anchor.y });
      } catch (error) {
        setFeedback({
          tone: "error",
          text: error instanceof Error ? error.message : "加载资料失败",
        });
      }
    },
    [currentUser, token],
  );

  const handleOpenProfile = useCallback(
    (userId: string, event: ReactMouseEvent) => {
      void openProfileCard(userId, { x: event.clientX + 12, y: event.clientY + 12 });
    },
    [openProfileCard],
  );

  const handleOpenHeroProfile = useCallback(
    (event: ReactMouseEvent) => {
      if (!viewedProfile) {
        return;
      }
      event.stopPropagation();
      void openProfileCard(viewedProfile.id, { x: event.clientX + 12, y: event.clientY + 12 });
    },
    [openProfileCard, viewedProfile],
  );

  const handleOpenImagePreview = useCallback((src: string) => {
    setCoverPreviewUrl(src);
  }, []);

  if (!token || (!loading && !currentUser)) {
    return (
      <DesktopWindowFrame variant="moments">
        <div
          className="moments-surface"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 14 }}
        >
          请先登录
        </div>
      </DesktopWindowFrame>
    );
  }

  return (
    <DesktopWindowFrame variant="moments">
      <div className="moments-surface">
        {feedback ? (
          <div className={`moments-feedback moments-feedback-${feedback.tone}`}>{feedback.text}</div>
        ) : null}

        <div className="moments-hero">
          <div
            className="moments-hero-cover moments-hero-drag-surface"
            style={{ background: `url(${coverUrl}) center/cover no-repeat` }}
            onMouseDown={(event) => void handleCoverMouseDown(event)}
            onDoubleClick={handleCoverDoubleClick}
            onContextMenu={handleCoverContextMenu}
          />
          {viewedProfile ? (
            <div className="moments-hero-identity">
              <button
                type="button"
                className="moments-hero-avatar-wrapper"
                onClick={handleOpenHeroProfile}
                title="查看资料"
              >
                <img
                  className="avatar avatar-lg"
                  src={viewedProfile.avatar || ""}
                  alt=""
                  style={{
                    borderRadius: "50%",
                    width: 48,
                    height: 48,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </button>
              <button
                type="button"
                className="moments-hero-info moments-hero-info-button"
                onClick={handleOpenHeroProfile}
                title="查看资料"
              >
                <span className="moments-hero-nickname">{viewedProfile.nickname}</span>
              </button>
            </div>
          ) : null}
        </div>

        {contextMenu ? (
          <>
            <div
              className="moments-context-backdrop"
              onClick={closeContextMenu}
              onContextMenu={(event) => {
                event.preventDefault();
                closeContextMenu();
              }}
            />
            <div className="moments-cover-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
              <button type="button" className="moments-cover-menu-item" onClick={handleViewCover}>
                查看封面
              </button>
              <button type="button" className="moments-cover-menu-item" onClick={handleChangeCover}>
                更换封面
              </button>
              <button
                type="button"
                className="moments-cover-menu-item moments-cover-menu-item-danger"
                onClick={handleResetCover}
              >
                重置封面
              </button>
            </div>
          </>
        ) : null}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleCoverFilePick}
        />

        <div className="moments-stream">
          <MomentsView.Feed
            moments={moments}
            onUploadImage={handleUploadImage}
            onCreateMoment={handleCreate}
            onLike={handleLike}
            onDelete={handleDelete}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
            onOpenProfile={handleOpenProfile}
            onOpenImagePreview={handleOpenImagePreview}
            showComposer={isSelfView}
          />
        </div>
      </div>

      {coverPreviewUrl ? (
        <div className="moments-cover-preview" onClick={() => setCoverPreviewUrl(null)}>
          <img src={coverPreviewUrl} alt="" className="moments-cover-preview-image" />
        </div>
      ) : null}

      {profileCard ? (
        <UserProfileCard
          profile={profileCard.profile}
          anchor={{ x: profileCard.x, y: profileCard.y }}
          onClose={() => setProfileCard(null)}
          onOpenAvatarPreview={(src) => setCoverPreviewUrl(src)}
        />
      ) : null}
    </DesktopWindowFrame>
  );
}
