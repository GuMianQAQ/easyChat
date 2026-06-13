import { useCallback, useRef, useState } from "react";
import { 
  Bold, Italic, Strikethrough, List, ListOrdered, 
  Link, Code, Quote, X, Eye 
} from "lucide-react";
import MarkdownContent from "./MarkdownContent";

const TOOLBAR_ITEMS = [
  { icon: Bold, label: "粗体", prefix: "**", suffix: "**" },
  { icon: Italic, label: "斜体", prefix: "*", suffix: "*" },
  { icon: Strikethrough, label: "删除线", prefix: "~~", suffix: "~~" },
  { icon: List, label: "无序列表", prefix: "- ", suffix: "" },
  { icon: ListOrdered, label: "有序列表", prefix: "1. ", suffix: "" },
  { icon: Link, label: "链接", prefix: "[", suffix: "](url)" },
  { icon: Code, label: "代码", prefix: "`", suffix: "`" },
  { icon: Quote, label: "引用", prefix: "> ", suffix: "" },
];

interface MarkdownEditorProps {
  isOpen: boolean;
  onSend: (content: string) => void;
  onClose: () => void;
}

function MarkdownEditor({
  isOpen,
  onSend,
  onClose,
}: MarkdownEditorProps) {
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (content.trim()) {
      onSend(content.trim());
      setContent("");
      onClose();
    }
  }, [content, onSend, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSend();
      }
    },
    [onClose, handleSend]
  );

  const insertMarkdown = useCallback(
    (prefix: string, suffix: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = content.slice(start, end);
      const replacement = `${prefix}${selected || "文本"}${suffix}`;

      setContent(
        content.slice(0, start) + replacement + content.slice(end)
      );

      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        const newStart = start + prefix.length;
        const newEnd = newStart + (selected || "文本").length;
        textarea.setSelectionRange(newStart, newEnd);
      }, 0);
    },
    [content]
  );

  if (!isOpen) return null;

  return (
    <div className="markdown-editor-overlay" onClick={onClose}>
      <div className="markdown-editor" role="dialog" aria-modal="true" aria-label="Markdown 编辑器" onClick={(e) => e.stopPropagation()}>
        <div className="markdown-editor-header">
          <h3>Markdown 编辑</h3>
          <div className="markdown-editor-actions">
            <button
              type="button"
              className={`markdown-editor-preview-btn ${preview ? "active" : ""}`}
              onClick={() => setPreview((prev) => !prev)}
            >
              <Eye size={16} />
              <span>{preview ? "编辑" : "预览"}</span>
            </button>
            <button type="button" className="markdown-editor-close" aria-label="关闭" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {!preview ? (
          <>
            <div className="markdown-editor-toolbar">
              {TOOLBAR_ITEMS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="markdown-toolbar-btn"
                  title={item.label}
                  onClick={() => insertMarkdown(item.prefix, item.suffix)}
                >
                  <item.icon size={16} />
                </button>
              ))}
            </div>
            <div className="markdown-editor-body">
              <textarea
                ref={textareaRef}
                className="markdown-editor-textarea"
                placeholder="输入 Markdown 内容..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                autoFocus
              />
            </div>
          </>
        ) : (
          <div className="markdown-editor-preview">
            <MarkdownContent content={content || "*暂无内容*"} />
          </div>
        )}

        <div className="markdown-editor-footer">
          <span className="markdown-editor-hint">Ctrl+Enter 发送</span>
          <button
            type="button"
            className="markdown-editor-send"
            disabled={!content.trim()}
            onClick={handleSend}
          >
            提交
          </button>
        </div>
      </div>
    </div>
  );
}

export default MarkdownEditor;
