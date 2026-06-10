import type { MouseEventHandler } from "react";
import { resolveMediaUrl } from "../../config/env";

interface AvatarProps {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg" | "xl";
  tone?: "default" | "active" | "soft";
  onClick?: MouseEventHandler<HTMLButtonElement>;
  title?: string;
}

function hashColor(name: string): string {
  const palette = ["#d4e7c5", "#f1d8b5", "#d7e6f5", "#e5d8f2", "#cfe9de", "#f4d2d2"];
  const normalized = name.trim() || "Guest";
  let hash = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    hash = normalized.charCodeAt(index) + ((hash << 5) - hash);
  }

  return palette[Math.abs(hash) % palette.length];
}

function initials(name: string): string {
  const normalized = name.trim();
  if (!normalized) {
    return "?";
  }
  return normalized.slice(0, 2).toUpperCase();
}

function Avatar({ name, src = "", size = "md", tone = "default", onClick, title }: AvatarProps) {
  const resolvedSrc = src ? resolveMediaUrl(src) : "";
  const content = <>{resolvedSrc ? <img className="avatar-image" src={resolvedSrc} alt="" /> : initials(name)}</>;

  if (onClick) {
    return (
      <button
        type="button"
        className={`avatar avatar-${size} avatar-${tone} avatar-button`}
        style={{ backgroundColor: hashColor(name) }}
        title={title}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`avatar avatar-${size} avatar-${tone}`}
      style={{ backgroundColor: hashColor(name) }}
      aria-hidden="true"
      title={title}
    >
      {content}
    </div>
  );
}

export default Avatar;
