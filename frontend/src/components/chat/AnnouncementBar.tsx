import { useState } from "react";
import { ChevronDown, ChevronUp, Megaphone } from "lucide-react";

interface AnnouncementBarProps {
  announcement: string;
  onUpdate?: () => void;
}

export default function AnnouncementBar({ announcement, onUpdate }: AnnouncementBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!announcement || dismissed) {
    return null;
  }

  const isLong = announcement.length > 80;
  const displayText = !expanded && isLong ? announcement.slice(0, 80) + "..." : announcement;

  return (
    <div className="announcement-bar">
      <div className="announcement-icon">
        <Megaphone size={14} />
      </div>
      <div className="announcement-content">
        <span className="announcement-text">{displayText}</span>
        {isLong && (
          <button
            type="button"
            className="announcement-toggle"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? "收起" : "展开"}
          </button>
        )}
      </div>
      <button
        type="button"
        className="announcement-close"
        onClick={() => setDismissed(true)}
        title="关闭公告"
      >
        ×
      </button>
      {onUpdate && (
        <button
          type="button"
          className="announcement-update-hint"
          onClick={onUpdate}
        >
          公告已更新
        </button>
      )}
    </div>
  );
}
