import { Mic, Scissors, Smile, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CompletionGranularity, ContactItem, GroupMemberItem, MessageQuote, PredictionScope } from "../../types/chat";
import { prepareImageDataUrl } from "../../utils/media";
import { useInputCompletion } from "../../hooks/useInputCompletion";
import { useQuestionPrediction } from "../../hooks/useQuestionPrediction";
import { useVoiceRecorder } from "../../hooks/useVoiceRecorder";
import ContactPicker from "./ContactPicker";
import EmojiPanel from "./EmojiPanel";
import MarkdownEditor from "./MarkdownEditor";
import MediaMenu from "./MediaMenu";
import MentionPicker from "./MentionPicker";
import QuotePreview from "./QuotePreview";
import VoiceRecorder from "./VoiceRecorder";

interface MessageComposerProps {
  activeConversationId: string;
  content: string;
  disabled: boolean;
  disabledReason?: string;
  placeholderText?: string;
  enterToSend: boolean;
  clearAfterSend: boolean;
  hideWindowOnCapture: boolean;
  quote?: MessageQuote | null;
  isAIAssistant?: boolean;
  isGroupChat?: boolean;
  groupMembers?: GroupMemberItem[];
  inputCompletion?: boolean;
  completionGranularity?: CompletionGranularity;
  completionScope?: PredictionScope;
  questionPrediction?: boolean;
  questionPredictionScope?: PredictionScope;
  token?: string;
  onClearQuote: () => void;
  onContentChange: (value: string) => void;
  onSendText: (content: string, quote?: MessageQuote | null) => boolean;
  onSendImage: (dataUrl: string, quote?: MessageQuote | null) => Promise<boolean>;
  onSendFile: (file: File, quote?: MessageQuote | null) => Promise<boolean>;
  onSendVoice: (audioBlob: Blob, duration: number, quote?: MessageQuote | null) => Promise<boolean>;
  onSendContact: (contactInfo: { userId: string; name: string; avatar: string; wechatId?: string }, quote?: MessageQuote | null) => boolean;
  onSendMarkdown: (content: string, quote?: MessageQuote | null) => boolean;
  onCaptureScreen: (hideWindow: boolean) => Promise<string | null>;
  onNotice: (title: string, content: string, level?: "info" | "success" | "warning" | "error") => void;
  favoriteStickers?: import("../../utils/chatApi").FavoriteSticker[];
  onStickerUpload?: (file: File) => Promise<void>;
  onStickerDelete?: (stickerId: string) => Promise<void>;
  contacts?: ContactItem[];
}

function MessageComposer({
  activeConversationId,
  content,
  disabled,
  disabledReason = "",
  placeholderText = "输入消息",
  enterToSend,
  clearAfterSend,
  hideWindowOnCapture,
  quote,
  isAIAssistant,
  isGroupChat,
  groupMembers = [],
  inputCompletion,
  completionGranularity = "simple",
  completionScope = "all",
  questionPrediction,
  questionPredictionScope = "all",
  token,
  onClearQuote,
  onContentChange,
  onSendText,
  onSendImage,
  onSendFile,
  onSendVoice,
  onSendContact,
  onSendMarkdown,
  onCaptureScreen,
  onNotice,
  favoriteStickers,
  onStickerUpload,
  onStickerDelete,
  contacts,
}: MessageComposerProps) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [mentionKeyword, setMentionKeyword] = useState<string | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const selectionRef = useRef({ start: 0, end: 0 });
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const [markdownEditorOpen, setMarkdownEditorOpen] = useState(false);
  const voiceRecorder = useVoiceRecorder();
  const recordingPromiseRef = useRef<Promise<{ blob: Blob; duration: number }> | null>(null);
  const startXRef = useRef(0);
  const cancelZoneRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isCancelZone, setIsCancelZone] = useState(false);

  const { completion, dismissCompletion } = useInputCompletion({
    content,
    enabled: inputCompletion ?? false,
    granularity: completionGranularity,
    scope: completionScope,
    isAIAssistant: isAIAssistant ?? false,
    token: token ?? "",
  });

  const { question, answer, dismiss: dismissPrediction } = useQuestionPrediction({
    content,
    enabled: questionPrediction ?? false,
    scope: questionPredictionScope,
    isAIAssistant: isAIAssistant ?? false,
    token: token ?? "",
  });

  const submit = async () => {
    const trimmed = content.trim();
    const hasScreenshot = screenshotPreview !== null;

    if (!trimmed && !hasScreenshot) {
      return;
    }

    let imageSent = false;
    if (hasScreenshot) {
      imageSent = await onSendImage(screenshotPreview, quote);
      if (imageSent) {
        setScreenshotPreview(null);
      }
    }

    if (trimmed) {
      if (onSendText(trimmed, quote)) {
        if (clearAfterSend) {
          onContentChange("");
        }
        onClearQuote();
      }
    } else if (imageSent) {
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

  const sendFile = async (file: File) => {
    try {
      if (await onSendFile(file, quote)) {
        onClearQuote();
      }
    } catch (error) {
      onNotice("文件", error instanceof Error ? error.message : "文件发送失败", "error");
    }
  };

  const handlePointerDown = async (e: React.PointerEvent) => {
    if (voiceRecorder.state !== "idle") return;
    startXRef.current = e.clientX;
    cancelZoneRef.current = false;
    setIsCancelZone(false);
    setIsRecording(true);

    // Capture pointer to track movement outside the button
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    recordingPromiseRef.current = voiceRecorder.start();

    try {
      const { blob, duration } = await recordingPromiseRef.current;
      if (!cancelZoneRef.current && blob.size > 0) {
        await onSendVoice(blob, duration, quote);
        onClearQuote();
      }
    } catch (error) {
      if (error instanceof Error && error.message !== "录音时间太短" && error.message !== "cancelled") {
        onNotice("语音", error.message, "error");
      }
    } finally {
      setIsRecording(false);
      setIsCancelZone(false);
      cancelZoneRef.current = false;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (voiceRecorder.state !== "recording") return;
    const dx = startXRef.current - e.clientX;
    const cancelZone = dx > 80;
    cancelZoneRef.current = cancelZone;
    setIsCancelZone(cancelZone);
  };

  const handlePointerUp = () => {
    if (voiceRecorder.state !== "recording") return;
    if (cancelZoneRef.current) {
      voiceRecorder.cancel();
    } else {
      voiceRecorder.stop();
    }
  };

  useEffect(() => {
    setEmojiOpen(false);
  }, [activeConversationId]);

  useEffect(() => {
    const handlePointer = (event: MouseEvent) => {
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
      {screenshotPreview ? (
        <div className="screenshot-preview">
          <img className="screenshot-preview-thumb" src={screenshotPreview} alt="截图预览" />
          <div className="screenshot-preview-actions">
            <button
              type="button"
              className="screenshot-preview-send"
              onClick={async () => {
                const sent = await onSendImage(screenshotPreview, quote);
                if (sent) {
                  setScreenshotPreview(null);
                  onClearQuote();
                }
              }}
            >
              发送
            </button>
            <button
              type="button"
              className="screenshot-preview-close"
              onClick={() => setScreenshotPreview(null)}
              title="取消截图"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : null}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void sendImageFile(file);
          }
          event.target.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void sendFile(file);
          }
          event.target.value = "";
        }}
      />

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
        <MediaMenu
          disabled={disabled}
          onFileSelect={() => fileInputRef.current?.click()}
          onContactSelect={() => setContactPickerOpen(true)}
          onMarkdownSelect={() => setMarkdownEditorOpen(true)}
        />
        <button
          type="button"
          title="按住录音，松手发送，左滑取消"
          disabled={disabled}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: "none" }}
        >
          <Mic size={18} />
        </button>
        <button
          type="button"
          title="截图"
          onClick={async () => {
            const dataUrl = await onCaptureScreen(hideWindowOnCapture);
            if (dataUrl) setScreenshotPreview(dataUrl);
          }}
        >
          <Scissors size={18} />
        </button>
      </div>

      {isRecording ? (
        <VoiceRecorder
          analyserNode={voiceRecorder.analyserNode}
          duration={voiceRecorder.duration}
          isCancelZone={isCancelZone}
          onCancel={() => { cancelZoneRef.current = true; voiceRecorder.cancel(); }}
          onSend={() => voiceRecorder.stop()}
        />
      ) : null}

      <div className="composer-input-wrap">
        {isGroupChat && mentionKeyword !== null && groupMembers.length > 0 ? (
          <MentionPicker
            members={groupMembers}
            keyword={mentionKeyword}
            onSelect={(member) => {
              const textarea = textareaRef.current;
              const { start } = selectionRef.current;
              const beforeCursor = content.slice(0, start);
              const atIndex = beforeCursor.lastIndexOf("@");
              if (atIndex >= 0) {
                const newContent = content.slice(0, atIndex) + `@${member.userId} ` + content.slice(start);
                onContentChange(newContent);
                requestAnimationFrame(() => {
                  const cursor = atIndex + member.userId.length + 2;
                  textarea?.setSelectionRange(cursor, cursor);
                  textarea?.focus();
                });
              }
              setMentionKeyword(null);
            }}
            onClose={() => setMentionKeyword(null)}
          />
        ) : null}
        <textarea
          ref={textareaRef}
          className="composer-input"
          value={content}
          maxLength={500}
          disabled={disabled}
          placeholder={disabled ? disabledReason || "连接后才能发送消息" : placeholderText}
          onChange={(event) => {
            const newValue = event.target.value;
            onContentChange(newValue);
            syncSelection();
            // Detect @ trigger for group chats
            if (isGroupChat) {
              const cursor = event.target.selectionStart ?? newValue.length;
              const beforeCursor = newValue.slice(0, cursor);
              const atIndex = beforeCursor.lastIndexOf("@");
              if (atIndex >= 0) {
                const afterAt = beforeCursor.slice(atIndex + 1);
                if (!afterAt.includes(" ") && afterAt.length <= 20) {
                  setMentionKeyword(afterAt);
                } else {
                  setMentionKeyword(null);
                }
              } else {
                setMentionKeyword(null);
              }
            }
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
            if (event.key === "Tab" && completion) {
              event.preventDefault();
              onContentChange(content + completion);
              dismissCompletion();
            } else if (event.key === "Escape" && completion) {
              event.preventDefault();
              dismissCompletion();
            } else if (enterToSend && event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
        />
        {completion ? (
          <div className="ghost-overlay" aria-hidden="true">
            <span className="ghost-text">{content}{completion}</span>
          </div>
        ) : null}
        {emojiOpen ? (
          <div className="composer-emoji-popover">
            <EmojiPanel
              onEmojiPick={(emoji) => {
                insertEmoji(emoji);
              }}
              onStickerSend={(_sticker) => {
                onNotice("表情", "收藏表情发送功能待实现", "info");
              }}
              favoriteStickers={favoriteStickers}
              onStickerUpload={onStickerUpload}
              onStickerDelete={onStickerDelete}
            />
          </div>
        ) : null}
      </div>

      {question && answer ? (
        <div className="question-prediction">
          <div className="question-prediction-header">你可能想知道:</div>
          <div className="question-prediction-content" onClick={() => {
            onContentChange(question);
            dismissPrediction();
          }}>
            <span className="question-prediction-question">{question}</span>
            <span className="question-prediction-answer">→ {answer}</span>
          </div>
        </div>
      ) : null}

      <div className="composer-footer">
        <span>{content.trim().length}/500</span>
        <button
          type="button"
          className="composer-send"
          disabled={disabled || (!content.trim() && !screenshotPreview)}
          onClick={() => void submit()}
        >
          发送
        </button>
      </div>

      <ContactPicker
        isOpen={contactPickerOpen}
        contacts={(contacts || []).map((c) => ({ userId: c.id, name: c.name, avatar: c.avatar, wechatId: c.username || c.id }))}
        onSelect={(contact) => {
          onSendContact(contact, quote);
          onClearQuote();
        }}
        onClose={() => setContactPickerOpen(false)}
      />
      <MarkdownEditor
        isOpen={markdownEditorOpen}
        onSend={(mdContent) => {
          onSendMarkdown(mdContent, quote);
          onClearQuote();
        }}
        onClose={() => setMarkdownEditorOpen(false)}
      />
    </div>
  );
}

export default MessageComposer;
