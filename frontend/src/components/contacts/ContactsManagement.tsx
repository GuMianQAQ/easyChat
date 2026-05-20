import { ChevronRight, Search, Star, StarOff } from "lucide-react";
import { useMemo, useState } from "react";
import type { ContactItem, ContactPermission, FriendItem } from "../../types/chat";
import Avatar from "../common/Avatar";

interface ContactsManagementProps {
  friends: FriendItem[];
  onCloseManagement: () => void;
  onUpdateContact: (contactId: string, patch: Partial<ContactItem>) => void;
  onSetPermission: (contactId: string, permission: ContactPermission) => void;
}

export default function ContactsManagement({
  friends,
  onCloseManagement,
  onUpdateContact,
  onSetPermission,
}: ContactsManagementProps) {
  const [keyword, setKeyword] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredContacts = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    const next = friends.filter((friend) => {
      const name = (friend.remark || friend.nickname).toLowerCase();
      return name.includes(normalized);
    });
    next.sort((left, right) => {
      const a = left.remark || left.nickname;
      const b = right.remark || right.nickname;
      return sortAsc ? a.localeCompare(b) : b.localeCompare(a);
    });
    return next;
  }, [friends, keyword, sortAsc]);

  const toggleSelection = (contactId: string) => {
    setSelectedIds((previous) =>
      previous.includes(contactId) ? previous.filter((item) => item !== contactId) : [...previous, contactId],
    );
  };

  return (
    <div className="contacts-manage">
      <aside className="contacts-manage-sidebar">
        <div className="contacts-manage-title">通讯录管理</div>
        <button type="button" className="contacts-manage-filter contacts-manage-filter-active">
          <span>全部</span>
          <em>{friends.length}</em>
        </button>
        <div className="contacts-manage-group">筛选</div>
        <button type="button" className="contacts-manage-filter">
          <span>朋友权限</span>
          <ChevronRight size={14} />
        </button>
        <button type="button" className="contacts-manage-filter">
          <span>标签</span>
          <ChevronRight size={14} />
        </button>
        <button type="button" className="contacts-manage-filter">
          <span>最近群聊</span>
          <ChevronRight size={14} />
        </button>
      </aside>

      <section className="contacts-manage-main">
        <div className="contacts-manage-toolbar">
          <label className="conversation-search contacts-manage-search">
            <Search size={15} />
            <input
              type="text"
              placeholder="搜索联系人"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>
          <button type="button" className="header-action" onClick={onCloseManagement}>
            返回通讯录
          </button>
        </div>

        <div className="contacts-manage-table">
          <div className="contacts-manage-head">
            <span />
            <button type="button" className="contacts-sort" onClick={() => setSortAsc((value) => !value)}>
              昵称 {sortAsc ? "↑" : "↓"}
            </button>
            <span>备注</span>
            <span>标签</span>
            <span>朋友权限</span>
          </div>

          {filteredContacts.map((friend) => (
            <div
              key={friend.friendId}
              className={`contacts-manage-row ${selectedIds.includes(friend.friendId) ? "contacts-manage-row-selected" : ""}`}
            >
              <label className="contacts-manage-select">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(friend.friendId)}
                  onChange={() => toggleSelection(friend.friendId)}
                />
              </label>
              <div className="contacts-manage-name">
                <Avatar name={friend.remark || friend.nickname} src={friend.avatar} />
                <div className="contacts-manage-name-copy">
                  <strong>{friend.remark || friend.nickname}</strong>
                  <span>{friend.username}</span>
                </div>
              </div>
              <input
                className="contacts-manage-input"
                value={friend.remark || ""}
                placeholder="备注"
                onChange={(event) => onUpdateContact(friend.friendId, { remark: event.target.value })}
              />
              <input
                className="contacts-manage-input"
                value={Array.isArray(friend.tags) ? friend.tags.join(", ") : ""}
                placeholder="标签"
                onChange={(event) =>
                  onUpdateContact(friend.friendId, {
                    tags: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
              />
              <div className="contacts-manage-actions">
                <select
                  className="contacts-manage-selectbox"
                  value={friend.permission}
                  onChange={(event) => onSetPermission(friend.friendId, event.target.value as ContactPermission)}
                >
                  <option value="chat">聊天</option>
                  <option value="limited">不看他</option>
                </select>
                <button
                  type="button"
                  className="header-action"
                  onClick={() => onUpdateContact(friend.friendId, { isStarred: !friend.isStarred })}
                >
                  {friend.isStarred ? <StarOff size={14} /> : <Star size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
