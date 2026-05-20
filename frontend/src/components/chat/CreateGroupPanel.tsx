import { Check, Search, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FriendItem } from "../../types/chat";
import Avatar from "../common/Avatar";

interface CreateGroupPanelProps {
  open: boolean;
  currentNickname: string;
  currentUsername: string;
  friends: FriendItem[];
  onClose: () => void;
  onCreate: (name: string, memberIds: string[]) => Promise<string>;
}

function buildDefaultGroupName(items: FriendItem[], currentNickname: string, currentUsername: string): string {
  const names = items.map((item) => item.remark || item.nickname).filter(Boolean);
  if (names.length === 0) {
    return `${currentNickname || currentUsername}的群聊`.slice(0, 64);
  }
  if (names.length <= 3) {
    return names.join("、").slice(0, 64);
  }
  return `${names.slice(0, 3).join("、")} 等${names.length}人`.slice(0, 64);
}

function CreateGroupPanel({
  open,
  currentNickname,
  currentUsername,
  friends,
  onClose,
  onCreate,
}: CreateGroupPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [keyword, setKeyword] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointer = (event: MouseEvent) => {
      if (panelRef.current?.contains(event.target as Node)) {
        return;
      }
      onClose();
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("mousedown", handlePointer);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointer);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setKeyword("");
    setGroupName("");
    setSelectedIds([]);
    setSubmitting(false);
  }, [open]);

  const filteredFriends = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) {
      return friends;
    }
    return friends.filter((friend) => {
      const label = `${friend.remark || friend.nickname} ${friend.username}`.toLowerCase();
      return label.includes(normalized);
    });
  }, [friends, keyword]);

  const selectedFriends = useMemo(
    () => friends.filter((friend) => selectedIds.includes(friend.friendId)),
    [friends, selectedIds],
  );

  const toggleFriend = (friendId: string) => {
    setSelectedIds((previous) =>
      previous.includes(friendId) ? previous.filter((item) => item !== friendId) : [...previous, friendId],
    );
  };

  const handleCreate = async () => {
    if (selectedFriends.length === 0 || submitting) {
      return;
    }

    const name = groupName.trim() || buildDefaultGroupName(selectedFriends, currentNickname, currentUsername);
    setSubmitting(true);
    try {
      const conversationId = await onCreate(name, selectedFriends.map((friend) => friend.friendId));
      if (conversationId) {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="add-friend-overlay">
      <div ref={panelRef} className="add-friend-panel group-create-panel">
        <div className="add-friend-header">
          <div className="add-friend-title">
            <strong>发起群聊</strong>
            <span>选择好友后创建真实群聊会话</span>
          </div>
          <button type="button" className="header-action add-friend-close" onClick={onClose} aria-label="关闭">
            <X size={14} />
          </button>
        </div>

        <label className="conversation-search add-friend-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="搜索好友昵称或账号"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </label>

        <label className="conversation-group-field group-create-name">
          <span>群名</span>
          <input
            type="text"
            value={groupName}
            maxLength={64}
            placeholder="不填则自动生成"
            onChange={(event) => setGroupName(event.target.value)}
          />
        </label>

        <div className="group-create-body">
          <div className="group-create-list">
            {filteredFriends.length > 0 ? (
              filteredFriends.map((friend) => {
                const selected = selectedIds.includes(friend.friendId);
                return (
                  <button
                    type="button"
                    key={friend.friendId}
                    className={`group-create-friend ${selected ? "group-create-friend-selected" : ""}`}
                    onClick={() => toggleFriend(friend.friendId)}
                  >
                    <Avatar name={friend.remark || friend.nickname} src={friend.avatar} />
                    <div className="group-create-friend-copy">
                      <strong>{friend.remark || friend.nickname}</strong>
                      <span>@{friend.username}</span>
                    </div>
                    <span className="group-create-check">{selected ? <Check size={14} /> : null}</span>
                  </button>
                );
              })
            ) : (
              <div className="add-friend-empty">没有找到可邀请的好友</div>
            )}
          </div>

          <div className="group-create-selected">
            <div className="group-create-selected-head">
              <strong>已选择成员</strong>
              <span>{selectedFriends.length} 人</span>
            </div>
            <div className="group-create-selected-list">
              {selectedFriends.length > 0 ? (
                selectedFriends.map((friend) => (
                  <button
                    type="button"
                    key={friend.friendId}
                    className="group-create-chip"
                    onClick={() => toggleFriend(friend.friendId)}
                  >
                    <Avatar name={friend.remark || friend.nickname} src={friend.avatar} size="sm" />
                    <span>{friend.remark || friend.nickname}</span>
                  </button>
                ))
              ) : (
                <div className="group-create-selected-empty">
                  <Users size={18} />
                  <span>至少选择 1 位好友</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="add-friend-actions">
          <button type="button" className="header-action add-friend-cancel" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="header-action header-action-primary add-friend-submit"
            disabled={submitting || selectedFriends.length === 0}
            onClick={() => void handleCreate()}
          >
            {submitting ? "创建中..." : "创建群聊"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateGroupPanel;
