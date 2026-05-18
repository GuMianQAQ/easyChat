import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { UserProfile } from "../../types/chat";
import Avatar from "../common/Avatar";

interface AddFriendPanelProps {
  open: boolean;
  currentNickname: string;
  currentUsername: string;
  searchResult: UserProfile | null;
  searching: boolean;
  submitting: boolean;
  error: string;
  onClose: () => void;
  onSearch: (username: string) => void;
  onSendRequest: (message: string) => void;
  onOpenChat: (profile: UserProfile) => void;
  onAcceptRequest: (profile: UserProfile) => void;
  onOpenProfile: (profile: UserProfile, event: ReactMouseEvent<HTMLElement>) => void;
}

function AddFriendPanel({
  open,
  currentNickname,
  currentUsername,
  searchResult,
  searching,
  submitting,
  error,
  onClose,
  onSearch,
  onSendRequest,
  onOpenChat,
  onAcceptRequest,
  onOpenProfile,
}: AddFriendPanelProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const lastPrefillKey = useRef<string>("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");

  const defaultMessage = `\u6211\u662f${currentNickname || currentUsername}`;
  const showRequestEditor =
    Boolean(searchResult) &&
    !searchResult?.isSelf &&
    !searchResult?.isFriend &&
    searchResult?.allowFriendRequest &&
    searchResult.requestStatus === "none";

  useEffect(() => {
    if (!open) {
      lastPrefillKey.current = "";
      return;
    }

    const handlePointer = (event: MouseEvent) => {
      if (ref.current?.contains(event.target as Node)) {
        return;
      }
      onClose();
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("mousedown", handlePointer);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointer);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open || !showRequestEditor || !searchResult) {
      return;
    }
    if (lastPrefillKey.current === searchResult.id) {
      return;
    }
    lastPrefillKey.current = searchResult.id;
    setMessage(defaultMessage);
  }, [defaultMessage, open, searchResult, showRequestEditor]);

  if (!open) {
    return null;
  }

  const renderPrimaryAction = () => {
    if (!searchResult) {
      return null;
    }
    if (searchResult.isSelf) {
      return (
        <button type="button" className="header-action" disabled>
          {"\u8fd9\u662f\u4f60\u81ea\u5df1"}
        </button>
      );
    }
    if (searchResult.isFriend || searchResult.requestStatus === "accepted") {
      return (
        <button
          type="button"
          className="header-action header-action-primary add-friend-submit"
          onClick={() => onOpenChat(searchResult)}
        >
          {"\u53d1\u6d88\u606f"}
        </button>
      );
    }
    if (!searchResult.allowFriendRequest) {
      return (
        <button type="button" className="header-action" disabled>
          {"\u65e0\u6cd5\u6dfb\u52a0"}
        </button>
      );
    }
    if (searchResult.requestStatus === "pending") {
      return (
        <button type="button" className="header-action" disabled>
          {"\u5df2\u7533\u8bf7"}
        </button>
      );
    }
    if (searchResult.requestStatus === "received") {
      return (
        <button
          type="button"
          className="header-action header-action-primary add-friend-submit"
          onClick={() => onAcceptRequest(searchResult)}
        >
          {"\u901a\u8fc7\u7533\u8bf7"}
        </button>
      );
    }
    return (
      <button
        type="button"
        className="header-action header-action-primary add-friend-submit"
        disabled={submitting}
        onClick={() => onSendRequest(message)}
      >
        {submitting ? "\u63d0\u4ea4\u4e2d..." : "\u6dfb\u52a0\u5230\u901a\u8baf\u5f55"}
      </button>
    );
  };

  return (
    <div className="add-friend-overlay">
      <div ref={ref} className="add-friend-panel">
        <div className="add-friend-header">
          <div className="add-friend-title">
            <strong>{"\u6dfb\u52a0\u597d\u53cb"}</strong>
          </div>
          <button type="button" className="header-action add-friend-close" onClick={onClose} aria-label={"\u5173\u95ed"}>
            <X size={14} />
          </button>
        </div>

        <label className="conversation-search add-friend-search">
          <Search size={16} />
          <input
            type="text"
            placeholder={"\u8bf7\u8f93\u5165\u5b8c\u6574\u8d26\u53f7"}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSearch(username);
              }
            }}
          />
          <button type="button" className="conversation-plus add-friend-search-button" onClick={() => onSearch(username)}>
            {searching ? "\u641c\u7d22\u4e2d..." : "\u641c\u7d22"}
          </button>
        </label>

        {searchResult ? (
          <div className="add-friend-result">
            <div className="add-friend-user-card">
              <button
                type="button"
                className="avatar-trigger"
                onClick={(event) => onOpenProfile(searchResult, event)}
              >
                <Avatar name={searchResult.nickname} src={searchResult.avatar} size="lg" />
              </button>
              <div className="add-friend-copy">
                <strong>{searchResult.nickname}</strong>
                <span>{`\u8d26\u53f7\uff1a${searchResult.username}`}</span>
              </div>
            </div>

            {showRequestEditor ? (
              <div className="add-friend-request-section">
                <div className="add-friend-request-label">
                  <span>{"\u7533\u8bf7\u4fe1\u606f"}</span>
                  <em>{message.length}/100</em>
                </div>
                <textarea
                  className="add-friend-message"
                  value={message}
                  maxLength={100}
                  placeholder={"\u8bf7\u8f93\u5165\u9a8c\u8bc1\u4fe1\u606f"}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </div>
            ) : null}

            <div className="add-friend-actions">
              <button type="button" className="header-action add-friend-cancel" onClick={onClose}>
                {"\u53d6\u6d88"}
              </button>
              {renderPrimaryAction()}
            </div>
          </div>
        ) : (
          <div className="add-friend-empty">{searching ? "\u641c\u7d22\u4e2d..." : error || "\u8f93\u5165\u5b8c\u6574\u8d26\u53f7\u540e\u641c\u7d22"}</div>
        )}
      </div>
    </div>
  );
}

export default AddFriendPanel;
