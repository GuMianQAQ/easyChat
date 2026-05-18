import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import type {
  ChatMessage,
  ConnectionStatus,
  Conversation,
  MessageQuote,
  NotificationItem,
} from "../../types/chat";
import { prepareImageDataUrl } from "../../utils/media";
import EmptyState from "../common/EmptyState";
import ChatHeader from "./ChatHeader";
import ConversationDetailPanel from "./ConversationDetailPanel";
import ConversationList from "./ConversationList";
import ImagePreviewModal from "./ImagePreviewModal";
import MessageComposer from "./MessageComposer";
import MessageList from "./MessageList";

interface ChatMainProps {
  activeConversation: Conversation;
  status: ConnectionStatus;
  messages: ChatMessage[];
  hasMore: boolean;
  loadingMore: boolean;
  notifications: NotificationItem[];
  onlineCount: number;
  favoriteIds: Set<string>;
  jumpToMessageId?: string;
  enterToSend: boolean;
  composerDisabledReason?: string;
  onReconnect: () => void;
  onDisconnect: () => void;
  onSendText: (content: string, quote?: MessageQuote | null) => boolean;
  onSendImage: (dataUrl: string, quote?: MessageQuote | null) => Promise<boolean>;
  onCaptureScreen: (quote?: MessageQuote | null) => Promise<boolean>;
  onLoadMore: () => void;
  onRetry: (messageId: string) => void;
  onRevoke: (message: ChatMessage) => void;
  onDeleteLocal: (messageId: string) => void;
  onToggleFavorite: (message: ChatMessage) => void;
  onCopyMessage: (message: ChatMessage) => void;
  onOpenProfile: (
    profile: { userId: string; nickname: string; avatar: string },
    event: MouseEvent<HTMLElement>,
  ) => void;
  onCreateQuote: (message: ChatMessage) => MessageQuote;
  onNotice: (title: string, content: string, level?: NotificationItem["level"]) => void;
  onJumpHandled?: () => void;
  onToggleConversationPinned: (next: boolean) => void;
  onToggleConversationMuted: (next: boolean) => void;
  onClearConversation: () => void;
}

function NotificationPanel({ notifications }: { notifications: NotificationItem[] }) {
  if (notifications.length === 0) {
    return (
      <div className="panel-scroll">
        <EmptyState icon={Bell} title="暂无通知" />
      </div>
    );
  }

  return (
    <div className="panel-scroll">
      <div className="notice-list">
        {notifications.map((item) => (
          <article key={item.id} className={`notice-card notice-${item.level}`}>
            <div className="notice-head">
              <strong>{item.title}</strong>
              <span>{item.time.slice(11, 19)}</span>
            </div>
            <p>{item.content}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function ChatMain({
  activeConversation,
  status,
  messages,
  hasMore,
  loadingMore,
  notifications,
  onlineCount,
  favoriteIds,
  jumpToMessageId: externalJumpToMessageId = "",
  enterToSend,
  composerDisabledReason = "",
  onReconnect,
  onDisconnect,
  onSendText,
  onSendImage,
  onCaptureScreen,
  onLoadMore,
  onRetry,
  onRevoke,
  onDeleteLocal,
  onToggleFavorite,
  onCopyMessage,
  onOpenProfile,
  onCreateQuote,
  onNotice,
  onJumpHandled,
  onToggleConversationPinned,
  onToggleConversationMuted,
  onClearConversation,
}: ChatMainProps) {
  const [previewImage, setPreviewImage] = useState("");
  const [quote, setQuote] = useState<MessageQuote | null>(null);
  const [dragging, setDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [jumpToMessageId, setJumpToMessageId] = useState("");

  useEffect(() => {
    setQuote(null);
    setMenuOpen(false);
    setJumpToMessageId("");
  }, [activeConversation.id]);

  useEffect(() => {
    if (externalJumpToMessageId) {
      setJumpToMessageId(externalJumpToMessageId);
    }
  }, [externalJumpToMessageId]);

  if (activeConversation.type === "system") {
    return (
      <>
        <header className="subview-header">
          <Bell size={18} />
          <strong>系统通知</strong>
        </header>
        <NotificationPanel notifications={notifications} />
      </>
    );
  }

  return (
    <div
      className="chat-main-content"
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return;
        }
        setDragging(false);
      }}
      onDrop={async (event) => {
        event.preventDefault();
        setDragging(false);

        const file = Array.from(event.dataTransfer.files).find((item) => item.type.startsWith("image/"));
        if (!file) {
          onNotice("图片", "仅支持图片", "warning");
          return;
        }

        try {
          const dataUrl = await prepareImageDataUrl(file);
          if (await onSendImage(dataUrl, quote)) {
            setQuote(null);
          }
        } catch (error) {
          onNotice("图片", error instanceof Error ? error.message : "图片发送失败", "error");
        }
      }}
    >
      <div className="chat-room-main">
        <ChatHeader
          conversation={activeConversation}
          onlineCount={onlineCount}
          status={status}
          menuOpen={menuOpen}
          onDisconnect={onDisconnect}
          onReconnect={onReconnect}
          onToggleMenu={() => setMenuOpen((open) => !open)}
        />
        <MessageList
          messages={messages}
          hasMore={hasMore}
          loadingMore={loadingMore}
          favoriteIds={favoriteIds}
          jumpToMessageId={jumpToMessageId}
          onJumpHandled={() => {
            setJumpToMessageId("");
            onJumpHandled?.();
          }}
          onJumpMissing={() => onNotice("收藏", "原消息暂时无法定位", "warning")}
          onLoadMore={onLoadMore}
          onToggleFavorite={onToggleFavorite}
          onCopyMessage={onCopyMessage}
          onOpenProfile={(message, event) =>
            onOpenProfile(
              {
                userId: message.senderId,
                nickname: message.senderName,
                avatar: message.avatar,
              },
              event,
            )
          }
          onPreviewImage={(message) => setPreviewImage(message.content)}
          onCreateQuote={(message) => setQuote(onCreateQuote(message))}
          onDeleteLocal={onDeleteLocal}
          onRevoke={onRevoke}
          onRetry={onRetry}
        />
        <MessageComposer
          activeConversationId={activeConversation.id}
          disabled={status !== "connected" || Boolean(composerDisabledReason)}
          disabledReason={composerDisabledReason}
          enterToSend={enterToSend}
          quote={quote}
          onClearQuote={() => setQuote(null)}
          onSendText={onSendText}
          onSendImage={onSendImage}
          onCaptureScreen={onCaptureScreen}
          onNotice={onNotice}
        />
      </div>

      {menuOpen ? (
        <ConversationDetailPanel
          conversation={activeConversation}
          messages={messages}
          onJumpToMessage={setJumpToMessageId}
          onToggleMuted={onToggleConversationMuted}
          onTogglePinned={onToggleConversationPinned}
          onClearMessages={onClearConversation}
        />
      ) : null}

      <ImagePreviewModal
        open={Boolean(previewImage)}
        src={previewImage}
        onClose={() => setPreviewImage("")}
      />
      {dragging ? <div className="drag-overlay">释放发送图片</div> : null}
    </div>
  );
}

const ChatView = {
  ConversationList,
  Main: ChatMain,
};

export default ChatView;
