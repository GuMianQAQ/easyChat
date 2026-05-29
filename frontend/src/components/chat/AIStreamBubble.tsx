import { useEffect, useRef } from "react";
import { useAIStream } from "../../hooks/useAIStream";

interface AIStreamBubbleProps {
  query: string;
  token?: string;
  autoStart?: boolean;
  onComplete?: (content: string) => void;
}

export default function AIStreamBubble({
  query,
  token = "",
  autoStart = true,
  onComplete,
}: AIStreamBubbleProps) {
  const { content, loading, error, stream } = useAIStream({
    token,
  });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoStart && query) {
      stream(query);
    }
  }, [autoStart, query, stream]);

  useEffect(() => {
    if (!loading && content && onComplete) {
      onComplete(content);
    }
  }, [loading, content, onComplete]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [content]);

  return (
    <div className="ai-stream-bubble">
      <div className="ai-stream-avatar">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6366f1"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a3 3 0 0 1 3 3v1a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
          <path d="M19 9H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2z" />
          <circle cx="9" cy="13" r="1" fill="#6366f1" />
          <circle cx="15" cy="13" r="1" fill="#6366f1" />
        </svg>
      </div>

      <div className="ai-stream-content">
        {loading && !content && (
          <div className="ai-stream-loading">
            <span className="ai-stream-dot" />
            <span className="ai-stream-dot" />
            <span className="ai-stream-dot" />
          </div>
        )}

        {error && <div className="ai-stream-error">{error}</div>}

        {content && (
          <div ref={containerRef} className="ai-stream-text">
            {content}
            {loading && <span className="ai-stream-cursor" />}
          </div>
        )}
      </div>
    </div>
  );
}
