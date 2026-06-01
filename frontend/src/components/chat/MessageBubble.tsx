import type { MouseEvent, ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import type { ChatMessage, GroupMemberItem } from "../../types/chat";
import { formatTimeLabel } from "../../utils/time";
import { segmentsForDisplay } from "../../utils/mentions";
import Avatar from "../common/Avatar";

function summarizeQuote(message: ChatMessage) {
  if (!message.quote) {
    return "";
  }
  if (message.quote.messageType === "image") {
    return "[图片]";
  }
  if (message.quote.messageType === "file") {
    return "[文件]";
  }
  return message.quote.content.length > 40
    ? `${message.quote.content.slice(0, 40)}…`
    : message.quote.content;
}

interface MessageBubbleProps {
  message: ChatMessage;
  favorite: boolean;
  highlighted: boolean;
  groupMembers?: GroupMemberItem[];
  onContextMenu: (message: ChatMessage, event: MouseEvent<HTMLElement>) => void;
  onOpenProfile: (message: ChatMessage, event: MouseEvent<HTMLElement>) => void;
  onPreviewImage: (message: ChatMessage) => void;
  onJumpToQuote: (quoteId: string) => void;
  onRetry: (messageId: string) => void;
}

function MessageBubble({
  message,
  favorite,
  highlighted,
  groupMembers = [],
  onContextMenu,
  onOpenProfile,
  onPreviewImage,
  onJumpToQuote,
  onRetry,
}: MessageBubbleProps) {
  const renderContent = (): ReactNode => {
    if (message.messageType === "image" && !message.revoked) {
      return (
        <button type="button" className="message-image-button" onClick={() => onPreviewImage(message)}>
          <img className="message-image" src={message.content} alt="图片消息" />
        </button>
      );
    }

    if (message.revoked) {
      return <div className="message-content message-content-revoked">{message.content}</div>;
    }

    if (groupMembers.length > 0) {
      const segments = segmentsForDisplay(message.content, groupMembers);
      return (
        <div className="message-content">
          {segments.map((seg, i) =>
            seg.isMention ? (
              <span key={i} className="mention-highlight">{seg.text}</span>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </div>
      );
    }

    return <div className="message-content">{message.content}</div>;
  };

  return (
    <div
      className={`message-row ${message.isSelf ? "message-row-self" : ""} ${
        highlighted ? "message-row-highlighted" : ""
      } ${message.revoked ? "message-row-revoked" : ""}`}
    >
      {!message.isSelf ? (
        <button
          type="button"
          className="avatar-trigger"
          onClick={(event) => onOpenProfile(message, event)}
        >
          <Avatar name={message.senderName} src={message.avatar} size="sm" title="查看资料" />
        </button>
      ) : null}

      <div className={`message-stack ${message.isSelf ? "message-stack-self" : ""}`}>
        <div className={`message-meta ${message.isSelf ? "message-meta-self" : ""}`}>
          <span>{message.senderName}</span>
          <span>{formatTimeLabel(message.createdAt)}</span>
          {message.status === "failed" ? (
            <button type="button" className="message-retry" onClick={() => onRetry(message.id)}>
              <RefreshCw size={12} />
              <span>重试</span>
            </button>
          ) : null}
        </div>

        <div className="message-bubble-wrap">
          <article
            className={`message-bubble ${
              message.isSelf ? "message-bubble-self" : "message-bubble-other"
            } ${message.revoked ? "message-bubble-revoked" : ""}`}
            onContextMenu={(event) => onContextMenu(message, event)}
          >
            {message.quote && !message.revoked ? (
              <button
                type="button"
                className="message-quote"
                onClick={() => onJumpToQuote(message.quote!.id)}
              >
                <strong>{message.quote.username}</strong>
                <span>{summarizeQuote(message)}</span>
              </button>
            ) : null}

            {renderContent()}
          </article>

          {favorite ? <span className="message-favorite-dot" /> : null}
        </div>
      </div>

      {message.isSelf ? (
        <button
          type="button"
          className="avatar-trigger"
          onClick={(event) => onOpenProfile(message, event)}
        >
          <Avatar name={message.senderName} src={message.avatar} size="sm" tone="active" title="查看资料" />
        </button>
      ) : null}
    </div>
  );
}

export default MessageBubble;
