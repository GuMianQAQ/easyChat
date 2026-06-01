import { MoreHorizontal, LayoutGrid } from "lucide-react";
import { useState } from "react";
import type { Conversation } from "../../types/chat";
import GroupFeatureMenu from "./GroupFeatureMenu";

interface ChatHeaderProps {
  conversation: Conversation;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onOpenFeature: (feature: string) => void;
}

function ChatHeader({ conversation, menuOpen, onToggleMenu, onOpenFeature }: ChatHeaderProps) {
  const [featureMenuOpen, setFeatureMenuOpen] = useState(false);

  return (
    <header className="chat-header">
      <div className="chat-header-copy">
        <strong>
          {conversation.title}
          {conversation.type === "group" && conversation.memberCount
            ? `（${conversation.memberCount}）`
            : ""}
        </strong>
      </div>
      <div className="chat-header-actions">
        {conversation.type === "group" ? (
          <div
            className="header-feature-menu-wrap"
            onMouseEnter={() => setFeatureMenuOpen(true)}
            onMouseLeave={() => setFeatureMenuOpen(false)}
          >
            <button
              type="button"
              className="header-icon-button"
              aria-label="群功能"
            >
              <LayoutGrid size={18} />
            </button>
            {featureMenuOpen ? (
              <GroupFeatureMenu onSelect={(feature) => {
                setFeatureMenuOpen(false);
                onOpenFeature(feature);
              }} />
            ) : null}
          </div>
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
