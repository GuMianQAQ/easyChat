import { ChevronRight, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ChatMessage, Conversation, GroupConversationPayload } from "../../types/chat";
import Avatar from "../common/Avatar";
import Switch from "../settings/Switch";

interface ConversationDetailPanelProps {
  conversation: Conversation;
  messages: ChatMessage[];
  groupConversation: GroupConversationPayload | null;
  onJumpToMessage: (messageId: string) => void;
  onToggleMuted: (next: boolean) => void;
  onTogglePinned: (next: boolean) => void;
  onClearMessages: () => void;
  onUpdateGroupConversation: (
    conversationId: string,
    patch: {
      name?: string;
      announcement?: string;
      myNickname?: string;
      isMuted?: boolean;
    },
  ) => Promise<GroupConversationPayload | null>;
}

function memberSubtitle(conversation: Conversation): string {
  if (conversation.type === "private") {
    return conversation.targetUsername ? `账号：${conversation.targetUsername}` : "私聊会话";
  }
  if (conversation.type === "group") {
    return "群聊会话";
  }
  return "系统通知";
}

function resultExcerpt(message: ChatMessage): string {
  if (message.messageType === "image") {
    return "[图片]";
  }
  if (message.messageType === "file") {
    return "[文件]";
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
  groupConversation,
  onJumpToMessage,
  onToggleMuted,
  onTogglePinned,
  onClearMessages,
  onUpdateGroupConversation,
}: ConversationDetailPanelProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [groupName, setGroupName] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [myNickname, setMyNickname] = useState("");
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSearchOpen(false);
    setKeyword("");
    setShowAllMembers(false);
    setSaving(false);
  }, [conversation.id]);

  useEffect(() => {
    if (conversation.type !== "group") {
      setGroupName("");
      setAnnouncement("");
      setMyNickname("");
      return;
    }
    setGroupName(groupConversation?.name || conversation.title);
    setAnnouncement(groupConversation?.announcement || conversation.announcement || "");
    setMyNickname(groupConversation?.myNickname || "");
  }, [conversation.announcement, conversation.title, conversation.type, groupConversation]);

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

  const isGroup = conversation.type === "group";
  const activeMuted = isGroup ? groupConversation?.isMuted ?? Boolean(conversation.muted) : Boolean(conversation.muted);
  const members = groupConversation?.members ?? [];
  const visibleMembers = showAllMembers ? members : members.slice(0, 8);
  const hasMoreMembers = members.length > visibleMembers.length;

  const saveGroupSettings = async () => {
    if (!isGroup || !groupConversation) {
      return;
    }

    const nextPatch: {
      name?: string;
      announcement?: string;
      myNickname?: string;
    } = {};
    const nextName = groupName.trim();
    const nextAnnouncement = announcement.trim();
    const nextMyNickname = myNickname.trim();

    if (nextName !== (groupConversation.name || conversation.title)) {
      nextPatch.name = nextName;
    }
    if (nextAnnouncement !== (groupConversation.announcement || conversation.announcement || "")) {
      nextPatch.announcement = nextAnnouncement;
    }
    if (nextMyNickname !== (groupConversation.myNickname || "")) {
      nextPatch.myNickname = nextMyNickname;
    }

    if (Object.keys(nextPatch).length === 0) {
      return;
    }

    setSaving(true);
    try {
      const updated = await onUpdateGroupConversation(conversation.id, nextPatch);
      if (updated) {
        setGroupName(updated.name || conversation.title);
        setAnnouncement(updated.announcement || "");
        setMyNickname(updated.myNickname || "");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="conversation-detail-panel">
      <div className="conversation-detail-member">
        <Avatar
          name={isGroup ? conversation.title : conversation.targetName || conversation.title}
          src={
            isGroup
              ? groupConversation?.avatar || conversation.avatar || ""
              : conversation.targetAvatar || conversation.avatar
          }
          size="lg"
        />
        <div className="conversation-detail-member-copy">
          <strong>{isGroup ? conversation.title : conversation.targetName || conversation.title}</strong>
          <span>{memberSubtitle(conversation)}</span>
        </div>
      </div>

      {isGroup ? (
        <div className="conversation-group-section">
          <div className="conversation-group-member-grid">
            {visibleMembers.map((member) => (
              <div key={member.userId} className="conversation-group-member">
                <Avatar name={member.groupNickname || member.nickname} src={member.avatar} size="sm" />
                <span>{member.groupNickname || member.nickname}</span>
              </div>
            ))}
            {hasMoreMembers ? (
              <button
                type="button"
                className="conversation-group-member conversation-group-member-more"
                onClick={() => setShowAllMembers(true)}
              >
                <span>查看更多</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {isGroup ? (
        <div className="conversation-group-form">
          <label className="conversation-group-field">
            <span>群名称</span>
            <input
              type="text"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              maxLength={64}
            />
          </label>
          <label className="conversation-group-field">
            <span>群公告</span>
            <textarea
              value={announcement}
              onChange={(event) => setAnnouncement(event.target.value)}
              maxLength={300}
              rows={3}
            />
          </label>
          <label className="conversation-group-field">
            <span>我在本群的昵称</span>
            <input
              type="text"
              value={myNickname}
              onChange={(event) => setMyNickname(event.target.value)}
              maxLength={64}
            />
          </label>
          <div className="conversation-group-field conversation-group-field-inline">
            <span>消息免打扰</span>
            <Switch checked={activeMuted} onChange={onToggleMuted} label="消息免打扰" />
          </div>
          <button
            type="button"
            className="header-action header-action-primary conversation-group-save"
            disabled={saving || !groupConversation}
            onClick={() => void saveGroupSettings()}
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      ) : null}

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

      {!isGroup ? (
        <div className="conversation-detail-row">
          <div className="conversation-detail-row-main">
            <strong>消息免打扰</strong>
          </div>
          <Switch checked={Boolean(conversation.muted)} onChange={onToggleMuted} label="消息免打扰" />
        </div>
      ) : null}

      <div className="conversation-detail-row">
        <div className="conversation-detail-row-main">
          <strong>置顶聊天</strong>
        </div>
        <Switch checked={Boolean(conversation.pinned)} onChange={onTogglePinned} label="置顶聊天" />
      </div>

      <button type="button" className="conversation-detail-row conversation-detail-danger" onClick={onClearMessages}>
        <div className="conversation-detail-row-main">
          <strong>清空聊天记录</strong>
        </div>
        <Trash2 size={16} />
      </button>
    </aside>
  );
}

export default ConversationDetailPanel;
