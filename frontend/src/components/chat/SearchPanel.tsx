import { ArrowLeft, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ContactItem, Conversation } from "../../types/chat";
import { resolveApiUrl } from "../../config/env";
import Avatar from "../common/Avatar";

interface SearchResultItem {
  messageId: string;
  conversationId: string;
  conversationName: string;
  senderName: string;
  content: string;
  createdAt: string;
  score: number;
}

interface SearchPanelProps {
  conversations: Conversation[];
  contacts: ContactItem[];
  aiSearchEnabled: boolean;
  token: string;
  onSelectConversation: (conversationId: string, messageId?: string) => void;
  onClose: () => void;
}

function SearchPanel({
  conversations,
  contacts,
  aiSearchEnabled,
  token,
  onSelectConversation,
  onClose,
}: SearchPanelProps) {
  const [keyword, setKeyword] = useState("");
  const [aiResults, setAiResults] = useState<SearchResultItem[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const keywordLower = useMemo(() => keyword.trim().toLowerCase(), [keyword]);

  const filteredContacts = keywordLower
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(keywordLower) ||
          (c.username && c.username.toLowerCase().includes(keywordLower)),
      )
    : [];

  const filteredGroups = keywordLower
    ? conversations.filter(
        (c) => c.type === "group" && c.title.toLowerCase().includes(keywordLower),
      )
    : [];

  const fetchAiResults = useCallback(async () => {
    if (!keywordLower || !aiSearchEnabled || !token) {
      setAiResults([]);
      return;
    }

    setAiLoading(true);
    try {
      const resp = await fetch(resolveApiUrl(`/api/ai/search?q=${encodeURIComponent(keyword)}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (resp.ok) {
        setAiResults(data.results || []);
      } else {
        setAiResults([]);
      }
    } catch {
      setAiResults([]);
    } finally {
      setAiLoading(false);
    }
  }, [keyword, keywordLower, aiSearchEnabled, token]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!keywordLower || !aiSearchEnabled) {
      setAiResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      void fetchAiResults();
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [keywordLower, aiSearchEnabled, fetchAiResults]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      onClose();
    }
  };

  const hasResults = filteredContacts.length > 0 || filteredGroups.length > 0 || aiResults.length > 0;

  return (
    <div className="search-panel">
      <div className="search-panel-header">
        <button type="button" className="search-panel-back" onClick={onClose}>
          <ArrowLeft size={18} />
        </button>
        <div className="search-panel-input-wrap">
          <Search size={16} />
          <input
            ref={inputRef}
            type="text"
            className="search-panel-input"
            placeholder="搜索联系人、群聊、聊天记录"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>

      <div className="search-panel-content">
        {!keywordLower ? (
          <div className="search-panel-empty">输入关键词搜索</div>
        ) : !hasResults && !aiLoading ? (
          <div className="search-panel-empty">没有找到相关内容</div>
        ) : (
          <>
            {filteredContacts.length > 0 && (
              <div className="search-section">
                <div className="search-section-title">联系人</div>
                {filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    className="search-result-item"
                    onClick={() => {
                      const conv = conversations.find(
                        (c) => c.type === "private" && c.targetUserId === contact.friendId,
                      );
                      if (conv) {
                        onSelectConversation(conv.id);
                      }
                      onClose();
                    }}
                  >
                    <Avatar name={contact.name} src={contact.avatar} size="sm" />
                    <div className="search-result-content">
                      <div className="search-result-name">{contact.name}</div>
                      {contact.username && (
                        <div className="search-result-preview">账号: {contact.username}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {filteredGroups.length > 0 && (
              <div className="search-section">
                <div className="search-section-title">群聊</div>
                {filteredGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    className="search-result-item"
                    onClick={() => {
                      onSelectConversation(group.id);
                      onClose();
                    }}
                  >
                    <Avatar name={group.title} src={group.avatar} size="sm" />
                    <div className="search-result-content">
                      <div className="search-result-name">{group.title}</div>
                      <div className="search-result-preview">
                        {group.memberCount || 0} 人
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {aiSearchEnabled && (
              <div className="search-section">
                <div className="search-section-title">
                  聊天记录
                  {aiLoading && <span className="search-section-loading">搜索中...</span>}
                </div>
                {aiResults.map((result, index) => (
                  <button
                    key={`${result.messageId}-${index}`}
                    type="button"
                    className="search-result-item"
                    onClick={() => {
                      onSelectConversation(result.conversationId, result.messageId);
                      onClose();
                    }}
                  >
                    <div className="search-result-content">
                      <div className="search-result-name">
                        {result.conversationName}
                        {result.senderName && ` - ${result.senderName}`}
                      </div>
                      <div className="search-result-preview">{result.content}</div>
                      <div className="search-result-meta">{result.createdAt}</div>
                    </div>
                  </button>
                ))}
                {!aiLoading && aiResults.length === 0 && keywordLower && (
                  <div className="search-panel-empty">没有找到相关聊天记录</div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default SearchPanel;
