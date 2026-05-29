import { ChevronRight, MessageCircle, MoreHorizontal, Phone, Settings, UserPlus, Video } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ContactItem, UserProfile } from "../../types/chat";
import { fetchMomentsFeed } from "../../utils/momentsApi";
import { getToken } from "../../utils/auth";
import ContactEditModal from "../contacts/ContactEditModal";
import { sourceLabel as contactSourceLabel } from "../contacts/contactHelpers";
import Avatar from "./Avatar";

const momentThumbCache = new Map<string, string[]>();
const momentThumbInFlight = new Map<string, Promise<string[]>>();

interface UserProfileCardDetail {
  contact?: ContactItem;
  remark?: string;
  tags?: string[];
  sourceLabel?: string;
  addedAt?: string;
  mutualGroupCount?: number;
}

interface UserProfileCardProps {
  profile: UserProfile;
  detail?: UserProfileCardDetail;
  anchor: { x: number; y: number };
  onClose: () => void;
  onOpenSettings?: () => void;
  onOpenChat?: (profile: UserProfile) => void;
  onSendRequest?: (profile: UserProfile) => void;
  onOpenAvatarPreview?: (src: string) => void;
  onOpenMoments?: (profile: UserProfile) => void;
  onOpenManagement?: () => void;
  onUpdateContact?: (contactId: string, patch: Partial<ContactItem>) => void;
  onToggleBlock?: (friendId: string, nextBlocked: boolean) => void;
  onDeleteFriend?: (friendId: string) => void;
  onUploadImage?: (file: File) => Promise<string>;
}

function genderMeta(gender?: UserProfile["gender"]) {
  if (gender === "male") {
    return { symbol: "\u2642", tone: "male" as const };
  }
  if (gender === "female") {
    return { symbol: "\u2640", tone: "female" as const };
  }
  return null;
}

function resolvePrimaryAction(
  profile: UserProfile,
  onOpenSettings?: () => void,
  onOpenChat?: (profile: UserProfile) => void,
  onSendRequest?: (profile: UserProfile) => void,
) {
  if (profile.isSelf) {
    if (!onOpenSettings) {
      return null;
    }
    return {
      label: "\u67e5\u770b\u8d44\u6599",
      icon: Settings,
      disabled: false,
      onClick: () => onOpenSettings(),
    };
  }

  if (profile.isFriend || profile.requestStatus === "accepted") {
    if (!onOpenChat) {
      return null;
    }
    return {
      label: "\u53d1\u6d88\u606f",
      icon: MessageCircle,
      disabled: false,
      onClick: () => onOpenChat(profile),
    };
  }

  if (profile.requestStatus === "pending") {
    return {
      label: "\u5df2\u7533\u8bf7",
      icon: UserPlus,
      disabled: true,
      onClick: () => undefined,
    };
  }

  if (profile.requestStatus === "received") {
    return {
      label: "\u901a\u8fc7\u7533\u8bf7",
      icon: UserPlus,
      disabled: false,
      onClick: () => onSendRequest?.(profile),
    };
  }

  if (!profile.allowFriendRequest) {
    return {
      label: "\u65e0\u6cd5\u6dfb\u52a0",
      icon: UserPlus,
      disabled: true,
      onClick: () => undefined,
    };
  }

  return {
    label: "\u6dfb\u52a0\u670b\u53cb",
    icon: UserPlus,
    disabled: false,
    onClick: () => onSendRequest?.(profile),
  };
}

function formatDate(value?: string) {
  if (!value) {
    return "";
  }
  return value.slice(0, 10);
}

async function loadMomentThumbs(token: string, userId: string) {
  const cached = momentThumbCache.get(userId);
  if (cached) {
    return cached;
  }

  const existingRequest = momentThumbInFlight.get(userId);
  if (existingRequest) {
    return existingRequest;
  }

  const request = fetchMomentsFeed(token, userId)
    .then((items) => {
      const nextThumbs = items
        .flatMap((item) => (Array.isArray(item.images) ? item.images : []))
        .filter(Boolean)
        .slice(0, 4);
      momentThumbCache.set(userId, nextThumbs);
      return nextThumbs;
    })
    .catch(() => {
      momentThumbCache.set(userId, []);
      return [];
    })
    .finally(() => {
      momentThumbInFlight.delete(userId);
    });

  momentThumbInFlight.set(userId, request);
  return request;
}

function UserProfileCard({
  profile,
  detail,
  anchor,
  onClose,
  onOpenSettings,
  onOpenChat,
  onSendRequest,
  onOpenAvatarPreview,
  onOpenMoments,
  onOpenManagement,
  onUpdateContact,
  onToggleBlock,
  onDeleteFriend,
  onUploadImage,
}: UserProfileCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [momentThumbs, setMomentThumbs] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const canOpenMoments = Boolean(onOpenMoments);
  const contact = detail?.contact;
  const canManageFriend = Boolean(contact && onUpdateContact && onToggleBlock && onDeleteFriend);
  const canEditContact = Boolean(contact && onUpdateContact && onUploadImage);

  useEffect(() => {
    const handlePointer = (event: MouseEvent) => {
      if (ref.current?.contains(event.target as Node)) {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
          setMenuOpen(false);
        }
        return;
      }
      onClose();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("mousedown", handlePointer);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointer);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    setMenuOpen(false);
    setEditOpen(false);
  }, [profile.id]);

  useEffect(() => {
    let cancelled = false;
    const token = getToken();

    if (!token || !canOpenMoments) {
      setMomentThumbs([]);
      return () => {
        cancelled = true;
      };
    }

    const cached = momentThumbCache.get(profile.id);
    if (cached) {
      setMomentThumbs(cached);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const nextThumbs = await loadMomentThumbs(token, profile.id);
        if (cancelled) {
          return;
        }
        setMomentThumbs(nextThumbs);
      } catch {
        if (!cancelled) {
          setMomentThumbs([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canOpenMoments, profile.id]);

  const primaryAction = resolvePrimaryAction(profile, onOpenSettings, onOpenChat, onSendRequest);
  const PrimaryIcon = primaryAction?.icon;
  const gender = genderMeta(profile.gender);
  const left = Math.max(16, Math.min(anchor.x, window.innerWidth - 356));
  const top = Math.max(16, Math.min(anchor.y, window.innerHeight - 640));
  const usernameText = profile.username?.trim() || "-";
  const regionText = profile.region?.trim();
  const signatureText = profile.signature?.trim();
  const tags = Array.isArray(detail?.tags) ? detail!.tags.filter(Boolean) : [];
  const remarkText = detail?.remark?.trim() || "";
  const resolvedSourceLabel = contact ? contactSourceLabel(contact) : detail?.sourceLabel || "";
  const showMoreInfoSection = Boolean(detail?.mutualGroupCount || resolvedSourceLabel || detail?.addedAt || signatureText);
  const showWeChatActions = primaryAction?.label === "\u53d1\u6d88\u606f";
  const isAIAssistant = profile.id === "ai-assistant";
  const friendPrimaryLabel = remarkText ? "\u5907\u6ce8" : "\u6635\u79f0";
  const friendPrimaryValue = remarkText || profile.nickname;

  const actionItems = useMemo(() => {
    if (!showWeChatActions || !primaryAction || !PrimaryIcon) {
      return [];
    }

    const items = [
      {
        key: "message",
        label: "\u53d1\u6d88\u606f",
        icon: PrimaryIcon,
        disabled: false,
        onClick: () => {
          primaryAction.onClick();
          onClose();
        },
      },
    ];

    if (isAIAssistant) {
      return items;
    }

    return [
      ...items,
      {
        key: "voice",
        label: "\u8bed\u97f3\u804a\u5929",
        icon: Phone,
        disabled: true,
        onClick: () => undefined,
      },
      {
        key: "video",
        label: "\u89c6\u9891\u804a\u5929",
        icon: Video,
        disabled: true,
        onClick: () => undefined,
      },
    ];
  }, [PrimaryIcon, isAIAssistant, onClose, primaryAction, showWeChatActions]);

  const moreActions = useMemo(() => {
    if (profile.isSelf && onOpenSettings) {
      return [
        {
          key: "settings",
          label: "\u67e5\u770b\u8d44\u6599",
          danger: false,
          onClick: () => {
            setMenuOpen(false);
            onOpenSettings();
            onClose();
          },
        },
      ];
    }

    if (!contact || !canManageFriend) {
      return [];
    }

    return [
      {
        key: "edit",
        label: "\u8bbe\u7f6e\u5907\u6ce8\u548c\u6807\u7b7e",
        danger: false,
        onClick: () => {
          setMenuOpen(false);
          if (canEditContact) {
            setEditOpen(true);
          }
        },
      },
      {
        key: "permission",
        label: "\u8bbe\u7f6e\u670b\u53cb\u6743\u9650",
        danger: false,
        onClick: () => {
          setMenuOpen(false);
          onOpenManagement?.();
          onClose();
        },
      },
      {
        key: "star",
        label: contact.isStarred ? "\u53d6\u6d88\u7279\u522b\u5173\u5fc3" : "\u8bbe\u4e3a\u7279\u522b\u5173\u5fc3",
        danger: false,
        onClick: () => {
          setMenuOpen(false);
          onUpdateContact?.(contact.id, { isStarred: !contact.isStarred });
        },
      },
      {
        key: "block",
        label: contact.isBlocked ? "\u79fb\u51fa\u9ed1\u540d\u5355" : "\u52a0\u5165\u9ed1\u540d\u5355",
        danger: false,
        onClick: () => {
          setMenuOpen(false);
          onToggleBlock?.(contact.id, !contact.isBlocked);
          onClose();
        },
      },
      {
        key: "delete",
        label: "\u5220\u9664\u597d\u53cb",
        danger: true,
        onClick: () => {
          setMenuOpen(false);
          onDeleteFriend?.(contact.id);
          onClose();
        },
      },
    ];
  }, [
    canEditContact,
    canManageFriend,
    contact,
    onClose,
    onDeleteFriend,
    onOpenManagement,
    onOpenSettings,
    onToggleBlock,
    onUpdateContact,
    profile.isSelf,
  ]);

  return (
    <div
      ref={ref}
      className="profile-card"
      style={{
        left,
        top,
      }}
    >
      <div className="profile-card-top">
        <button
          type="button"
          className="profile-card-avatar"
          onClick={() => {
            if (profile.avatar) {
              onOpenAvatarPreview?.(profile.avatar);
            }
          }}
          title={profile.avatar ? "\u67e5\u770b\u5934\u50cf\u5927\u56fe" : undefined}
        >
          <Avatar name={profile.nickname} src={profile.avatar} size="xl" />
        </button>

        <div className="profile-card-meta">
          <div className="profile-card-name-line">
            <h3 className="profile-card-name">{profile.nickname}</h3>
            {gender ? (
              <span className={`profile-card-gender profile-card-gender-${gender.tone}`}>{gender.symbol}</span>
            ) : null}
          </div>
          <p className="profile-card-subline">
            {"\u5fae\u4fe1\u53f7\uff1a"}
            {usernameText}
          </p>
          {regionText ? (
            <p className="profile-card-subline">
              {"\u5730\u533a\uff1a"}
              {regionText}
            </p>
          ) : null}
        </div>

        {moreActions.length ? (
          <div className="profile-card-more-wrap" ref={menuRef}>
            <button
              type="button"
              className={`profile-card-more ${menuOpen ? "profile-card-more-active" : ""}`}
              aria-label="\u66f4\u591a\u64cd\u4f5c"
              onClick={() => setMenuOpen((value) => !value)}
            >
              <MoreHorizontal size={18} />
            </button>
            {menuOpen ? (
              <div className="profile-card-more-menu">
                {moreActions.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    className={`profile-card-more-menu-item${action.danger ? " profile-card-more-menu-item-danger" : ""}`}
                    onClick={action.onClick}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="profile-card-scroll">
        <section className="profile-card-section">
          <div className="profile-card-section-title">{"\u670b\u53cb\u8d44\u6599"}</div>
          <div className="profile-card-row">
            <span className="profile-card-label">{friendPrimaryLabel}</span>
            <span className="profile-card-value">{friendPrimaryValue}</span>
          </div>
          {tags.length ? (
            <div className="profile-card-row">
              <span className="profile-card-label">{"\u6807\u7b7e"}</span>
              <span className="profile-card-value">{tags.join(" ")}</span>
            </div>
          ) : null}
        </section>

        {onOpenMoments && !isAIAssistant ? (
          <section className="profile-card-section">
            <div className="profile-card-moments-row">
              <div className="profile-card-section-title profile-card-section-title-inline">{"\u670b\u53cb\u5708"}</div>
            <button
              type="button"
              className={`profile-card-moments-entry${momentThumbs.length ? " profile-card-moments-entry-filled" : " profile-card-moments-entry-empty"}`}
              onClick={() => {
                onOpenMoments(profile);
                onClose();
              }}
              aria-label="\u6253\u5f00\u670b\u53cb\u5708"
            >
              <span className="profile-card-moments-preview">
                {momentThumbs.length ? (
                  <div className="profile-card-moments-grid">
                    {momentThumbs.map((src, index) => (
                      <span
                        key={`${src}-${index}`}
                        className="profile-card-moment-thumb"
                        style={{ backgroundImage: `url(${src})` }}
                      />
                    ))}
                  </div>
                ) : null}
              </span>
              <span className="profile-card-moments-arrow">
                <ChevronRight size={16} />
              </span>
            </button>
          </div>
        </section>
        ) : null}

        {showMoreInfoSection ? (
          <section className="profile-card-section">
            <div className="profile-card-section-title">{"\u66f4\u591a\u4fe1\u606f"}</div>
            {detail?.mutualGroupCount ? (
              <div className="profile-card-row">
                <span className="profile-card-label">{"\u5171\u540c\u7fa4\u804a"}</span>
                <span className="profile-card-value">{`${detail.mutualGroupCount}\u4e2a`}</span>
              </div>
            ) : null}
            {signatureText ? (
              <div className="profile-card-row">
                <span className="profile-card-label">{"\u4e2a\u6027\u7b7e\u540d"}</span>
                <span className="profile-card-value">{signatureText}</span>
              </div>
            ) : null}
            {resolvedSourceLabel ? (
              <div className="profile-card-row">
                <span className="profile-card-label">{"\u6765\u6e90"}</span>
                <span className="profile-card-value">{resolvedSourceLabel}</span>
              </div>
            ) : null}
            {detail?.addedAt ? (
              <div className="profile-card-row">
                <span className="profile-card-label">{"\u6dfb\u52a0\u65f6\u95f4"}</span>
                <span className="profile-card-value">{formatDate(detail.addedAt)}</span>
              </div>
            ) : null}
          </section>
        ) : null}

        {showWeChatActions && actionItems.length ? (
          <div className="profile-card-footer profile-card-footer-wechat">
            {actionItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`profile-card-tool${item.disabled ? " profile-card-tool-disabled" : ""}`}
                  disabled={item.disabled}
                  onClick={item.onClick}
                >
                  <span className="profile-card-tool-icon">
                    <Icon size={24} />
                  </span>
                  <span className="profile-card-tool-text">{item.label}</span>
                </button>
              );
            })}
          </div>
        ) : primaryAction ? (
          <div className="profile-card-footer">
            <button
              type="button"
              className={`profile-card-action${primaryAction.disabled ? " profile-card-action-disabled" : ""}`}
              disabled={primaryAction.disabled}
              onClick={() => {
                primaryAction.onClick();
                onClose();
              }}
            >
              <span className="profile-card-action-icon">{PrimaryIcon ? <PrimaryIcon size={18} /> : null}</span>
              <span className="profile-card-action-text">{primaryAction.label}</span>
            </button>
          </div>
        ) : null}
      </div>

      {contact && canEditContact ? (
        <ContactEditModal
          open={editOpen}
          contact={contact}
          onClose={() => setEditOpen(false)}
          onSave={(patch) => {
            onUpdateContact?.(contact.id, patch);
            setEditOpen(false);
          }}
          onUploadImage={onUploadImage!}
        />
      ) : null}
    </div>
  );
}

export default UserProfileCard;
