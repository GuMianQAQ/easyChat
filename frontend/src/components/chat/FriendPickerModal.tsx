import { useEffect, useState } from "react";
import { Search, UserPlus, Check } from "lucide-react";
import type { FriendItem, GroupMemberPayload } from "../../types/chat";
import { fetchFriends } from "../../utils/friendsApi";
import { addGroupMembers } from "../../utils/chatApi";
import Avatar from "../common/Avatar";
import GroupFeatureModal from "./GroupFeatureModal";

interface FriendPickerModalProps {
  token: string;
  conversationId: string;
  conversationName: string;
  currentMembers: GroupMemberPayload[];
  onNotice: (title: string, content: string, level?: "info" | "success" | "warning" | "error") => void;
  onClose: () => void;
  onInvited: () => void;
}

export default function FriendPickerModal({
  token,
  conversationId,
  conversationName,
  currentMembers,
  onNotice,
  onClose,
  onInvited,
}: FriendPickerModalProps) {
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    const loadFriends = async () => {
      try {
        const data = await fetchFriends(token);
        setFriends(data);
      } catch (error) {
        onNotice("好友列表", error instanceof Error ? error.message : "加载失败", "error");
      } finally {
        setLoading(false);
      }
    };
    loadFriends();
  }, [token]);

  const currentMemberIds = new Set(currentMembers.map((m) => m.userId));
  const availableFriends = friends.filter((f) => !currentMemberIds.has(f.friendId));
  const filteredFriends = search.trim()
    ? availableFriends.filter(
        (f) =>
          f.nickname.toLowerCase().includes(search.toLowerCase()) ||
          f.remark?.toLowerCase().includes(search.toLowerCase())
      )
    : availableFriends;

  const toggleSelect = (friendId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  };

  const handleInvite = async () => {
    if (selected.size === 0) {
      onNotice("邀请好友", "请选择要邀请的好友", "warning");
      return;
    }
    setInviting(true);
    try {
      const added = await addGroupMembers(token, conversationId, Array.from(selected));
      onNotice("邀请好友", `成功邀请 ${added.length} 位好友`, "success");
      onInvited();
      onClose();
    } catch (error) {
      onNotice("邀请好友", error instanceof Error ? error.message : "邀请失败", "error");
    } finally {
      setInviting(false);
    }
  };

  return (
    <GroupFeatureModal title={`邀请好友 - ${conversationName}`} onClose={onClose}>
      <div className="friend-picker">
        <div className="friend-picker-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="搜索好友..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="friend-picker-list">
          {loading ? (
            <div className="friend-picker-empty">加载中...</div>
          ) : filteredFriends.length === 0 ? (
            <div className="friend-picker-empty">
              {search.trim() ? "没有找到匹配的好友" : "没有可邀请的好友"}
            </div>
          ) : (
            filteredFriends.map((friend) => {
              const isSelected = selected.has(friend.friendId);
              return (
                <button
                  key={friend.friendId}
                  type="button"
                  className={`friend-picker-item ${isSelected ? "friend-picker-item-selected" : ""}`}
                  onClick={() => toggleSelect(friend.friendId)}
                >
                  <Avatar
                    name={friend.remark || friend.nickname}
                    src={friend.avatar}
                    size="sm"
                  />
                  <div className="friend-picker-item-info">
                    <span className="friend-picker-item-name">
                      {friend.remark || friend.nickname}
                    </span>
                    {friend.remark && (
                      <span className="friend-picker-item-remark">{friend.nickname}</span>
                    )}
                  </div>
                  {isSelected && (
                    <Check size={16} className="friend-picker-item-check" />
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="friend-picker-footer">
          <span className="friend-picker-count">
            已选择 {selected.size} 位好友
          </span>
          <button
            type="button"
            className="friend-picker-invite-btn"
            disabled={selected.size === 0 || inviting}
            onClick={handleInvite}
          >
            <UserPlus size={14} />
            {inviting ? "邀请中..." : "邀请"}
          </button>
        </div>
      </div>
    </GroupFeatureModal>
  );
}
