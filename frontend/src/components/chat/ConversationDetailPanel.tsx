import { Camera, ChevronRight, LoaderCircle, Pencil, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { ChatMessage, Conversation, GroupConversationPayload } from "../../types/chat";
import { resolveApiUrl } from "../../config/env";
import { getToken } from "../../utils/auth";
import Avatar from "../common/Avatar";
import Switch from "../settings/Switch";
import FriendPickerModal from "./FriendPickerModal";

interface ConversationDetailPanelProps {
  token: string;
  conversation: Conversation;
  messages: ChatMessage[];
  groupConversation: GroupConversationPayload | null;
  onJumpToMessage: (messageId: string) => void;
  onToggleMuted: (next: boolean) => void;
  onTogglePinned: (next: boolean) => void;
  onClearMessages: () => void;
  onLeaveGroup: () => Promise<boolean>;
  onDismissGroup: () => Promise<boolean>;
  onUploadImage: (file: File) => Promise<string>;
  onUpdateGroupConversation: (
    conversationId: string,
    patch: {
      avatar?: string;
      name?: string;
      announcement?: string;
      remark?: string;
      myNickname?: string;
      isMuted?: boolean;
    },
  ) => Promise<GroupConversationPayload | null>;
  onUpdateGroupBotEnabled: (conversationId: string, botEnabled: boolean) => Promise<GroupConversationPayload | null>;
  onNotice: (title: string, content: string, level?: "info" | "success" | "warning" | "error") => void;
  onPreviewImage?: (url: string) => void;
}

interface EditableGroupFieldProps {
  label: string;
  value: string;
  placeholder: string;
  editable: boolean;
  multiline?: boolean;
  hint?: string;
  onSave: (value: string) => Promise<boolean>;
}

type GroupDangerAction = "leave" | "dismiss";

function memberSubtitle(conversation: Conversation, groupConversation: GroupConversationPayload | null): string {
  if (conversation.type === "private") {
    return conversation.targetUsername ? `账号：${conversation.targetUsername}` : "私聊会话";
  }
  if (conversation.type === "group") {
    return `${groupConversation?.memberCount || conversation.memberCount || 0} 人群聊`;
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

function EditableGroupField({
  label,
  value,
  placeholder,
  editable,
  multiline = false,
  hint,
  onSave,
}: EditableGroupFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) {
      setDraft(value);
    }
  }, [editing, value]);

  const cancel = () => {
    setDraft(value);
    setError("");
    setEditing(false);
  };

  const commit = async () => {
    if (!editable || saving) {
      setEditing(false);
      return;
    }

    const nextValue = draft.trim();
    const currentValue = value.trim();
    if (nextValue === currentValue) {
      setEditing(false);
      setError("");
      setDraft(value);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const ok = await onSave(nextValue);
      if (!ok) {
        setDraft(value);
        setError("保存失败，请稍后重试");
      }
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
      return;
    }
    if (!multiline && event.key === "Enter") {
      event.preventDefault();
      void commit();
      return;
    }
    if (multiline && event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void commit();
    }
  };

  const displayValue = value.trim() || placeholder;

  return (
    <div className={`conversation-profile-item ${editable ? "conversation-profile-item-editable" : ""}`}>
      <div className="conversation-profile-item-head">
        <span>{label}</span>
      </div>
      <div className="conversation-profile-item-body">
        {editing ? (
          multiline ? (
            <textarea
              autoFocus
              className="conversation-profile-item-editor conversation-profile-item-editor-textarea"
              value={draft}
              rows={3}
              maxLength={300}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => void commit()}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <input
              autoFocus
              className="conversation-profile-item-editor"
              value={draft}
              maxLength={64}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => void commit()}
              onKeyDown={handleKeyDown}
            />
          )
        ) : editable ? (
          <button
            type="button"
            className={`conversation-profile-item-value ${
              value.trim() ? "" : "conversation-profile-item-value-empty"
            }`}
            onClick={() => {
              setError("");
              setEditing(true);
            }}
          >
            {displayValue}
          </button>
        ) : (
          <div
            className={`conversation-profile-item-value ${
              value.trim() ? "" : "conversation-profile-item-value-empty"
            }`}
          >
            {displayValue}
          </div>
        )}
        <div className="conversation-profile-item-meta">
          {saving ? <LoaderCircle size={14} className="conversation-profile-item-loading" /> : null}
          {editable && !editing && !saving ? <Pencil size={14} className="conversation-profile-item-pen" /> : null}
        </div>
      </div>
      {hint ? <p className="conversation-profile-item-hint">{hint}</p> : null}
      {error ? <p className="conversation-profile-item-error">{error}</p> : null}
    </div>
  );
}

function ConversationDetailPanel({
  token,
  conversation,
  messages,
  groupConversation,
  onJumpToMessage,
  onToggleMuted,
  onTogglePinned,
  onClearMessages,
  onLeaveGroup,
  onDismissGroup,
  onUploadImage,
  onUpdateGroupConversation,
  onUpdateGroupBotEnabled,
  onNotice,
}: ConversationDetailPanelProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [dangerAction, setDangerAction] = useState<GroupDangerAction | null>(null);
  const [dangerPending, setDangerPending] = useState(false);
  const [dangerError, setDangerError] = useState("");
  const [summaryContent, setSummaryContent] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSearchOpen(false);
    setKeyword("");
    setShowAllMembers(false);
    setAvatarSaving(false);
    setAvatarError("");
    setDangerAction(null);
    setDangerPending(false);
    setDangerError("");
    setSummaryContent(null);
    setSummaryLoading(false);
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

  const isGroup = conversation.type === "group";
  const activeMuted = isGroup ? groupConversation?.isMuted ?? Boolean(conversation.muted) : Boolean(conversation.muted);
  const members = groupConversation?.members ?? [];
  const visibleMembers = showAllMembers ? members : members.slice(0, 8);
  const hasMoreMembers = members.length > visibleMembers.length;
  const canEditGroupProfile = Boolean(groupConversation?.canEditGroupProfile);
  const isGroupOwner = groupConversation?.myRole === "owner";
  const groupTitle = groupConversation?.name || conversation.title;
  const groupAnnouncement = groupConversation?.announcement || conversation.announcement || "";
  const groupBotEnabled = Boolean(groupConversation?.botEnabled);

  const saveGroupPatch = async (
    patch: {
      avatar?: string;
      name?: string;
      announcement?: string;
      remark?: string;
      myNickname?: string;
    },
  ) => {
    if (!isGroup || !groupConversation) {
      return false;
    }
    const updated = await onUpdateGroupConversation(conversation.id, patch);
    return Boolean(updated);
  };

  const handleAvatarChange = async (file: File) => {
    if (!isGroup || !groupConversation || !canEditGroupProfile) {
      return;
    }
    setAvatarSaving(true);
    setAvatarError("");
    try {
      const url = await onUploadImage(file);
      const updated = await onUpdateGroupConversation(conversation.id, { avatar: url });
      if (!updated) {
        setAvatarError("保存失败，请稍后重试");
      }
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : "上传失败，请稍后重试");
    } finally {
      setAvatarSaving(false);
    }
  };

  const confirmTitle = dangerAction === "dismiss" ? "解散群聊" : "退出群聊";
  const confirmDescription =
    dangerAction === "dismiss"
      ? "解散后该群聊和聊天记录将被删除，所有成员都无法继续访问。"
      : "退出后你将不再看到该群聊和聊天记录，其他成员不受影响。";
  const confirmActionLabel = dangerAction === "dismiss" ? "解散群聊" : "退出群聊";

  return (
    <aside className="conversation-detail-panel">
      <div className="conversation-detail-member">
        {isGroup ? (
          <div className="conversation-group-avatar-block">
            <button
              type="button"
              className={`conversation-group-avatar-trigger ${
                canEditGroupProfile ? "conversation-group-avatar-trigger-editable" : ""
              }`}
              disabled={!canEditGroupProfile || avatarSaving}
              onClick={() => avatarInputRef.current?.click()}
            >
              <Avatar name={groupTitle} src={groupConversation?.avatar || conversation.avatar || ""} size="xl" />
              {canEditGroupProfile ? (
                <span className="conversation-group-avatar-mask">
                  {avatarSaving ? (
                    <LoaderCircle size={16} className="conversation-profile-item-loading" />
                  ) : (
                    <Camera size={16} />
                  )}
                </span>
              ) : null}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }
                await handleAvatarChange(file);
                event.currentTarget.value = "";
              }}
            />
          </div>
        ) : (
          <Avatar
            name={conversation.targetName || conversation.title}
            src={conversation.targetAvatar || conversation.avatar}
            size="lg"
          />
        )}
        <div className="conversation-detail-member-copy">
          <strong>{isGroup ? groupTitle : conversation.targetName || conversation.title}</strong>
          <span>{memberSubtitle(conversation, groupConversation)}</span>
          {isGroup ? <p className="conversation-group-summary-text">{groupAnnouncement || "暂无群公告"}</p> : null}
          {avatarError ? <p className="conversation-profile-item-error">{avatarError}</p> : null}
        </div>
      </div>

      <div className="conversation-detail-scroll">
        {isGroup ? (
          <>
            <div className="conversation-group-section">
              <div className="conversation-group-section-head">
                <strong>群成员</strong>
                <span>{groupConversation?.memberCount || members.length} 人</span>
              </div>
              <div className="conversation-group-member-grid">
                {visibleMembers.map((member) => (
                  <div key={member.userId} className="conversation-group-member">
                    <Avatar name={member.groupNickname || member.nickname} src={member.avatar} size="sm" />
                    <span>{member.groupNickname || member.nickname}</span>
                    {member.role === "admin" ? <span className="member-role-badge">管理员</span> : null}
                    {member.mutedUntil ? <span className="member-muted-badge">禁言</span> : null}
                  </div>
                ))}
                <button type="button" className="conversation-group-member conversation-group-member-add" onClick={() => setShowFriendPicker(true)}>
                  <span className="conversation-group-member-add-icon">+</span>
                </button>
                {hasMoreMembers ? (
                  <button type="button" className="conversation-group-member conversation-group-member-more" onClick={() => setShowAllMembers(true)}>
                    <span>查看更多</span>
                  </button>
                ) : null}
              </div>
            </div>
            <div className="conversation-group-section">
              <div className="conversation-group-section-head">
                <strong>群资料</strong>
                <span>{isGroupOwner ? "群主" : groupConversation?.myRole === "admin" ? "管理员" : "群成员"}</span>
              </div>
              <div className="conversation-group-profile-list">
                <EditableGroupField label="群名称" value={groupTitle} placeholder="未设置群名称" editable={canEditGroupProfile} onSave={(value) => saveGroupPatch({ name: value || groupTitle })} />
                <EditableGroupField label="群公告" value={groupAnnouncement} placeholder="暂无群公告" editable={canEditGroupProfile} multiline onSave={(value) => saveGroupPatch({ announcement: value })} />
                <EditableGroupField label="备注" value={groupConversation?.remark || ""} placeholder="群聊的备注仅自己可见" editable onSave={(value) => saveGroupPatch({ remark: value })} />
                <EditableGroupField label="我在本群的昵称" value={groupConversation?.myNickname || ""} placeholder="未设置群昵称" editable onSave={(value) => saveGroupPatch({ myNickname: value })} />
              </div>
            </div>
          </>
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

        {isGroup ? (
          <button
            type="button"
            className="conversation-detail-row conversation-detail-row-button"
            disabled={summaryLoading}
            onClick={async () => {
              const token = getToken();
              const texts = messages.slice(-20).map((m) => `${m.senderName}: ${m.content}`);
              setSummaryLoading(true);
              try {
                const resp = await fetch(resolveApiUrl("/api/ai/summarize"), {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ texts }),
                });
                const data = await resp.json();
                if (resp.ok) {
                  setSummaryContent(data.summary || "暂无摘要");
                } else {
                  setSummaryContent(data.error || "摘要生成失败");
                }
              } catch {
                setSummaryContent("摘要请求失败");
              } finally {
                setSummaryLoading(false);
              }
            }}
          >
            <div className="conversation-detail-row-main">
              <strong>{summaryLoading ? "生成中..." : "生成未读摘要"}</strong>
            </div>
          </button>
        ) : null}

        {isGroup ? (
          <div className="conversation-detail-row">
            <div className="conversation-detail-row-main">
              <strong>群机器人</strong>
            </div>
            <Switch
              checked={groupBotEnabled}
              disabled={!isGroupOwner}
              onChange={async (next) => {
                await onUpdateGroupBotEnabled(conversation.id, next);
              }}
              label="群机器人"
            />
          </div>
        ) : null}

        <div className="conversation-detail-row">
          <div className="conversation-detail-row-main">
            <strong>消息免打扰</strong>
          </div>
          <Switch checked={activeMuted} onChange={onToggleMuted} label="消息免打扰" />
        </div>

        <div className="conversation-detail-row">
          <div className="conversation-detail-row-main">
            <strong>置顶聊天</strong>
          </div>
          <Switch checked={Boolean(conversation.pinned)} onChange={onTogglePinned} label="置顶聊天" />
        </div>

        <button
          type="button"
          className="conversation-detail-row conversation-detail-row-danger-center conversation-detail-danger"
          onClick={onClearMessages}
        >
          <div className="conversation-detail-row-main conversation-detail-row-main-centered">
            <strong>清空聊天记录</strong>
          </div>
        </button>

        {isGroup ? (
          <button
            type="button"
            className="conversation-detail-row conversation-detail-row-danger-center conversation-detail-danger"
            onClick={() => {
              setDangerError("");
              setDangerAction(isGroupOwner ? "dismiss" : "leave");
            }}
          >
            <div className="conversation-detail-row-main conversation-detail-row-main-centered">
              <strong>{isGroupOwner ? "解散群聊" : "退出群聊"}</strong>
            </div>
          </button>
        ) : null}
      </div>

      {dangerAction ? (
        <div className="conversation-danger-mask" onClick={() => (dangerPending ? undefined : setDangerAction(null))}>
          <div className="conversation-danger-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="conversation-danger-dialog-copy">
              <strong>{confirmTitle}</strong>
              <p>{confirmDescription}</p>
              {dangerError ? <span className="conversation-danger-dialog-error">{dangerError}</span> : null}
            </div>
            <div className="conversation-danger-dialog-actions">
              <button
                type="button"
                className="conversation-danger-dialog-button"
                disabled={dangerPending}
                onClick={() => {
                  if (dangerPending) {
                    return;
                  }
                  setDangerAction(null);
                  setDangerError("");
                }}
              >
                取消
              </button>
              <button
                type="button"
                className="conversation-danger-dialog-button conversation-danger-dialog-button-confirm"
                disabled={dangerPending}
                onClick={async () => {
                  setDangerPending(true);
                  setDangerError("");
                  try {
                    const ok = dangerAction === "dismiss" ? await onDismissGroup() : await onLeaveGroup();
                    if (ok) {
                      setDangerAction(null);
                    } else {
                      setDangerError("操作失败，请稍后重试");
                    }
                  } catch (error) {
                    setDangerError(error instanceof Error ? error.message : "操作失败，请稍后重试");
                  } finally {
                    setDangerPending(false);
                  }
                }}
              >
                {dangerPending ? "处理中..." : confirmActionLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {summaryContent !== null ? (
        <div className="conversation-danger-mask" onClick={() => setSummaryContent(null)}>
          <div className="conversation-danger-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="conversation-danger-dialog-copy">
              <strong>消息摘要</strong>
              <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{summaryContent}</p>
            </div>
            <div className="conversation-danger-dialog-actions">
              <button
                type="button"
                className="conversation-danger-dialog-button conversation-danger-dialog-button-confirm"
                onClick={() => setSummaryContent(null)}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showFriendPicker && isGroup && groupConversation ? (
        <FriendPickerModal
          token={token}
          conversationId={conversation.id}
          conversationName={groupTitle}
          currentMembers={members}
          onNotice={onNotice}
          onClose={() => setShowFriendPicker(false)}
          onInvited={() => {
            // Refresh group conversation to show new members
            if (onUpdateGroupConversation) {
              onUpdateGroupConversation(conversation.id, {});
            }
          }}
        />
      ) : null}
    </aside>
  );
}

export default ConversationDetailPanel;
