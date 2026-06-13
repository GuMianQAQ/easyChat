import { Bell, MessageCircleMore } from "lucide-react";
import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import type {
  ChatMessage,
  ConnectionStatus,
  Conversation,
  GroupConversationPayload,
  MessageQuote,
  NotificationItem,
} from "../../types/chat";
import { resolveApiUrl } from "../../config/env";
import { prepareImageDataUrl } from "../../utils/media";
import EmptyState from "../common/EmptyState";
import AnnouncementBar from "./AnnouncementBar";
import ChatHeader from "./ChatHeader";
import ConversationDetailPanel from "./ConversationDetailPanel";
import ConversationList from "./ConversationList";
import GroupFeatureModal from "./GroupFeatureModal";
import ImagePreviewModal from "./ImagePreviewModal";
import MessageComposer from "./MessageComposer";
import MessageList from "./MessageList";
import PinnedMessages from "./PinnedMessages";
import GroupFileManager from "./GroupFileManager";
import GroupAlbum from "./GroupAlbum";
import VoteModal from "./VoteModal";
import SolitaireModal from "./SolitaireModal";

interface ChatMainProps {
  token: string;
  currentUserId: string;
  activeConversation: Conversation;
  status: ConnectionStatus;
  messages: ChatMessage[];
  hasMore: boolean;
  loadingMore: boolean;
  notifications: NotificationItem[];
  groupConversation: GroupConversationPayload | null;
  favoriteIds: Set<string>;
  jumpToMessageId?: string;
  enterToSend: boolean;
  clearAfterSend: boolean;
  composerDisabledReason?: string;
  draftContent: string;
  streamingContent?: string;
  streamingLoading?: boolean;
  inputCompletion?: boolean;
  completionGranularity?: "simple" | "medium" | "complex";
  completionScope?: "all" | "ai" | "normal";
  questionPrediction?: boolean;
  questionPredictionScope?: "all" | "ai" | "normal";
  hideWindowOnCapture: boolean;
  onDraftChange: (value: string) => void;
  onSendText: (content: string, quote?: MessageQuote | null) => boolean;
  onSendImage: (dataUrl: string, quote?: MessageQuote | null) => Promise<boolean>;
  onSendFile: (file: File, quote?: MessageQuote | null) => Promise<boolean>;
  onCaptureScreen: (hideWindow: boolean) => Promise<string | null>;
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
  onLeaveGroupConversation: (conversation: Conversation) => Promise<boolean>;
  onDismissGroupConversation: (conversation: Conversation) => Promise<boolean>;
  onUploadImage: (file: File) => Promise<string>;
  onUpdateGroupConversation: (
    conversationId: string,
    patch: {
      avatar?: string;
      name?: string;
      announcement?: string;
      remark?: string;
      myNickname?: string;
      isMuted?: boolean;
    },
  ) => Promise<GroupConversationPayload | null>;
  onUpdateGroupBotEnabled: (conversationId: string, botEnabled: boolean) => Promise<GroupConversationPayload | null>;
  favoriteStickers?: import("../../utils/chatApi").FavoriteSticker[];
  onStickerUpload?: (file: File) => Promise<void>;
  onStickerDelete?: (stickerId: string) => Promise<void>;
  onSendVoice: (audioBlob: Blob, duration: number, quote?: MessageQuote | null) => Promise<boolean>;
  onSendContact: (contactInfo: { userId: string; name: string; avatar: string; wechatId?: string }, quote?: MessageQuote | null) => boolean;
  onSendMarkdown: (content: string, quote?: MessageQuote | null) => boolean;
  contacts?: import("../../types/chat").ContactItem[];
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
  token,
  currentUserId,
  activeConversation,
  status,
  messages,
  hasMore,
  loadingMore,
  notifications,
  groupConversation,
  favoriteIds,
  jumpToMessageId: externalJumpToMessageId = "",
  enterToSend,
  clearAfterSend,
  composerDisabledReason = "",
  draftContent,
  streamingContent,
  streamingLoading,
  inputCompletion,
  completionGranularity,
  completionScope,
  questionPrediction,
  questionPredictionScope,
  hideWindowOnCapture,
  onDraftChange,
  onSendText,
  onSendImage,
  onSendFile,
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
  onLeaveGroupConversation,
  onDismissGroupConversation,
  onUploadImage,
  onUpdateGroupConversation,
  onUpdateGroupBotEnabled,
  favoriteStickers,
  onStickerUpload,
  onStickerDelete,
  onSendVoice,
  onSendContact,
  onSendMarkdown,
  contacts,
}: ChatMainProps) {
  const [previewImage, setPreviewImage] = useState("");
  const [quote, setQuote] = useState<MessageQuote | null>(null);
  const [dragging, setDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [jumpToMessageId, setJumpToMessageId] = useState("");
  const [translation, setTranslation] = useState<{ text: string; result: string } | null>(null);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const isAIAssistant = activeConversation.type === "private" && activeConversation.targetUserId === "ai-assistant";
  const composerPlaceholder = isAIAssistant ? "直接向 AI 助手提问" : "输入消息";

  const handleTranslate = async (message: ChatMessage) => {
    setTranslation({ text: message.content, result: "翻译中..." });
    try {
      const resp = await fetch(resolveApiUrl("/api/ai/translate"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: message.content, targetLang: "中文" }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setTranslation({ text: message.content, result: data.translation });
      } else {
        setTranslation({ text: message.content, result: data.error || "翻译失败" });
      }
    } catch {
      setTranslation({ text: message.content, result: "翻译请求失败" });
    }
  };

  const handleTranscribeVoice = async (message: ChatMessage) => {
    try {
      const { transcribeVoice } = await import("../../utils/chatApi");
      const result = await transcribeVoice(token, message.id, message.content);
      console.debug("[ChatView] 语音转写成功:", result.transcript);
    } catch (error) {
      onNotice("语音转写", error instanceof Error ? error.message : "转写失败", "error");
    }
  };

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

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

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

  if (!activeConversation.id) {
    return (
      <div className="chat-empty-screen">
        <EmptyState icon={MessageCircleMore} title="暂无会话" description="从左侧选择一个私聊或群聊开始聊天" />
      </div>
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
      <div className="chat-main">
        <ChatHeader
          conversation={activeConversation}
          menuOpen={menuOpen}
          onToggleMenu={() => setMenuOpen((open) => !open)}
          onOpenFeature={setActiveFeature}
        />
        {activeConversation.type === "group" && activeConversation.announcement && (
          <AnnouncementBar announcement={activeConversation.announcement} />
        )}
        <MessageList
          messages={messages}
          hasMore={hasMore}
          loadingMore={loadingMore}
          favoriteIds={favoriteIds}
          jumpToMessageId={jumpToMessageId}
          groupMembers={groupConversation?.members || []}
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
          onTranslate={handleTranslate}
          isGroupChat={activeConversation.type === "group"}
          onTranscribeVoice={handleTranscribeVoice}
          onPinMessage={activeConversation.type === "group" ? async (message) => {
            try {
              const { pinMessage } = await import("../../utils/chatApi");
              await pinMessage(token, activeConversation.id, message.id);
              onNotice("精华消息", "已设为精华", "success");
            } catch (error) {
              onNotice("精华消息", error instanceof Error ? error.message : "操作失败", "error");
            }
          } : undefined}
          streamingContent={streamingContent}
          streamingLoading={streamingLoading}
        />
        {translation && (
          <div className="translation-result">
            <div className="translation-header">
              <span>翻译结果</span>
              <button type="button" onClick={() => setTranslation(null)}>×</button>
            </div>
            <div className="translation-original">{translation.text}</div>
            <div className="translation-output">{translation.result}</div>
          </div>
        )}
        <MessageComposer
          activeConversationId={activeConversation.id}
          content={draftContent}
          disabled={status !== "connected" || Boolean(composerDisabledReason)}
          disabledReason={composerDisabledReason}
          placeholderText={composerPlaceholder}
          enterToSend={enterToSend}
          clearAfterSend={clearAfterSend}
          quote={quote}
          isAIAssistant={isAIAssistant}
          isGroupChat={activeConversation.type === "group"}
          groupMembers={groupConversation?.members || []}
          inputCompletion={inputCompletion}
          completionGranularity={completionGranularity}
          completionScope={completionScope}
          questionPrediction={questionPrediction}
          questionPredictionScope={questionPredictionScope}
          hideWindowOnCapture={hideWindowOnCapture}
          token={token}
          onClearQuote={() => setQuote(null)}
          onContentChange={onDraftChange}
          onSendText={onSendText}
          onSendImage={onSendImage}
          onSendFile={onSendFile}
          onCaptureScreen={onCaptureScreen}
          onNotice={onNotice}
          favoriteStickers={favoriteStickers}
          onStickerUpload={onStickerUpload}
          onStickerDelete={onStickerDelete}
          onSendVoice={onSendVoice}
          onSendContact={onSendContact}
          onSendMarkdown={onSendMarkdown}
          contacts={contacts}
        />
      </div>

      <div
        className={`conversation-detail-overlay ${menuOpen ? "conversation-detail-overlay-open" : ""}`}
        aria-hidden={!menuOpen}
      >
        <ConversationDetailPanel
          token={token}
          conversation={activeConversation}
          messages={messages}
          groupConversation={groupConversation}
          onJumpToMessage={setJumpToMessageId}
          onToggleMuted={onToggleConversationMuted}
          onTogglePinned={onToggleConversationPinned}
          onClearMessages={onClearConversation}
          onLeaveGroup={() => onLeaveGroupConversation(activeConversation)}
          onDismissGroup={() => onDismissGroupConversation(activeConversation)}
          onUploadImage={onUploadImage}
          onUpdateGroupConversation={onUpdateGroupConversation}
          onUpdateGroupBotEnabled={onUpdateGroupBotEnabled}
          onNotice={onNotice}
          onPreviewImage={(url) => setPreviewImage(url)}
        />
      </div>

      <ImagePreviewModal open={Boolean(previewImage)} images={previewImage ? [previewImage] : []} currentIndex={0} onClose={() => setPreviewImage("")} />
      {dragging ? <div className="drag-overlay">释放发送图片</div> : null}

      {activeFeature === "pinned" && activeConversation.type === "group" && (
        <GroupFeatureModal title={`群精华 - ${activeConversation.title}`} onClose={() => setActiveFeature(null)}>
          <PinnedMessages token={token} conversationId={activeConversation.id} myRole={groupConversation?.myRole || "member"} onJumpToMessage={setJumpToMessageId} onNotice={onNotice} />
        </GroupFeatureModal>
      )}
      {activeFeature === "files" && activeConversation.type === "group" && (
        <GroupFeatureModal title={`群文件 - ${activeConversation.title}`} onClose={() => setActiveFeature(null)}>
          <GroupFileManager token={token} conversationId={activeConversation.id} onNotice={onNotice} />
        </GroupFeatureModal>
      )}
      {activeFeature === "album" && activeConversation.type === "group" && (
        <GroupFeatureModal title={`群相册 - ${activeConversation.title}`} onClose={() => setActiveFeature(null)}>
          <GroupAlbum token={token} conversationId={activeConversation.id} onNotice={onNotice} />
        </GroupFeatureModal>
      )}
      {activeFeature === "vote" && activeConversation.type === "group" && (
        <VoteModal token={token} conversationId={activeConversation.id} conversationName={activeConversation.title} myRole={groupConversation?.myRole || "member"} onClose={() => setActiveFeature(null)} onNotice={onNotice} />
      )}
      {activeFeature === "solitaire" && activeConversation.type === "group" && (
        <SolitaireModal token={token} conversationId={activeConversation.id} conversationName={activeConversation.title} currentUserId={currentUserId} onClose={() => setActiveFeature(null)} onNotice={onNotice} />
      )}
    </div>
  );
}

const ChatView = {
  ConversationList,
  Main: ChatMain,
};

export default ChatView;
