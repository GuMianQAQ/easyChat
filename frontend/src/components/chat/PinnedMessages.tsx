import { useEffect, useState } from "react";
import { Pin, PinOff, MessageCircle } from "lucide-react";
import type { ChatMessage } from "../../types/chat";
import { getPinnedMessages, unpinMessage } from "../../utils/chatApi";

interface PinnedMessagesProps {
  token: string;
  conversationId: string;
  myRole: "owner" | "admin" | "member";
  onJumpToMessage: (messageId: string) => void;
  onNotice: (title: string, content: string, level?: "info" | "success" | "warning" | "error") => void;
}

export default function PinnedMessages({
  token,
  conversationId,
  myRole,
  onJumpToMessage,
  onNotice,
}: PinnedMessagesProps) {
  const [pins, setPins] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPins = async () => {
    setLoading(true);
    try {
      const data = await getPinnedMessages(token, conversationId);
      setPins(data as ChatMessage[]);
    } catch (error) {
      onNotice("精华消息", error instanceof Error ? error.message : "加载失败", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPins();
  }, [conversationId]);

  const handleUnpin = async (messageId: string) => {
    try {
      await unpinMessage(token, conversationId, messageId);
      setPins((prev) => prev.filter((p) => p.id !== messageId));
      onNotice("精华消息", "已取消精华", "success");
    } catch (error) {
      onNotice("精华消息", error instanceof Error ? error.message : "操作失败", "error");
    }
  };

  if (loading) {
    return <div className="pinned-messages-loading">加载中...</div>;
  }

  if (pins.length === 0) {
    return (
      <div className="pinned-messages-empty">
        <Pin size={32} />
        <p>暂无精华消息</p>
      </div>
    );
  }

  return (
    <div className="pinned-messages-list">
      {pins.map((pin) => (
        <div key={pin.id} className="pinned-message-item">
          <div className="pinned-message-header">
            <span className="pinned-message-sender">{pin.senderName}</span>
            <span className="pinned-message-time">{pin.createdAt}</span>
          </div>
          <div className="pinned-message-content">
            {pin.messageType === "image" ? "[图片]" : pin.content}
          </div>
          <div className="pinned-message-actions">
            <button
              type="button"
              className="pinned-message-jump"
              onClick={() => onJumpToMessage(pin.id)}
              title="定位原消息"
            >
              <MessageCircle size={14} />
              定位
            </button>
            {(myRole === "owner" || myRole === "admin") && (
              <button
                type="button"
                className="pinned-message-unpin"
                onClick={() => handleUnpin(pin.id)}
                title="取消精华"
              >
                <PinOff size={14} />
                取消
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
