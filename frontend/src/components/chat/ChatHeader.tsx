import { MoreHorizontal } from "lucide-react";
import type { ConnectionStatus, Conversation } from "../../types/chat";
import StatusDot from "../common/StatusDot";

interface ChatHeaderProps {
  conversation: Conversation;
  onlineCount: number;
  status: ConnectionStatus;
  menuOpen: boolean;
  onDisconnect: () => void;
  onReconnect: () => void;
  onToggleMenu: () => void;
}

function ChatHeader({
  conversation,
  onlineCount,
  status,
  menuOpen,
  onDisconnect,
  onReconnect,
  onToggleMenu,
}: ChatHeaderProps) {
  return (
    <header className="chat-header">
      <div className="chat-header-copy">
        <strong>{conversation.title}</strong>
      </div>
      <div className="chat-header-actions">
        {conversation.type === "public" ? <span className="header-meta">在线 {onlineCount} 人</span> : null}
        <StatusDot status={status} />
        {status === "connected" ? (
          <button type="button" className="header-action" onClick={onDisconnect}>
            断开连接
          </button>
        ) : (
          <button
            type="button"
            className="header-action header-action-primary"
            onClick={onReconnect}
          >
            重新连接
          </button>
        )}
        <button
          type="button"
          className={`header-icon-button ${menuOpen ? "header-icon-button-active" : ""}`}
          aria-label="会话菜单"
          onClick={onToggleMenu}
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
    </header>
  );
}

export default ChatHeader;
