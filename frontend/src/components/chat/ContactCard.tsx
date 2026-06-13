import { UserPlus, MessageSquare } from "lucide-react";
import type { ContactContent } from "../../types/chat";
import Avatar from "../common/Avatar";

interface ContactCardProps {
  contact: ContactContent;
  isFriend?: boolean;
  onAddFriend?: (userId: string) => void;
  onSendMessage?: (userId: string) => void;
}

function ContactCard({
  contact,
  isFriend = false,
  onAddFriend,
  onSendMessage,
}: ContactCardProps) {
  return (
    <div className="contact-card">
      <div className="contact-card-header">
        <Avatar
          src={contact.avatar}
          name={contact.name}
          size="lg"
        />
        <div className="contact-card-info">
          <div className="contact-card-name">{contact.name}</div>
          <div className="contact-card-id">微信号: {contact.wechatId}</div>
        </div>
      </div>
      <div className="contact-card-footer">
        {isFriend ? (
          <button
            type="button"
            className="contact-card-btn contact-card-btn-send"
            onClick={(e) => {
              e.stopPropagation();
              onSendMessage?.(contact.userId);
            }}
          >
            <MessageSquare size={16} />
            <span>发消息</span>
          </button>
        ) : (
          <button
            type="button"
            className="contact-card-btn contact-card-btn-add"
            onClick={(e) => {
              e.stopPropagation();
              onAddFriend?.(contact.userId);
            }}
          >
            <UserPlus size={16} />
            <span>添加好友</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default ContactCard;
