import type { LucideIcon } from "lucide-react";

interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  badgeCount?: number;
  onClick: () => void;
}

function IconButton({ icon: Icon, label, active = false, badgeCount = 0, onClick }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-button ${active ? "icon-button-active" : ""}`}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Icon size={20} strokeWidth={1.85} />
      {badgeCount > 0 ? <span className="icon-button-badge">{badgeCount > 99 ? "99+" : badgeCount}</span> : null}
    </button>
  );
}

export default IconButton;
