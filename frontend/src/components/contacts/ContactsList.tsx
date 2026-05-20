import { ChevronRight, MessageCircleMore, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { ContactItem } from "../../types/chat";
import Avatar from "../common/Avatar";

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

export default function ContactsList({
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
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [switchingTab, setSwitchingTab] = useState(false);
  const switchingTimer = useRef<number | null>(null);

  const normalizedKeyword = keyword.trim().toLowerCase();
  const filteredContacts = useMemo(
    () =>
      contacts.filter((item) => {
        const name = (item.remark || item.name).toLowerCase();
        return name.includes(normalizedKeyword);
      }),
    [contacts, normalizedKeyword],
  );

  const roomContacts = filteredContacts.filter((item) => item.source === "group");
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

  const animateListToggle = () => {
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
    };
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

      <div className={`contact-group-list ${switchingTab ? "contact-group-list-switching" : ""}`}>
        <button
          type="button"
          className="contact-group-item contact-group-item-toggle"
          onClick={() => {
            animateListToggle();
            if (activeTab === "friends") {
              setFriendsOpen((open) => !open);
            } else {
              setGroupsOpen((open) => !open);
            }
          }}
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
