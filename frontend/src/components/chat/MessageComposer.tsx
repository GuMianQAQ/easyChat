import { File, Image, Scissors, Smile } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CompletionGranularity, MessageQuote, PredictionScope } from "../../types/chat";
import { resolveApiUrl } from "../../config/env";
import { prepareImageDataUrl } from "../../utils/media";
import { useInputCompletion } from "../../hooks/useInputCompletion";
import { useQuestionPrediction } from "../../hooks/useQuestionPrediction";
import EmojiPicker from "./EmojiPicker";
import QuotePreview from "./QuotePreview";

interface MessageComposerProps {
  activeConversationId: string;
  content: string;
  disabled: boolean;
  disabledReason?: string;
  placeholderText?: string;
  enterToSend: boolean;
  clearAfterSend: boolean;
  quote?: MessageQuote | null;
  isAIAssistant?: boolean;
  aiReplySuggestions?: boolean;
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
  onCaptureScreen: (quote?: MessageQuote | null) => Promise<boolean>;
  onNotice: (title: string, content: string, level?: "info" | "success" | "warning" | "error") => void;
}

function MessageComposer({
  activeConversationId,
  content,
  disabled,
  disabledReason = "",
  placeholderText = "输入消息",
  enterToSend,
  clearAfterSend,
  quote,
  isAIAssistant,
  aiReplySuggestions,
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
  onCaptureScreen,
  onNotice,
}: MessageComposerProps) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const selectionRef = useRef({ start: 0, end: 0 });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const fetchSuggestion = useCallback(async () => {
    if (!isAIAssistant || !aiReplySuggestions || !token || !content.trim()) {
      setSuggestion("");
      return;
    }

    try {
      const resp = await fetch(resolveApiUrl("/api/ai/generate-replies"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: content }),
      });
      const data = await resp.json();
      if (resp.ok && data.replies && data.replies.length > 0) {
        setSuggestion(data.replies[0]);
      } else {
        setSuggestion("");
      }
    } catch {
      setSuggestion("");
    }
  }, [isAIAssistant, aiReplySuggestions, token, content]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!isAIAssistant || !aiReplySuggestions || !content.trim()) {
      setSuggestion("");
      return;
    }

    debounceRef.current = setTimeout(() => {
      void fetchSuggestion();
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [content, isAIAssistant, aiReplySuggestions, fetchSuggestion]);

  useEffect(() => {
    setEmojiOpen(false);
    setSuggestion("");
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
          placeholder={disabled ? disabledReason || "连接后才能发送消息" : placeholderText}
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
            if (event.key === "Tab" && completion) {
              event.preventDefault();
              onContentChange(content + completion);
              dismissCompletion();
            } else if (event.key === "Escape" && completion) {
              event.preventDefault();
              dismissCompletion();
            } else if (event.key === "Tab" && suggestion) {
              event.preventDefault();
              onContentChange(suggestion);
              setSuggestion("");
            } else if (event.key === "Escape" && suggestion) {
              event.preventDefault();
              setSuggestion("");
            } else if (enterToSend && event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
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

      {suggestion && isAIAssistant && aiReplySuggestions ? (
        <div className="ai-suggestions">
          <span className="ai-suggestion-text">{suggestion}</span>
          <span className="ai-suggestion-hint">按 Tab 补全</span>
        </div>
      ) : null}

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
