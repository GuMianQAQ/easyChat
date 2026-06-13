import { useCallback, useMemo, useState } from "react";
import { Check, Copy, ChevronDown, ChevronUp } from "lucide-react";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";

interface CodeBlockProps {
  code: string;
  language?: string;
  maxHeight?: number;
}

const MAX_LINES_DEFAULT = 20;

function CodeBlock({
  code,
  language = "",
  maxHeight = MAX_LINES_DEFAULT,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const lines = code.split("\n");
  const isLong = lines.length > maxHeight;

  const { highlighted, detectedLanguage } = useMemo(() => {
    const result = language
      ? hljs.highlight(code, { language, ignoreIllegals: true })
      : hljs.highlightAuto(code);
    return {
      highlighted: result.value,
      detectedLanguage: language || result.language || "text",
    };
  }, [code, language]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-block-language">{detectedLanguage}</span>
        <button
          type="button"
          className="code-block-copy"
          onClick={(e) => {
            e.stopPropagation();
            void handleCopy();
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? "已复制" : "复制"}</span>
        </button>
      </div>
      <div
        className={`code-block-content ${isLong && !expanded ? "code-block-collapsed" : ""}`}
        style={isLong && !expanded ? { maxHeight: `${maxHeight * 20}px` } : undefined}
      >
        <pre>
          <code
            className={`hljs language-${detectedLanguage}`}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      </div>
      {isLong ? (
        <button
          type="button"
          className="code-block-expand"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((prev) => !prev);
          }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <span>{expanded ? "收起" : `展开全部 ${lines.length} 行`}</span>
        </button>
      ) : null}
    </div>
  );
}

export default CodeBlock;
