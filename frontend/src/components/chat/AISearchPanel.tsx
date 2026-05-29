import { useState, useCallback } from "react";

interface AISearchPanelProps {
  token: string;
  conversationId: string;
  onClose: () => void;
}

export default function AISearchPanel({ token, conversationId, onClose }: AISearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const url = `/api/ai/search?q=${encodeURIComponent(trimmed)}&conversationId=${encodeURIComponent(conversationId)}`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (resp.ok) {
        setResults(data.results || []);
      } else {
        setError(data.error || "搜索失败");
      }
    } catch {
      setError("搜索请求失败");
    } finally {
      setLoading(false);
    }
  }, [query, conversationId, token]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      void handleSearch();
    }
  };

  return (
    <div className="ai-search-panel">
      <div className="ai-search-header">
        <span>AI 语义搜索</span>
        <button type="button" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="ai-search-input-wrap">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="用自然语言搜索..."
          className="ai-search-input"
        />
        <button
          type="button"
          onClick={() => void handleSearch()}
          disabled={loading}
          className="ai-search-btn"
        >
          {loading ? "搜索中..." : "搜索"}
        </button>
      </div>
      {error && <div className="ai-search-error">{error}</div>}
      {results.length > 0 && (
        <div className="ai-search-results">
          {results.map((item, index) => (
            <div key={index} className="ai-search-result-item">
              {item}
            </div>
          ))}
        </div>
      )}
      {!loading && results.length === 0 && query.trim() && !error && (
        <div className="ai-search-empty">没有找到相关内容</div>
      )}
    </div>
  );
}
