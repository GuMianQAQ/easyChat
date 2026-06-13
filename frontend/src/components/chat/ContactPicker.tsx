import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import Avatar from "../common/Avatar";

interface ContactItem {
  userId: string;
  name: string;
  avatar: string;
  wechatId: string;
}

interface ContactPickerProps {
  isOpen: boolean;
  contacts: ContactItem[];
  onSelect: (contact: ContactItem) => void;
  onClose: () => void;
}

function ContactPicker({
  isOpen,
  contacts,
  onSelect,
  onClose,
}: ContactPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    } else {
      searchInputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.wechatId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = useCallback(
    (contact: ContactItem) => {
      onSelect(contact);
      onClose();
    },
    [onSelect, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="contact-picker-overlay" onClick={onClose}>
      <div className="contact-picker" role="dialog" aria-modal="true" aria-label="选择联系人" onClick={(e) => e.stopPropagation()}>
        <div className="contact-picker-header">
          <h3>选择联系人</h3>
          <button type="button" className="contact-picker-close" aria-label="关闭" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="contact-picker-search">
          <Search size={16} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="搜索联系人"
            aria-label="搜索联系人"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="contact-picker-list">
          {filteredContacts.length === 0 ? (
            <div className="contact-picker-empty">暂无联系人</div>
          ) : (
            filteredContacts.map((contact) => (
              <button
                key={contact.userId}
                type="button"
                className="contact-picker-item"
                onClick={() => handleSelect(contact)}
              >
                <Avatar
                  src={contact.avatar}
                  name={contact.name}
                  size="md"
                />
                <div className="contact-picker-info">
                  <div className="contact-picker-name">{contact.name}</div>
                  <div className="contact-picker-wechatid">{contact.wechatId}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ContactPicker;
