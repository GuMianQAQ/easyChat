import { Image, MessageSquareText, Search, Star } from "lucide-react";
import { useState } from "react";
import type { FavoriteItem } from "../../types/chat";
import EmptyState from "../common/EmptyState";
import ImagePreviewModal from "../chat/ImagePreviewModal";

type FavoriteType = "all" | "image" | "chat";

const typeLabels: Record<FavoriteType, string> = {
  all: "全部收藏",
  image: "图片",
  chat: "聊天记录",
};

function favoriteSummary(item: FavoriteItem) {
  if (item.messageType === "image") {
    return "[图片]";
  }
  return item.content;
}

function FavoritesList({
  favorites,
  allCount,
  imageCount,
  activeType,
  keyword,
  onTypeChange,
  onKeywordChange,
}: {
  favorites: FavoriteItem[];
  allCount: number;
  imageCount: number;
  activeType: FavoriteType;
  keyword: string;
  onTypeChange: (value: FavoriteType) => void;
  onKeywordChange: (value: string) => void;
}) {
  const navItems: Array<{ key: FavoriteType; label: string; count: number; icon: typeof Star }> = [
    { key: "all", label: "全部收藏", count: allCount, icon: Star },
    { key: "image", label: "图片", count: imageCount, icon: Image },
    { key: "chat", label: "聊天记录", count: allCount, icon: MessageSquareText },
  ];

  return (
    <div className="favorites-sidebar">
      <label className="conversation-search">
        <Search size={16} />
        <input
          type="text"
          placeholder="搜索收藏"
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
        />
      </label>

      <nav className="favorite-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              className={`favorite-nav-item ${activeType === item.key ? "active" : ""}`}
              onClick={() => onTypeChange(item.key)}
            >
              <Icon size={17} />
              <span>{item.label}</span>
              <em>{item.count}</em>
            </button>
          );
        })}
      </nav>

      <div className="simple-list favorite-sidebar-preview">
        {favorites.slice(0, 8).map((item) => (
          <div key={item.id} className="simple-list-item simple-list-item-static">
            <div className="simple-list-copy">
              <strong>{item.senderName}</strong>
              <span>{favoriteSummary(item)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FavoritesDetail({
  favorites,
  activeType,
  onRemove,
  onOpen,
}: {
  favorites: FavoriteItem[];
  activeType: FavoriteType;
  onRemove: (id: string) => void;
  onOpen: (item: FavoriteItem) => void;
}) {
  const [previewImage, setPreviewImage] = useState("");

  return (
    <>
      <div className="panel-scroll favorites-content">
        <header className="favorites-header">
          <strong>{typeLabels[activeType]}</strong>
          <span>{favorites.length} 条</span>
        </header>

        {favorites.length === 0 ? (
          <EmptyState icon={Star} title="暂无收藏" />
        ) : (
          <div className="favorite-list">
            {favorites.map((item) => (
              <article key={item.id} className="favorite-card" onClick={() => onOpen(item)}>
                <div className="favorite-card-main">
                  <div className="favorite-card-head">
                    <strong>{item.senderName}</strong>
                    <span>{item.messageCreatedAt.slice(0, 16)}</span>
                  </div>

                  {item.messageType === "image" ? (
                    <img
                      className="favorite-image"
                      src={item.content}
                      alt="收藏图片"
                      onClick={(event) => {
                        event.stopPropagation();
                        setPreviewImage(item.content);
                      }}
                    />
                  ) : (
                    <p className="favorite-text">{item.content}</p>
                  )}

                  {item.quoteContent ? (
                    <p className="favorite-quote">
                      引用：{item.quoteMessageType === "image" ? "[图片]" : item.quoteContent}
                    </p>
                  ) : null}

                  <div className="favorite-meta">
                    <span>{item.conversationName}</span>
                    <span>收藏于 {item.createdAt.slice(0, 16)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="favorite-remove"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(item.id);
                  }}
                >
                  取消收藏
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      <ImagePreviewModal open={Boolean(previewImage)} src={previewImage} onClose={() => setPreviewImage("")} />
    </>
  );
}

const FavoritesView = {
  List: FavoritesList,
  Detail: FavoritesDetail,
};

export default FavoritesView;
