import { Search, Smile, Heart, MoreHorizontal, X, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface StickerItem {
  id: string;
  imageUrl: string;
}

interface EmojiPanelProps {
  onEmojiPick: (emoji: string) => void;
  onStickerSend: (sticker: StickerItem) => void;
  onStickerUpload?: (file: File) => Promise<void>;
  onStickerDelete?: (stickerId: string) => Promise<void>;
  favoriteStickers?: StickerItem[];
}

const EMOJI_CATEGORIES = [
  { name: "常用", emojis: ["😀", "😂", "🥰", "😎", "🤔", "😅", "😭", "😡", "🥳", "🤩", "😏", "🙄", "😴", "🤗", "🤡", "👻"] },
  { name: "表情", emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🫡", "🤐", "🤨", "😐", "😑", "😶", "🫥", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐"] },
  { name: "手势", emojis: ["👋", "🤚", "🖐️", "✋", "🖖", "🫱", "🫲", "🫳", "🫴", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "🫵", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "🫶", "👐", "🤲", "🤝", "🙏"] },
  { name: "人物", emojis: ["👶", "🧒", "👦", "👧", "🧑", "👱", "👨", "🧔", "👩", "🧓", "👴", "👵", "🙍", "🙎", "🙅", "🙆", "💁", "🙋", "🧏", "🙇", "🤦", "🤷", "👮", "🕵️", "💂", "🥷", "👷", "🫅", "🤴", "👸", "👳", "👲", "🧕", "🤵", "👰", "🤰", "🫃", "🤱", "👼"] },
  { name: "动物", emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞"] },
  { name: "食物", emojis: ["🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅", "🥔", "🍠", "🫘", "🥐", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳", "🧈"] },
];

function EmojiPanel({ onEmojiPick, onStickerSend, onStickerUpload, onStickerDelete, favoriteStickers = [] }: EmojiPanelProps) {
  const [activeTab, setActiveTab] = useState<"emoji" | "favorites">("emoji");
  const [searchQuery, setSearchQuery] = useState("");
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [deleteMode, setDeleteMode] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("recentEmojis");
    if (stored) {
      try {
        setRecentEmojis(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  const addRecentEmoji = useCallback((emoji: string) => {
    setRecentEmojis((prev) => {
      const filtered = prev.filter((e) => e !== emoji);
      const next = [emoji, ...filtered].slice(0, 16);
      localStorage.setItem("recentEmojis", JSON.stringify(next));
      return next;
    });
  }, []);

  const handleEmojiClick = (emoji: string) => {
    onEmojiPick(emoji);
    addRecentEmoji(emoji);
  };

  const handleStickerClick = (sticker: StickerItem) => {
    if (deleteMode === sticker.id) {
      onStickerDelete?.(sticker.id);
      setDeleteMode(null);
    } else {
      onStickerSend(sticker);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onStickerUpload) {
      await onStickerUpload(file);
    }
    event.target.value = "";
  };

  const filteredEmojis = searchQuery
    ? EMOJI_CATEGORIES.flatMap((cat) => cat.emojis).filter((emoji) => emoji.includes(searchQuery))
    : [];

  return (
    <div ref={panelRef} className="emoji-panel">
      <div className="emoji-panel-search">
        <Search size={14} />
        <input
          type="text"
          placeholder="搜索表情"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            className="emoji-search-clear"
            onClick={() => setSearchQuery("")}
          >
            <X size={12} />
          </button>
        )}
      </div>

      <div className="emoji-panel-content">
        {activeTab === "emoji" && (
          <>
            {searchQuery ? (
              <div className="emoji-grid">
                {filteredEmojis.map((emoji, i) => (
                  <button
                    key={`${emoji}-${i}`}
                    type="button"
                    className="emoji-item"
                    onClick={() => handleEmojiClick(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
                {filteredEmojis.length === 0 && (
                  <div className="emoji-empty">未找到匹配的表情</div>
                )}
              </div>
            ) : (
              <div className="emoji-categories">
                {recentEmojis.length > 0 && (
                  <div className="emoji-category">
                    <div className="emoji-category-title">最近使用</div>
                    <div className="emoji-grid">
                      {recentEmojis.map((emoji, i) => (
                        <button
                          key={`recent-${emoji}-${i}`}
                          type="button"
                          className="emoji-item"
                          onClick={() => handleEmojiClick(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {EMOJI_CATEGORIES.map((category) => (
                  <div key={category.name} className="emoji-category">
                    <div className="emoji-category-title">{category.name}</div>
                    <div className="emoji-grid">
                      {category.emojis.map((emoji, i) => (
                        <button
                          key={`${category.name}-${emoji}-${i}`}
                          type="button"
                          className="emoji-item"
                          onClick={() => handleEmojiClick(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "favorites" && (
          <div className="sticker-grid">
            {favoriteStickers.map((sticker) => (
              <div
                key={sticker.id}
                className={`sticker-item ${deleteMode === sticker.id ? "delete-mode" : ""}`}
                onClick={() => handleStickerClick(sticker)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setDeleteMode(deleteMode === sticker.id ? null : sticker.id);
                }}
              >
                <img src={sticker.imageUrl} alt="sticker" loading="lazy" />
                {deleteMode === sticker.id && (
                  <div className="sticker-delete-overlay">
                    <Trash2 size={16} />
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              className="sticker-add"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus size={24} />
            </button>
          </div>
        )}
      </div>

      <div className="emoji-panel-footer">
        <div className="emoji-panel-toolbar">
          <button
            type="button"
            className={`emoji-toolbar-btn ${activeTab === "emoji" ? "active" : ""}`}
            onClick={() => setActiveTab("emoji")}
          >
            <Smile size={16} />
          </button>
          <button
            type="button"
            className={`emoji-toolbar-btn ${activeTab === "favorites" ? "active" : ""}`}
            onClick={() => setActiveTab("favorites")}
          >
            <Heart size={16} />
          </button>
          <button type="button" className="emoji-toolbar-btn" title="更多">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />
    </div>
  );
}

export default EmojiPanel;
