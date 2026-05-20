import { MessageCircleMore } from "lucide-react";
import type { FriendRequestItem } from "../../types/chat";
import Avatar from "../common/Avatar";

interface FriendRequestsViewProps {
  requests: FriendRequestItem[];
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

export default function FriendRequestsView({
  requests,
  onAccept,
  onReject,
}: FriendRequestsViewProps) {
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
