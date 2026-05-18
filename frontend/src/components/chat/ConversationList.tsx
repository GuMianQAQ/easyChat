import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Conversation } from "../../types/chat";
import Avatar from "../common/Avatar";
import ConversationContextMenu, { type ConversationContextMenuAction } from "./ConversationContextMenu";

interface ConversationListProps {
  items: Conversation[];
  activeConversationId: string;
  onConversationChange: (conversationId: string) => void;
  onOpenAddFriend: () => void;
  onTogglePinned: (conversation: Conversation, next: boolean) => void;
  onMarkRead: (conversation: Conversation) => void;
  onToggleMuted: (conversation: Conversation, next: boolean) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  onHideConversation: (conversation: Conversation) => void;
}

interface ContextMenuState {
  conversation: Conversation;
  x: number;
  y: number;
}

function ConversationList({
  items,
  activeConversationId,
  onConversationChange,
  onOpenAddFriend,
  onTogglePinned,
  onMarkRead,
  onToggleMuted,
  onDeleteConversation,
  onHideConversation,
}: ConversationListProps) {
  const [keyword, setKeyword] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const filteredItems = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) {
      return items;
    }
    return items.filter((item) => {
      if (item.title.toLowerCase().includes(normalized)) {
        return true;
      }
      return Boolean(item.lastMessage?.toLowerCase().includes(normalized));
    });
  }, [items, keyword]);

  useEffect(() => {
    setContextMenu(null);
  }, [activeConversationId, items.length]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }
      setContextMenu(null);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };
    const close = () => setContextMenu(null);
    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", close, true);
    };
  }, []);

  const buildContextActions = (conversation: Conversation): ConversationContextMenuAction[] => [
    {
      key: "pin",
      label: conversation.pinned ? "取消置顶" : "置顶",
      onClick: () => {
        onTogglePinned(conversation, !conversation.pinned);
        setContextMenu(null);
      },
    },
    {
      key: "read",
      label: "标为已读",
      onClick: () => {
        onMarkRead(conversation);
        setContextMenu(null);
      },
    },
    {
      key: "mute",
      label: conversation.muted ? "允许消息通知" : "消息免打扰",
      onClick: () => {
        onToggleMuted(conversation, !conversation.muted);
        setContextMenu(null);
      },
    },
    {
      key: "delete",
      label: "删除聊天",
      separated: true,
      danger: true,
      onClick: () => {
        onDeleteConversation(conversation);
        setContextMenu(null);
      },
    },
    {
      key: "hide",
      label: "不显示",
      onClick: () => {
        onHideConversation(conversation);
        setContextMenu(null);
      },
    },
  ];

  const placeMenu = (clientX: number, clientY: number) => {
    const menuWidth = 188;
    const menuHeight = 220;
    const gap = 10;
    const x = Math.min(clientX, window.innerWidth - menuWidth - gap);
    const y = Math.min(clientY, window.innerHeight - menuHeight - gap);
    return { x: Math.max(gap, x), y: Math.max(gap, y) };
  };

  return (
    <div className="conversation-panel">
      <div className="conversation-toolbar">
        <label className="conversation-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="搜索"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </label>
        <button type="button" className="conversation-plus" onClick={onOpenAddFriend}>
          <Plus size={14} />
        </button>
      </div>

      <div className="conversation-items">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`conversation-item ${item.muted ? "conversation-item-muted" : ""} ${
              activeConversationId === item.id ? "conversation-item-active" : ""
            }`}
            onClick={() => onConversationChange(item.id)}
            onContextMenu={(event) => {
              event.preventDefault();
              const { x, y } = placeMenu(event.clientX, event.clientY);
              setContextMenu({
                conversation: item,
                x,
                y,
              });
            }}
          >
            <Avatar name={item.title} src={item.avatar} />
            <div className="conversation-content">
              <div className="conversation-line">
                <strong>{item.title}</strong>
                <span>{item.lastMessageTime?.slice(11, 16) || ""}</span>
              </div>
              <div className="conversation-line conversation-preview">
                <span>{item.lastMessage || "暂无消息"}</span>
                {item.unreadCount > 0 ? <em>{item.unreadCount > 99 ? "99+" : item.unreadCount}</em> : null}
              </div>
            </div>
          </button>
        ))}
      </div>

      {contextMenu ? (
        <div ref={menuRef}>
          <ConversationContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            actions={buildContextActions(contextMenu.conversation)}
          />
        </div>
      ) : null}
    </div>
  );
}

export default ConversationList;
