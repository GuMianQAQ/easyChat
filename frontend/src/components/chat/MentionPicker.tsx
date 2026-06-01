import { useEffect, useMemo, useRef, useState } from "react";
import type { GroupMemberItem } from "../../types/chat";
import Avatar from "../common/Avatar";

interface MentionPickerProps {
  members: GroupMemberItem[];
  keyword: string;
  onSelect: (member: GroupMemberItem) => void;
  onClose: () => void;
}

export default function MentionPicker({ members, keyword, onSelect, onClose }: MentionPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const kw = keyword.toLowerCase();
    if (!kw) return members;
    return members.filter(
      (m) =>
        m.nickname.toLowerCase().includes(kw) ||
        m.groupNickname.toLowerCase().includes(kw) ||
        m.username.toLowerCase().includes(kw),
    );
  }, [members, keyword]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [keyword]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filtered, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    const item = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (filtered.length === 0) {
    return null;
  }

  return (
    <div className="mention-picker" ref={listRef}>
      {filtered.map((member, index) => (
        <div
          key={member.userId}
          className={`mention-picker-item ${index === selectedIndex ? "mention-picker-item-active" : ""}`}
          onClick={() => onSelect(member)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <Avatar name={member.groupNickname || member.nickname} src={member.avatar} size="sm" />
          <span className="mention-picker-name">{member.groupNickname || member.nickname}</span>
          {member.role === "owner" && <span className="mention-picker-role">群主</span>}
          {member.role === "admin" && <span className="mention-picker-role">管理员</span>}
        </div>
      ))}
    </div>
  );
}
