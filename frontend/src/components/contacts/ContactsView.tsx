import {
  ChevronRight,
  MessageCircleMore,
  MoreHorizontal,
  Pencil,
  Search,
  Star,
  StarOff,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { ReactNode } from "react";
import type {
  ContactItem,
  ContactPermission,
  FriendItem,
  FriendRequestItem,
} from "../../types/chat";
import Avatar from "../common/Avatar";
import ContactEditModal from "./ContactEditModal";

function sourceLabel(contact: ContactItem): string {
  switch (contact.source) {
    case "self":
      return "当前用户";
    case "room":
      return "群聊";
    case "system":
      return "系统联系人";
    case "recent":
      return "最近联系人";
    default:
      return "通过账号搜索添加";
  }
}

function permissionLabel(permission: ContactPermission | undefined): string {
  switch (permission) {
    case "limited":
      return "不看他";
    default:
      return "聊天";
  }
}

function genderLabel(gender?: string): string {
  if (gender === "male") {
    return "男";
  }
  if (gender === "female") {
    return "女";
  }
  return "";
}

interface ContactsListProps {
  contacts: ContactItem[];
  starredContacts: ContactItem[];
  selectedId: string;
  managementOpen: boolean;
  requestCount: number;
  onSelect: (id: string) => void;
  onOpenManagement: () => void;
  onOpenRequests: () => void;
  onOpenProfile: (contact: ContactItem, event: ReactMouseEvent<HTMLElement>) => void;
}

function ContactPersonItem({
  contact,
  active,
  indent = true,
  onSelect,
  onOpenProfile,
}: {
  contact: ContactItem;
  active: boolean;
  indent?: boolean;
  onSelect: () => void;
  onOpenProfile: (contact: ContactItem, event: ReactMouseEvent<HTMLElement>) => void;
}) {
  return (
    <div className={`contact-person-item ${active ? "contact-person-item-active" : ""}`}>
      <button type="button" className="avatar-trigger" onClick={(event) => onOpenProfile(contact, event)}>
        <Avatar name={contact.remark || contact.name} src={contact.avatar} />
      </button>
      <button
        type="button"
        className={`contact-person-entry ${indent ? "contact-person-entry-indented" : ""}`}
        onClick={onSelect}
      >
        <span>{contact.remark || contact.name}</span>
      </button>
    </div>
  );
}

function ContactsList({
  contacts,
  starredContacts,
  selectedId,
  managementOpen,
  requestCount,
  onSelect,
  onOpenManagement,
  onOpenRequests,
  onOpenProfile,
}: ContactsListProps) {
  const [keyword, setKeyword] = useState("");
  const [activeTab, setActiveTab] = useState<"friends" | "groups">("friends");
  const [friendsOpen, setFriendsOpen] = useState(true);
  const [groupsOpen, setGroupsOpen] = useState(true);
  const [entering, setEntering] = useState(true);
  const [switchingTab, setSwitchingTab] = useState(false);
  const switchingTimer = useRef<number | null>(null);
  const enteringTimer = useRef<number | null>(null);

  const normalizedKeyword = keyword.trim().toLowerCase();
  const filteredContacts = useMemo(
    () =>
      contacts.filter((item) => {
        const name = (item.remark || item.name).toLowerCase();
        return name.includes(normalizedKeyword);
      }),
    [contacts, normalizedKeyword],
  );

  const roomContacts = filteredContacts.filter((item) => item.source === "room");
  const systemContacts = filteredContacts.filter((item) => item.source === "system");
  const friendContacts = filteredContacts.filter((item) => item.source === "manual");
  const filteredStarred = starredContacts.filter((item) =>
    (item.remark || item.name).toLowerCase().includes(normalizedKeyword),
  );
  const visibleCount = activeTab === "friends" ? friendContacts.length : roomContacts.length + systemContacts.length;
  const visibleOpen = activeTab === "friends" ? friendsOpen : groupsOpen;
  const visibleList =
    activeTab === "friends"
      ? [...filteredStarred, ...friendContacts.filter((contact) => !contact.isStarred)]
      : [...roomContacts, ...systemContacts];

  const switchTab = (next: "friends" | "groups") => {
    setActiveTab(next);
    setSwitchingTab(true);
    if (switchingTimer.current) {
      window.clearTimeout(switchingTimer.current);
    }
    switchingTimer.current = window.setTimeout(() => {
      setSwitchingTab(false);
      switchingTimer.current = null;
    }, 180);
  };

  useEffect(() => {
    return () => {
      if (switchingTimer.current) {
        window.clearTimeout(switchingTimer.current);
      }
      if (enteringTimer.current) {
        window.clearTimeout(enteringTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (enteringTimer.current) {
      window.clearTimeout(enteringTimer.current);
    }
    setEntering(true);
    enteringTimer.current = window.setTimeout(() => {
      setEntering(false);
      enteringTimer.current = null;
    }, 180);
  }, []);

  return (
    <div className="contacts-panel">
      <label className="conversation-search contacts-search">
        <Search size={15} />
        <input
          type="text"
          placeholder="搜索"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
      </label>

      <button type="button" className="address-book-button" onClick={onOpenManagement}>
        <div className="address-book-icon">
          <MessageCircleMore size={16} />
        </div>
        <span>通讯录管理</span>
      </button>

      <button type="button" className="contact-group-item contact-group-item-top" onClick={onOpenRequests}>
        <div className="contact-group-title">
          <ChevronRight size={14} />
          <span>新的朋友</span>
        </div>
        <em>{requestCount}</em>
      </button>

      <div className="contact-switcher">
        <button
          type="button"
          className={`contact-switcher-item ${activeTab === "friends" ? "contact-switcher-item-active" : ""}`}
          onClick={() => switchTab("friends")}
        >
          好友
        </button>
        <button
          type="button"
          className={`contact-switcher-item ${activeTab === "groups" ? "contact-switcher-item-active" : ""}`}
          onClick={() => switchTab("groups")}
        >
          群聊
        </button>
      </div>

      <div
        className={`contact-group-list contact-group-list-animated ${
          switchingTab || entering ? "contact-group-list-switching" : ""
        }`}
      >
        <button
          type="button"
          className="contact-group-item contact-group-item-toggle"
          onClick={() => (activeTab === "friends" ? setFriendsOpen((open) => !open) : setGroupsOpen((open) => !open))}
        >
          <div className="contact-group-title">
            <ChevronRight size={14} className={visibleOpen ? "contact-group-arrow-open" : ""} />
            <span>{activeTab === "friends" ? "好友" : "群聊"}</span>
          </div>
          <em>{visibleCount}</em>
        </button>
        {visibleOpen ? (
          <div key={activeTab} className="contact-person-list contact-person-list-animated">
            {visibleList.map((contact) => (
              <ContactPersonItem
                key={contact.id}
                contact={contact}
                active={!managementOpen && selectedId === contact.id}
                onSelect={() => onSelect(contact.id)}
                onOpenProfile={onOpenProfile}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FriendRequestsView({
  requests,
  onAccept,
  onReject,
}: {
  requests: FriendRequestItem[];
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
}) {
  const received = requests.filter((item) => item.direction === "received" && item.status === "pending");

  if (received.length === 0) {
    return (
      <div className="contacts-empty-state">
        <div className="contacts-empty-icon">
          <MessageCircleMore size={44} />
          <MessageCircleMore size={36} />
        </div>
        <span className="simple-hint">暂无好友申请</span>
      </div>
    );
  }

  return (
    <div className="notice-list">
      {received.map((item) => (
        <article key={item.id} className="notice-card">
          <div className="contacts-request-card">
            <Avatar name={item.user.nickname} src={item.user.avatar} />
            <div className="contacts-request-copy">
              <strong>{item.user.nickname}</strong>
              <span>{item.user.username}</span>
              <p>{item.message}</p>
              <span>{item.createdAt}</span>
            </div>
            <div className="contacts-request-actions">
              <button type="button" className="header-action header-action-primary" onClick={() => onAccept(item.id)}>
                同意
              </button>
              <button type="button" className="header-action" onClick={() => onReject(item.id)}>
                拒绝
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function ContactsManagement({
  friends,
  onCloseManagement,
  onUpdateContact,
  onSetPermission,
}: {
  friends: FriendItem[];
  onCloseManagement: () => void;
  onUpdateContact: (contactId: string, patch: Partial<ContactItem>) => void;
  onSetPermission: (contactId: string, permission: ContactPermission) => void;
}) {
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

interface ContactsDetailProps {
  managementOpen: boolean;
  friends: FriendItem[];
  requests: FriendRequestItem[];
  contact?: ContactItem;
  onCloseManagement: () => void;
  onOpenManagement: () => void;
  onOpenChat: (contact: ContactItem) => void;
  onUpdateContact: (contactId: string, patch: Partial<ContactItem>) => void;
  onSetPermission: (contactId: string, permission: ContactPermission) => void;
  onAcceptRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string) => void;
  onDeleteFriend: (friendId: string) => void;
  onToggleBlock: (friendId: string, nextBlocked: boolean) => void;
  onOpenProfile: (contact: ContactItem, event: ReactMouseEvent<HTMLElement>) => void;
  onUploadImage: (file: File) => Promise<string>;
}

function ProfileRow({
  label,
  value,
  action,
}: {
  label: string;
  value: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="contact-profile-row">
      <span className="contact-profile-label">{label}</span>
      <div className="contact-profile-value">
        <div className="contact-profile-value-text">{value}</div>
        {action ? <div className="contact-profile-value-action">{action}</div> : null}
      </div>
    </div>
  );
}

function ContactsDetail({
  managementOpen,
  friends,
  requests,
  contact,
  onCloseManagement,
  onOpenManagement,
  onOpenChat,
  onUpdateContact,
  onSetPermission,
  onAcceptRequest,
  onRejectRequest,
  onDeleteFriend,
  onToggleBlock,
  onOpenProfile,
  onUploadImage,
}: ContactsDetailProps) {
  const [editingRemark, setEditingRemark] = useState(false);
  const [remarkDraft, setRemarkDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setEditingRemark(false);
    setRemarkDraft(contact?.remark || "");
    setMenuOpen(false);
    setEditOpen(false);
  }, [contact?.id, contact?.remark]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  if (managementOpen) {
    return (
      <ContactsManagement
        friends={friends}
        onCloseManagement={onCloseManagement}
        onUpdateContact={onUpdateContact}
        onSetPermission={onSetPermission}
      />
    );
  }

  if (!contact) {
    return <FriendRequestsView requests={requests} onAccept={onAcceptRequest} onReject={onRejectRequest} />;
  }

  const displayName = contact.remark || contact.name;
  const nicknameVisible = Boolean(contact.remark && contact.name);
  const tagsText = contact.tags?.filter(Boolean).join("、") || "";
  const signatureText = contact.signature?.trim() || "";
  const regionText = contact.region?.trim() || "";
  const phoneText = contact.phone?.trim() || "";
  const descriptionText = contact.description?.trim() || "";
  const descriptionImages = Array.isArray(contact.descriptionImages) ? contact.descriptionImages : [];
  const genderText = genderLabel(contact.gender);
  const addedAt = contact.addedAt || contact.lastSeenAt || "";
  const canEditRemark = contact.source === "manual";
  const canManageFriend = contact.source === "manual";

  return (
    <div className="contacts-detail contacts-profile-page">
      <div className="contacts-profile-card">
        <div className="contacts-profile-header">
          <button type="button" className="avatar-trigger" onClick={(event) => onOpenProfile(contact, event)}>
            <Avatar name={displayName} src={contact.avatar} size="xl" />
          </button>
          <div className="contacts-profile-main">
            <div className="contacts-profile-name-line">
              <h2>{displayName}</h2>
              {genderText ? <span className="contacts-profile-gender">{genderText}</span> : null}
            </div>
            {nicknameVisible ? <p>昵称：{contact.name}</p> : null}
            {contact.username ? <p>账号：{contact.username}</p> : null}
            {regionText ? <p>地区：{regionText}</p> : null}
          </div>
          {canManageFriend ? (
            <div className="contacts-profile-menu-wrap" ref={menuRef}>
              <button
                type="button"
                className={`contacts-profile-menu-trigger ${menuOpen ? "contacts-profile-menu-trigger-active" : ""}`}
                aria-label="更多操作"
                onClick={() => setMenuOpen((value) => !value)}
              >
                <MoreHorizontal size={18} />
              </button>
              {menuOpen ? (
                <div className="contacts-profile-menu">
                  <button
                    type="button"
                  className="contacts-profile-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    setEditOpen(true);
                  }}
                >
                  设置备注和标签
                  </button>
                  <button
                    type="button"
                    className="contacts-profile-menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenManagement();
                    }}
                  >
                    设置朋友权限
                  </button>
                  <button
                    type="button"
                    className="contacts-profile-menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      onUpdateContact(contact.id, { isStarred: !contact.isStarred });
                    }}
                  >
                    {contact.isStarred ? "取消特别关心" : "设为特别关心"}
                  </button>
                  <button
                    type="button"
                    className="contacts-profile-menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      onToggleBlock(contact.id, !contact.isBlocked);
                    }}
                  >
                    {contact.isBlocked ? "移出黑名单" : "加入黑名单"}
                  </button>
                  <button
                    type="button"
                    className="contacts-profile-menu-item contacts-profile-menu-item-danger"
                    onClick={() => {
                      setMenuOpen(false);
                      onDeleteFriend(contact.id);
                    }}
                  >
                    删除好友
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <section className="contacts-profile-section">
          <ProfileRow
            label="备注"
            value={
              editingRemark ? (
                <div className="contact-profile-inline-edit">
                  <input
                    className="contact-profile-input"
                    value={remarkDraft}
                    maxLength={64}
                    autoFocus
                    placeholder="添加备注"
                    onChange={(event) => setRemarkDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        onUpdateContact(contact.id, { remark: remarkDraft.trim() });
                        setEditingRemark(false);
                      }
                      if (event.key === "Escape") {
                        setEditingRemark(false);
                        setRemarkDraft(contact.remark || "");
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="settings-button settings-button-primary"
                    onClick={() => {
                      onUpdateContact(contact.id, { remark: remarkDraft.trim() });
                      setEditingRemark(false);
                    }}
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    className="settings-button"
                    onClick={() => {
                      setEditingRemark(false);
                      setRemarkDraft(contact.remark || "");
                    }}
                  >
                    取消
                  </button>
                </div>
              ) : (
                contact.remark || "添加备注"
              )
            }
            action={
              canEditRemark && !editingRemark ? (
                <button
                  type="button"
                  className="contact-profile-link"
                  onClick={() => {
                    setRemarkDraft(contact.remark || "");
                    setEditingRemark(true);
                  }}
                >
                  <Pencil size={14} />
                  <span>编辑</span>
                </button>
              ) : undefined
            }
          />
          <ProfileRow label="标签" value={tagsText || "未设置"} />
          <ProfileRow label="朋友权限" value={permissionLabel(contact.permission)} />
          {phoneText ? <ProfileRow label="电话" value={phoneText} /> : null}
          {descriptionText || descriptionImages.length > 0 ? (
            <ProfileRow
              label="描述"
              value={
                <div className="contact-profile-description">
                  {descriptionText ? <div className="contact-profile-description-text">{descriptionText}</div> : null}
                  {descriptionImages.length > 0 ? (
                    <div className="contact-profile-description-images">
                      {descriptionImages.map((image, index) => (
                        <button type="button" key={`${image.url}-${index}`} className="contact-profile-description-image">
                          <img src={image.url} alt="" />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              }
            />
          ) : null}
        </section>

        <section className="contacts-profile-section">
          {signatureText ? <ProfileRow label="个性签名" value={signatureText} /> : null}
          <ProfileRow label="来源" value={sourceLabel(contact)} />
          {addedAt ? <ProfileRow label="添加时间" value={addedAt.slice(0, 10)} /> : null}
        </section>

        <div className="contacts-profile-actions">
          {contact.source === "manual" || contact.source === "room" ? (
            <button type="button" className="header-action header-action-primary" onClick={() => onOpenChat(contact)}>
              发消息
            </button>
          ) : null}
        </div>
      </div>

      <ContactEditModal
        open={editOpen}
        contact={contact}
        onClose={() => setEditOpen(false)}
        onSave={(patch) => onUpdateContact(contact.id, patch)}
        onUploadImage={onUploadImage}
      />
    </div>
  );
}

const ContactsView = {
  List: ContactsList,
  Detail: ContactsDetail,
};

export default ContactsView;




