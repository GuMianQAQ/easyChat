import { useCallback, useEffect, useRef, useState } from "react";
import type { CurrentUser, MomentItem } from "../../types/chat";
import {
  fetchMomentsFeed,
  createMoment,
  likeMoment,
  unlikeMoment,
  deleteMoment,
  addMomentComment,
  deleteMomentComment,
} from "../../utils/momentsApi";
import { uploadImage } from "../../utils/chatApi";
import { fetchCurrentUser, updateProfile } from "../../utils/auth";
import DesktopWindowFrame from "../app/DesktopWindowFrame";
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

export default function MomentsWindow() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [moments, setMoments] = useState<MomentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // ---------- Token ----------
  const token = getToken();

  // ---------- Bootstrap ----------
  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function load() {
      try {
        const [user, items] = await Promise.all([
          fetchCurrentUser(token),
          fetchMomentsFeed(token),
        ]);
        if (cancelled) return;
        setCurrentUser(user);
        setMoments(items);
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // ---------- Moments handlers ----------

  const handleCreate = useCallback(
    async (content: string, images: string[]) => {
      if (!token) return;
      try {
        const post = await createMoment(token, { content, images });
        setMoments((prev) => [post, ...prev]);
      } catch {
        // silently fail
      }
    },
    [token],
  );

  const handleLike = useCallback(
    async (momentId: string, liked: boolean) => {
      if (!token) return;
      try {
        if (liked) {
          await unlikeMoment(token, momentId);
        } else {
          await likeMoment(token, momentId);
        }
        setMoments((prev) =>
          prev.map((m) =>
            m.id === momentId
              ? {
                  ...m,
                  likedByMe: !liked,
                  likeCount: liked ? m.likeCount - 1 : m.likeCount + 1,
                }
              : m,
          ),
        );
      } catch {
        // silently fail
      }
    },
    [token],
  );

  const handleDelete = useCallback(
    async (momentId: string) => {
      if (!token) return;
      try {
        await deleteMoment(token, momentId);
        setMoments((prev) => prev.filter((m) => m.id !== momentId));
      } catch {
        // silently fail
      }
    },
    [token],
  );

  const handleAddComment = useCallback(
    async (momentId: string, content: string) => {
      if (!token) return;
      try {
        const comment = await addMomentComment(token, momentId, content);
        setMoments((prev) =>
          prev.map((m) =>
            m.id === momentId ? { ...m, comments: [...m.comments, comment] } : m,
          ),
        );
      } catch {
        // silently fail
      }
    },
    [token],
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      if (!token) return;
      try {
        await deleteMomentComment(token, commentId);
        setMoments((prev) =>
          prev.map((m) => ({
            ...m,
            comments: m.comments.filter((c) => c.id !== commentId),
          })),
        );
      } catch {
        // silently fail
      }
    },
    [token],
  );

  const handleUploadImage = useCallback(
    async (file: File): Promise<string> => {
      return uploadImage(token, file);
    },
    [token],
  );

  // ---------- Cover actions ----------

  const customCoverUrl =
    currentUser && currentUser.momentCover && isDataUrlLike(currentUser.momentCover)
      ? currentUser.momentCover
      : null;
  const coverUrl = customCoverUrl || DEFAULT_COVER_URL;

  const handleCoverClick = () => {
    setCoverPreviewUrl(coverUrl);
  };

  const handleCoverContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleViewCover = () => {
    closeContextMenu();
    setCoverPreviewUrl(coverUrl);
  };

  const handleChangeCover = () => {
    closeContextMenu();
    fileRef.current?.click();
  };

  const handleResetCover = async () => {
    closeContextMenu();
    if (!token) return;
    try {
      await updateProfile(token, { momentCover: "" });
      const user = await fetchCurrentUser(token);
      setCurrentUser(user);
    } catch {
      // silently fail
    }
  };

  const handleCoverFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(token, file);
      await updateProfile(token, { momentCover: url });
      const user = await fetchCurrentUser(token);
      setCurrentUser(user);
    } catch {
      // silently fail
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleOpenProfile = useCallback(
    (_userId: string, _event: React.MouseEvent) => {
      // no-op: self-view only in this phase
    },
    [],
  );

  const handleOpenImagePreview = useCallback(
    (src: string) => {
      setCoverPreviewUrl(src);
    },
    [],
  );

  // ---------- Render ----------

  if (!token || (!loading && !currentUser)) {
    return (
      <DesktopWindowFrame>
        <div className="moments-surface" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 14 }}>
          请先登录
        </div>
      </DesktopWindowFrame>
    );
  }

  return (
    <DesktopWindowFrame>
      <div className="moments-surface">
        {/* Cover hero */}
        <div className="moments-hero" style={{ cursor: "pointer" }}>
          <div
            className="moments-hero-cover"
            style={{
              background: `url(${coverUrl}) center/cover no-repeat`,
              cursor: "pointer",
            }}
            onClick={handleCoverClick}
            onContextMenu={handleCoverContextMenu}
          />
          {currentUser && (
            <div className="moments-hero-identity">
              <div
                className="moments-hero-avatar-wrapper"
                onClick={handleCoverClick}
                onContextMenu={handleCoverContextMenu}
                style={{ cursor: "pointer" }}
              >
                <img
                  className="avatar avatar-lg"
                  src={currentUser.avatar || ""}
                  alt=""
                  style={{ borderRadius: "50%", width: 48, height: 48, objectFit: "cover", display: "block" }}
                />
              </div>
              <div className="moments-hero-info">
                <span className="moments-hero-nickname">{currentUser.nickname}</span>
                <span className="moments-hero-username">@{currentUser.username}</span>
              </div>
            </div>
          )}
        </div>

        {/* Context menu for cover */}
        {contextMenu && (
          <>
            <div
              style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
              onClick={closeContextMenu}
            />
            <div
              style={{
                position: "fixed",
                top: contextMenu.y,
                left: contextMenu.x,
                zIndex: 1000,
                background: "#fff",
                borderRadius: 8,
                boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                padding: "4px 0",
                minWidth: 140,
              }}
            >
              <button
                type="button"
                style={{
                  display: "block",
                  width: "100%",
                  padding: "8px 16px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  textAlign: "left",
                  color: "#333",
                }}
                onClick={handleViewCover}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                查看封面
              </button>
              <button
                type="button"
                style={{
                  display: "block",
                  width: "100%",
                  padding: "8px 16px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  textAlign: "left",
                  color: "#333",
                }}
                onClick={handleChangeCover}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                更换封面
              </button>
              <button
                type="button"
                style={{
                  display: "block",
                  width: "100%",
                  padding: "8px 16px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  textAlign: "left",
                  color: "#e53e3e",
                }}
                onClick={handleResetCover}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#fff5f5")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                重置封面
              </button>
            </div>
          </>
        )}

        {/* Hidden file input for cover */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleCoverFilePick}
        />

        {/* Feed stream */}
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
          />
        </div>
      </div>

      {/* Cover preview modal */}
      {coverPreviewUrl && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            cursor: "pointer",
          }}
          onClick={() => setCoverPreviewUrl(null)}
        >
          <img
            src={coverPreviewUrl}
            alt=""
            style={{
              maxWidth: "90%",
              maxHeight: "90%",
              objectFit: "contain",
              borderRadius: 4,
            }}
          />
        </div>
      )}
    </DesktopWindowFrame>
  );
}
