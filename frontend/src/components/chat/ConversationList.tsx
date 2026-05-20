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
  onOpenCreateGroup: () => void;
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
  onOpenCreateGroup,
  onTogglePinned,
  onMarkRead,
  onToggleMuted,
  onDeleteConversation,
  onHideConversation,
}: ConversationListProps) {
  const [keyword, setKeyword] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const plusButtonRef = useRef<HTMLButtonElement | null>(null);
  const plusMenuRef = useRef<HTMLDivElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

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
    setPlusMenuOpen(false);
  }, [activeConversationId, items.length]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        contextMenuRef.current?.contains(target) ||
        plusMenuRef.current?.contains(target) ||
        plusButtonRef.current?.contains(target)
      ) {
        return;
      }
      setContextMenu(null);
      setPlusMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
        setPlusMenuOpen(false);
      }
    };

    const closeMenus = () => {
      setContextMenu(null);
      setPlusMenuOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", closeMenus, true);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", closeMenus, true);
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
      label: "删除会话",
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
        <div className="conversation-toolbar-actions">
          <button
            ref={plusButtonRef}
            type="button"
            className="conversation-plus"
            aria-expanded={plusMenuOpen}
            aria-haspopup="menu"
            onClick={() => {
              setContextMenu(null);
              setPlusMenuOpen((current) => !current);
            }}
          >
            <Plus size={14} />
          </button>
          {plusMenuOpen ? (
            <div ref={plusMenuRef} className="conversation-plus-menu" role="menu" aria-label="会话操作">
              <button
                type="button"
                className="conversation-plus-menu-item"
                onClick={() => {
                  setPlusMenuOpen(false);
                  onOpenAddFriend();
                }}
              >
                添加好友
              </button>
              <button
                type="button"
                className="conversation-plus-menu-item"
                onClick={() => {
                  setPlusMenuOpen(false);
                  onOpenCreateGroup();
                }}
              >
                发起群聊
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="conversation-items">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`conversation-item ${item.pinned ? "conversation-item-pinned" : ""} ${item.muted ? "conversation-item-muted" : ""} ${
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
                {item.unreadCount > 0 ? (
                  <em className={item.muted ? "conversation-preview-badge-muted" : ""}>
                    {item.unreadCount > 99 ? "99+" : item.unreadCount}
                  </em>
                ) : null}
              </div>
            </div>
          </button>
        ))}
      </div>

      {contextMenu ? (
        <div ref={contextMenuRef}>
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
