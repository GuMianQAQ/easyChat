import type { MouseEvent, ReactNode } from "react";
import { File, RefreshCw } from "lucide-react";
import type { ChatMessage, GroupMemberItem } from "../../types/chat";
import type { ContactContent } from "../../types/chat";
import { formatTimeLabel } from "../../utils/time";
import { segmentsForDisplay } from "../../utils/mentions";
import { resolveMediaUrl } from "../../config/env";
import Avatar from "../common/Avatar";
import VoicePlayer from "./VoicePlayer";
import ContactCard from "./ContactCard";
import MarkdownContent from "./MarkdownContent";

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
          <img className="message-image" src={resolveMediaUrl(message.content)} alt="图片消息" />
        </button>
      );
    }

    if (message.messageType === "voice" && !message.revoked) {
      let voiceData = { url: message.content, duration: 0 };
      try {
        const parsed = JSON.parse(message.content);
        if (parsed.url) voiceData = { url: parsed.url, duration: parsed.duration || 0 };
      } catch {
        // plain URL
      }
      return (
        <VoicePlayer
          content={voiceData.url}
          duration={voiceData.duration}
          transcript={message.transcript}
        />
      );
    }

    if (message.messageType === "text" && !message.revoked) {
      // Contact card: [名片] name\nID: userId\n微信: wechatId
      const contactLines = message.content.split(/\r?\n/);
      if (contactLines[0]?.startsWith("[名片]")) {
        const name = contactLines[0].replace(/^\[名片]\s*/, "").trim();
        const idLine = contactLines[1]?.match(/^ID:\s*(.+)$/);
        const wechatLine = contactLines[2]?.match(/^微信:\s*(.+)$/);
        if (idLine) {
          const userId = idLine[1].trim();
          const contact: ContactContent = {
            name,
            userId,
            avatar: message.avatar || "",
            wechatId: wechatLine ? wechatLine[1].trim() : userId,
          };
          return (
            <div className="message-content message-contact">
              <ContactCard contact={contact} isFriend={false} />
            </div>
          );
        }
      }

      // Markdown: [MD]\n content
      if (message.content.startsWith("[MD]\n")) {
        const mdContent = message.content.slice(5);
        return (
          <div className="message-content message-markdown">
            <MarkdownContent content={mdContent} />
          </div>
        );
      }
    }

    if (message.messageType === "file" && !message.revoked) {
      const fileUrl = resolveMediaUrl(message.content);
      const fileName = message.content.split("/").pop() || "文件";
      return (
        <div className="message-file">
          <div className="message-file-icon">
            <File size={24} />
          </div>
          <div className="message-file-info">
            <div className="message-file-name" title={fileName}>{fileName}</div>
          </div>
          <a
            href={fileUrl}
            download={fileName}
            className="message-file-download"
            onClick={(e) => e.stopPropagation()}
          >
            下载
          </a>
        </div>
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
