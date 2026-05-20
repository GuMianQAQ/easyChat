import { File, Image, Scissors, Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MessageQuote } from "../../types/chat";
import { prepareImageDataUrl } from "../../utils/media";
import EmojiPicker from "./EmojiPicker";
import QuotePreview from "./QuotePreview";

interface MessageComposerProps {
  activeConversationId: string;
  content: string;
  disabled: boolean;
  disabledReason?: string;
  enterToSend: boolean;
  clearAfterSend: boolean;
  quote?: MessageQuote | null;
  onClearQuote: () => void;
  onContentChange: (value: string) => void;
  onSendText: (content: string, quote?: MessageQuote | null) => boolean;
  onSendImage: (dataUrl: string, quote?: MessageQuote | null) => Promise<boolean>;
  onCaptureScreen: (quote?: MessageQuote | null) => Promise<boolean>;
  onNotice: (title: string, content: string, level?: "info" | "success" | "warning" | "error") => void;
}

function MessageComposer({
  activeConversationId,
  content,
  disabled,
  disabledReason = "",
  enterToSend,
  clearAfterSend,
  quote,
  onClearQuote,
  onContentChange,
  onSendText,
  onSendImage,
  onCaptureScreen,
  onNotice,
}: MessageComposerProps) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const selectionRef = useRef({ start: 0, end: 0 });

  const submit = () => {
    const trimmed = content.trim();
    if (!trimmed) {
      return;
    }
    if (onSendText(trimmed, quote)) {
      if (clearAfterSend) {
        onContentChange("");
      }
      onClearQuote();
    }
  };

  const syncSelection = () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    selectionRef.current = {
      start: textarea.selectionStart ?? content.length,
      end: textarea.selectionEnd ?? content.length,
    };
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    const { start, end } = selectionRef.current;
    const nextValue = `${content.slice(0, start)}${emoji}${content.slice(end)}`;
    const nextCursor = start + emoji.length;
    onContentChange(nextValue);
    setEmojiOpen(true);
    requestAnimationFrame(() => {
      textarea?.focus();
      if (textarea) {
        textarea.setSelectionRange(nextCursor, nextCursor);
        selectionRef.current = { start: nextCursor, end: nextCursor };
      }
    });
  };

  const sendImageFile = async (file: File) => {
    try {
      const dataUrl = await prepareImageDataUrl(file);
      if (await onSendImage(dataUrl, quote)) {
        onClearQuote();
      }
    } catch (error) {
      onNotice("图片", error instanceof Error ? error.message : "图片发送失败", "error");
    }
  };

  useEffect(() => {
    setEmojiOpen(false);
  }, [activeConversationId]);

  useEffect(() => {
    const handlePointer = (event: MouseEvent | globalThis.MouseEvent) => {
      if (!emojiOpen) {
        return;
      }
      if (composerRef.current?.contains(event.target as Node)) {
        return;
      }
      setEmojiOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setEmojiOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointer);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointer);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [emojiOpen]);

  return (
    <div ref={composerRef} className="composer">
      {quote ? <QuotePreview quote={quote} onClear={onClearQuote} /> : null}

      <div className="composer-toolbar">
        <button
          type="button"
          className={emojiOpen ? "composer-toolbar-active" : ""}
          title="表情"
          aria-label="表情"
          disabled={disabled}
          onClick={() => setEmojiOpen((open) => !open)}
        >
          <Smile size={18} />
        </button>
        <button type="button" disabled title="图片">
          <Image size={18} />
        </button>
        <button type="button" disabled title="文件">
          <File size={18} />
        </button>
        <button
          type="button"
          title="截图"
        onClick={async () => {
          const sent = await onCaptureScreen(quote);
            if (sent) {
              onClearQuote();
            }
          }}
        >
          <Scissors size={18} />
        </button>
      </div>

      <div className="composer-input-wrap">
        <textarea
          ref={textareaRef}
          className="composer-input"
          value={content}
          maxLength={500}
          disabled={disabled}
          placeholder={disabled ? disabledReason || "连接后才能发送消息" : "输入消息"}
          onChange={(event) => {
            onContentChange(event.target.value);
            syncSelection();
          }}
          onSelect={syncSelection}
          onKeyUp={syncSelection}
          onClick={() => {
            syncSelection();
            setEmojiOpen(false);
          }}
          onFocus={() => {
            syncSelection();
            setEmojiOpen(false);
          }}
          onPaste={async (event) => {
            const items = Array.from(event.clipboardData.items);
            const imageItem = items.find((item) => item.type.startsWith("image/"));
            if (!imageItem) {
              return;
            }
            const file = imageItem.getAsFile();
            if (!file) {
              return;
            }
            event.preventDefault();
            await sendImageFile(file);
          }}
          onKeyDown={(event) => {
            if (enterToSend && event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />
        {emojiOpen ? (
          <div className="composer-emoji-popover">
            <EmojiPicker
              onPick={(emoji, event) => {
                event.preventDefault();
                event.stopPropagation();
                insertEmoji(emoji);
              }}
            />
          </div>
        ) : null}
      </div>

      <div className="composer-footer">
        <span>{content.trim().length}/500</span>
        <button
          type="button"
          className="composer-send"
          disabled={disabled || !content.trim()}
          onClick={submit}
        >
          发送
        </button>
      </div>
    </div>
  );
}

export default MessageComposer;
