import type { MouseEvent } from "react";

const EMOJIS = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "😂",
  "🙂",
  "😊",
  "😍",
  "😘",
  "😎",
  "🤔",
  "😐",
  "😭",
  "😡",
  "👍",
  "👎",
  "👏",
  "🙏",
  "💪",
  "🎉",
  "❤️",
  "💔",
  "🔥",
  "⭐",
  "🌙",
  "☀️",
  "🍀",
];

interface EmojiPickerProps {
  onPick: (emoji: string, event: MouseEvent<HTMLButtonElement>) => void;
}

function EmojiPicker({ onPick }: EmojiPickerProps) {
  return (
    <div className="emoji-picker" role="dialog" aria-label="表情选择器">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="emoji-picker-item"
          aria-label={emoji}
          onClick={(event) => onPick(emoji, event)}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export default EmojiPicker;
