import { ChevronRight, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ChatMessage, Conversation } from "../../types/chat";
import Avatar from "../common/Avatar";
import Switch from "../settings/Switch";

interface ConversationDetailPanelProps {
  conversation: Conversation;
  messages: ChatMessage[];
  onJumpToMessage: (messageId: string) => void;
  onToggleMuted: (next: boolean) => void;
  onTogglePinned: (next: boolean) => void;
  onClearMessages: () => void;
}

function memberSubtitle(conversation: Conversation): string {
  if (conversation.type === "private") {
    return conversation.targetUsername ? `账号：${conversation.targetUsername}` : "私聊会话";
  }
  if (conversation.type === "public") {
    return "公共聊天室";
  }
  return "系统通知";
}

function resultExcerpt(message: ChatMessage): string {
  if (message.messageType === "image") {
    return "[图片]";
  }
  return message.content;
}

function matchesMessage(message: ChatMessage, keyword: string): boolean {
  const content = resultExcerpt(message).toLowerCase();
  if (content.includes(keyword)) {
    return true;
  }
  return Boolean(message.quote?.content.toLowerCase().includes(keyword));
}

function ConversationDetailPanel({
  conversation,
  messages,
  onJumpToMessage,
  onToggleMuted,
  onTogglePinned,
  onClearMessages,
}: ConversationDetailPanelProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    setSearchOpen(false);
    setKeyword("");
  }, [conversation.id]);

  const searchResults = useMemo(() => {
    const nextKeyword = keyword.trim().toLowerCase();
    if (!nextKeyword) {
      return [];
    }
    return messages
      .filter((message) => message.type === "chat")
      .filter((message) => matchesMessage(message, nextKeyword))
      .slice(-20)
      .reverse();
  }, [keyword, messages]);

  const displayName =
    conversation.type === "private" ? conversation.targetName || conversation.title : conversation.title;
  const avatarName = conversation.type === "private" ? displayName : conversation.title;
  const avatarSrc =
    conversation.type === "private" ? conversation.targetAvatar || conversation.avatar : conversation.avatar;

  return (
    <aside className="conversation-detail-panel">
      <div className="conversation-detail-member">
        <Avatar name={avatarName} src={avatarSrc} size="lg" />
        <div className="conversation-detail-member-copy">
          <strong>{displayName}</strong>
          <span>{memberSubtitle(conversation)}</span>
        </div>
      </div>

      <button
        type="button"
        className={`conversation-detail-row conversation-detail-row-button ${
          searchOpen ? "conversation-detail-row-active" : ""
        }`}
        onClick={() => setSearchOpen((open) => !open)}
      >
        <div className="conversation-detail-row-main">
          <strong>查找聊天内容</strong>
        </div>
        <ChevronRight size={16} />
      </button>

      {searchOpen ? (
        <div className="conversation-search-panel">
          <label className="conversation-detail-search">
            <Search size={15} />
            <input
              type="text"
              value={keyword}
              placeholder="搜索当前会话"
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>
          {keyword.trim() ? (
            searchResults.length > 0 ? (
              <div className="conversation-search-results">
                {searchResults.map((message) => (
                  <button
                    key={message.id}
                    type="button"
                    className="conversation-search-result"
                    onClick={() => onJumpToMessage(message.id)}
                  >
                    <div className="conversation-search-result-head">
                      <strong>{message.senderName}</strong>
                      <span>{message.createdAt.slice(11, 16)}</span>
                    </div>
                    <span>{resultExcerpt(message)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="conversation-search-empty">没有找到相关聊天记录</div>
            )
          ) : null}
        </div>
      ) : null}

      <div className="conversation-detail-row">
        <div className="conversation-detail-row-main">
          <strong>消息免打扰</strong>
        </div>
        <Switch checked={Boolean(conversation.muted)} onChange={onToggleMuted} label="消息免打扰" />
      </div>

      <div className="conversation-detail-row">
        <div className="conversation-detail-row-main">
          <strong>置顶聊天</strong>
        </div>
        <Switch checked={Boolean(conversation.pinned)} onChange={onTogglePinned} label="置顶聊天" />
      </div>

      <button
        type="button"
        className="conversation-detail-row conversation-detail-danger"
        onClick={onClearMessages}
      >
        <div className="conversation-detail-row-main">
          <strong>删除聊天记录</strong>
        </div>
        <Trash2 size={16} />
      </button>
    </aside>
  );
}

export default ConversationDetailPanel;
