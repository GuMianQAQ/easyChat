import { MoreHorizontal, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import type { ContactItem, ContactPermission, FriendItem, FriendRequestItem } from "../../types/chat";
import Avatar from "../common/Avatar";
import ContactEditModal from "./ContactEditModal";
import ContactsManagement from "./ContactsManagement";
import FriendRequestsView from "./FriendRequestsView";
import { genderLabel, permissionLabel, sourceLabel } from "./contactHelpers";

interface ContactsDetailProps {
  managementOpen: boolean;
  friends: FriendItem[];
  requests: FriendRequestItem[];
  contact?: ContactItem;
  onCloseManagement: () => void;
  onOpenManagement: () => void;
  onOpenChat: (contact: ContactItem) => void;
  onOpenMoments: (contact: ContactItem) => void;
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

export default function ContactsDetail({
  managementOpen,
  friends,
  requests,
  contact,
  onCloseManagement,
  onOpenManagement,
  onOpenChat,
  onOpenMoments,
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
          {canManageFriend ? (
            <ProfileRow
              label="朋友圈"
              value="查看这位朋友的朋友圈"
              action={
                <button
                  type="button"
                  className="contact-profile-link"
                  onClick={() => onOpenMoments(contact)}
                >
                  <span>打开</span>
                </button>
              }
            />
          ) : null}
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
          {contact.source === "manual" || contact.source === "group" ? (
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
