import { FileText, Image, Vote, Link, Pin } from "lucide-react";

interface GroupFeatureMenuProps {
  onSelect: (feature: string) => void;
}

const FEATURES = [
  { key: "pinned", label: "群精华", icon: Pin },
  { key: "files", label: "群文件", icon: FileText },
  { key: "album", label: "群相册", icon: Image },
  { key: "vote", label: "群投票", icon: Vote },
  { key: "solitaire", label: "群接龙", icon: Link },
];

export default function GroupFeatureMenu({ onSelect }: GroupFeatureMenuProps) {
  return (
    <div className="group-feature-menu">
      {FEATURES.map((feature) => (
        <button
          key={feature.key}
          type="button"
          className="group-feature-item"
          onClick={() => onSelect(feature.key)}
        >
          <feature.icon size={20} />
          <span>{feature.label}</span>
        </button>
      ))}
    </div>
  );
}
