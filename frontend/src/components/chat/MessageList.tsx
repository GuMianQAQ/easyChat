import {
  Copy,
  Expand,
  Languages,
  MessageCircleMore,
  Pin,
  Quote,
  RotateCcw,
  Star,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { ChatMessage, GroupMemberItem } from "../../types/chat";
import { formatDividerTime, shouldShowTimeDivider } from "../../utils/time";
import EmptyState from "../common/EmptyState";
import MessageContextMenu, { type ContextMenuAction } from "./MessageContextMenu";
import MessageBubble from "./MessageBubble";

interface MessageListProps {
  messages: ChatMessage[];
  hasMore: boolean;
  loadingMore: boolean;
  favoriteIds: Set<string>;
  jumpToMessageId?: string;
  groupMembers?: GroupMemberItem[];
  isGroupChat?: boolean;
  onJumpHandled?: () => void;
  onJumpMissing?: () => void;
  onLoadMore: () => void;
  onToggleFavorite: (message: ChatMessage) => void;
  onCopyMessage: (message: ChatMessage) => void;
  onOpenProfile: (message: ChatMessage, event: ReactMouseEvent<HTMLElement>) => void;
  onPreviewImage: (message: ChatMessage) => void;
  onCreateQuote: (message: ChatMessage) => void;
  onDeleteLocal: (messageId: string) => void;
  onRevoke: (message: ChatMessage) => void;
  onRetry: (messageId: string) => void;
  onTranslate?: (message: ChatMessage) => void;
  onPinMessage?: (message: ChatMessage) => void;
  streamingContent?: string;
  streamingLoading?: boolean;
}

interface ContextMenuState {
  message: ChatMessage;
  x: number;
  y: number;
}

function parseMessageTime(value: string): number | null {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.getTime();
}

function isRevocable(message: ChatMessage): boolean {
  if (!message.isSelf || message.revoked || message.status === "failed") {
    return false;
  }
  const createdAt = parseMessageTime(message.createdAt);
  if (createdAt === null) {
    return true;
  }
  return Date.now() - createdAt <= 2 * 60 * 1000;
}

function MessageList({
  messages,
  hasMore,
  loadingMore,
  favoriteIds,
  jumpToMessageId,
  groupMembers = [],
  isGroupChat = false,
  onJumpHandled,
  onJumpMissing,
  onLoadMore,
  onToggleFavorite,
  onCopyMessage,
  onOpenProfile,
  onPreviewImage,
  onCreateQuote,
  onDeleteLocal,
  onRevoke,
  onRetry,
  onTranslate,
  onPinMessage,
  streamingContent,
  streamingLoading,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const elementMapRef = useRef(new Map<string, HTMLDivElement>());
  const timerRef = useRef<number | null>(null);
  const prependSnapshotRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [highlightedId, setHighlightedId] = useState("");

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    if (prependSnapshotRef.current && !loadingMore) {
      const snapshot = prependSnapshotRef.current;
      containerRef.current.scrollTop =
        containerRef.current.scrollHeight - snapshot.scrollHeight + snapshot.scrollTop;
      prependSnapshotRef.current = null;
    } else {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
    setContextMenu(null);
  }, [loadingMore, messages]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }
      setContextMenu(null);
    };
    const close = () => setContextMenu(null);
    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", close);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const jumpToMessage = (messageId: string) => {
    const element = elementMapRef.current.get(messageId);
    if (!element) {
      return false;
    }

    element.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedId(messageId);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => setHighlightedId(""), 1500);
    return true;
  };

  useEffect(() => {
    if (!jumpToMessageId) {
      return;
    }
    if (jumpToMessage(jumpToMessageId)) {
      onJumpHandled?.();
      return;
    }
    onJumpMissing?.();
    onJumpHandled?.();
  }, [jumpToMessageId, onJumpHandled, onJumpMissing]);

  const contextActions = (message: ChatMessage): ContextMenuAction[] => {
    const actions: ContextMenuAction[] = [];

    if (!message.revoked) {
      actions.push({
        key: "quote",
        label: "引用",
        icon: <Quote size={14} />,
        onClick: () => {
          onCreateQuote(message);
          setContextMenu(null);
        },
      });
    }

    if (!message.revoked && message.messageType === "text") {
      actions.push({
        key: "copy",
        label: "复制",
        icon: <Copy size={14} />,
        onClick: () => {
          void onCopyMessage(message);
          setContextMenu(null);
        },
      });
      if (onTranslate) {
        actions.push({
          key: "translate",
          label: "翻译",
          icon: <Languages size={14} />,
          onClick: () => {
            onTranslate(message);
            setContextMenu(null);
          },
        });
      }
    } else if (!message.revoked && message.messageType === "image") {
      actions.push({
        key: "preview",
        label: "查看大图",
        icon: <Expand size={14} />,
        onClick: () => {
          onPreviewImage(message);
          setContextMenu(null);
        },
      });
    }

    if (!message.revoked) {
      const favorited = favoriteIds.has(message.id);
      actions.push({
        key: "favorite",
        label: favorited ? "取消收藏" : "收藏",
        icon: <Star size={14} />,
        onClick: () => {
          onToggleFavorite(message);
          setContextMenu(null);
        },
      });
    }

    if (!message.revoked && isGroupChat && onPinMessage) {
      actions.push({
        key: "pin",
        label: "设为精华",
        icon: <Pin size={14} />,
        onClick: () => {
          onPinMessage(message);
          setContextMenu(null);
        },
      });
    }

    actions.push({
      key: "delete",
      label: "删除本地记录",
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: () => {
        onDeleteLocal(message.id);
        setContextMenu(null);
      },
    });

    if (isRevocable(message)) {
      actions.push({
        key: "revoke",
        label: "撤回",
        icon: <RotateCcw size={14} />,
        onClick: () => {
          onRevoke(message);
          setContextMenu(null);
        },
      });
    }

    return actions;
  };

  return (
    <section
      ref={containerRef}
      className="message-list"
      onScroll={() => {
        if (!containerRef.current || loadingMore || !hasMore) {
          return;
        }
        if (containerRef.current.scrollTop > 24) {
          return;
        }
        prependSnapshotRef.current = {
          scrollHeight: containerRef.current.scrollHeight,
          scrollTop: containerRef.current.scrollTop,
        };
        onLoadMore();
      }}
    >
      {messages.length === 0 ? (
        <EmptyState icon={MessageCircleMore} title="暂无消息" />
      ) : (
        messages.map((message, index) => {
          const previous = messages[index - 1];
          const showDivider =
            message.type === "chat" && shouldShowTimeDivider(previous?.createdAt || "", message.createdAt);

          if (message.type === "system" || message.type === "error") {
            return (
              <div key={message.id}>
                <div
                  className={`system-message ${
                    message.type === "error" ? "system-message-error" : ""
                  }`}
                >
                  {message.content}
                </div>
              </div>
            );
          }

          return (
            <div
              key={message.id}
              ref={(element) => {
                if (element) {
                  elementMapRef.current.set(message.id, element);
                } else {
                  elementMapRef.current.delete(message.id);
                }
              }}
            >
              {showDivider ? (
                <div className="message-time-divider">{formatDividerTime(message.createdAt)}</div>
              ) : null}
              <MessageBubble
                message={message}
                favorite={favoriteIds.has(message.id)}
                highlighted={highlightedId === message.id}
                groupMembers={groupMembers}
                onContextMenu={(nextMessage, event) => {
                  if (window.getSelection()?.toString()) {
                    return;
                  }
                  event.preventDefault();
                  setContextMenu({
                    message: nextMessage,
                    x: event.clientX,
                    y: event.clientY,
                  });
                }}
                onOpenProfile={onOpenProfile}
                onPreviewImage={onPreviewImage}
                onJumpToQuote={jumpToMessage}
                onRetry={onRetry}
              />
            </div>
          );
        })
      )}

      {streamingContent ? (
        <div className="message-row">
          <div className="message-stack">
            <div className="message-meta">
              <span>AI 助手</span>
            </div>
            <div className="message-bubble-wrap">
              <article className="message-bubble message-bubble-other">
                <div className="message-content">
                  {streamingContent}
                  {streamingLoading ? <span className="ai-stream-cursor" /> : null}
                </div>
              </article>
            </div>
          </div>
        </div>
      ) : null}

      {contextMenu ? (
        <div ref={menuRef}>
          <MessageContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            actions={contextActions(contextMenu.message)}
          />
        </div>
      ) : null}
    </section>
  );
}

export default MessageList;
