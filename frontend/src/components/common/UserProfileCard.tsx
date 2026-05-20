import { useEffect, useRef } from "react";
import type { UserProfile } from "../../types/chat";
import Avatar from "./Avatar";

interface UserProfileCardProps {
  profile: UserProfile;
  anchor: { x: number; y: number };
  onClose: () => void;
  onOpenSettings?: () => void;
  onOpenChat?: (profile: UserProfile) => void;
  onSendRequest?: (profile: UserProfile) => void;
  onOpenAvatarPreview?: (src: string) => void;
}

function UserProfileCard({
  profile,
  anchor,
  onClose,
  onOpenSettings,
  onOpenChat,
  onSendRequest,
  onOpenAvatarPreview,
}: UserProfileCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointer = (event: MouseEvent) => {
      if (ref.current?.contains(event.target as Node)) {
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

  const primaryAction = profile.isSelf
    ? {
        label: "查看资料",
        disabled: false,
        onClick: () => onOpenSettings?.(),
      }
    : profile.isFriend || profile.requestStatus === "accepted"
      ? {
          label: "发消息",
          disabled: false,
          onClick: () => onOpenChat?.(profile),
        }
      : profile.requestStatus === "pending"
        ? {
            label: "已申请",
            disabled: true,
            onClick: () => undefined,
          }
        : profile.requestStatus === "received"
          ? {
              label: "通过申请",
              disabled: false,
              onClick: () => onSendRequest?.(profile),
            }
          : !profile.allowFriendRequest
            ? {
                label: "无法添加",
                disabled: true,
                onClick: () => undefined,
              }
            : {
                label: "添加到通讯录",
                disabled: false,
                onClick: () => onSendRequest?.(profile),
              };

  return (
    <div
      ref={ref}
      className="profile-card"
      style={{
        left: Math.min(anchor.x, window.innerWidth - 300),
        top: Math.min(anchor.y, window.innerHeight - 220),
      }}
    >
      <div className="profile-card-header">
        <Avatar
          name={profile.nickname}
          src={profile.avatar}
          size="lg"
          onClick={() => {
            if (profile.avatar) {
              onOpenAvatarPreview?.(profile.avatar);
            }
          }}
          title={profile.avatar ? "查看大图" : undefined}
        />
        <div className="profile-card-copy">
          <strong>{profile.nickname}</strong>
          <span>{profile.username}</span>
          {profile.region ? <em>{profile.region}</em> : null}
          {profile.signature ? <em>{profile.signature}</em> : null}
        </div>
      </div>
      <div className="profile-card-actions">
        <button
          type="button"
          className="header-action header-action-primary"
          disabled={primaryAction.disabled}
          onClick={() => {
            primaryAction.onClick();
            onClose();
          }}
        >
          {primaryAction.label}
        </button>
      </div>
    </div>
  );
}

export default UserProfileCard;
