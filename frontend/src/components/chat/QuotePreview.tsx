import { X } from "lucide-react";
import type { MessageQuote } from "../../types/chat";

function summarizeQuote(quote: MessageQuote): string {
  if (quote.messageType === "image") {
    return "[图片]";
  }
  return quote.content.length > 40 ? `${quote.content.slice(0, 40)}…` : quote.content;
}

interface QuotePreviewProps {
  quote: MessageQuote;
  onClear: () => void;
}

function QuotePreview({ quote, onClear }: QuotePreviewProps) {
  return (
    <div className="quote-preview">
      <div className="quote-preview-copy">
        <strong>{quote.username}</strong>
        <span>{summarizeQuote(quote)}</span>
      </div>
      <button type="button" className="quote-preview-close" onClick={onClear} aria-label="取消引用">
        <X size={14} />
      </button>
    </div>
  );
}

export default QuotePreview;
