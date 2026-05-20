import { MoreHorizontal } from "lucide-react";
import type { Conversation } from "../../types/chat";

interface ChatHeaderProps {
  conversation: Conversation;
  menuOpen: boolean;
  onToggleMenu: () => void;
}

function ChatHeader({ conversation, menuOpen, onToggleMenu }: ChatHeaderProps) {
  return (
    <header className="chat-header">
      <div className="chat-header-copy">
        <strong>{conversation.title}</strong>
      </div>
      <div className="chat-header-actions">
        {conversation.type === "group" ? (
          <span className="header-meta">
            {conversation.memberCount ? `${conversation.memberCount} 人` : "群聊"}
          </span>
        ) : null}
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
