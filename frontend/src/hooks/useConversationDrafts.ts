import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type DraftMap = Record<string, string>;

function readDraftMap(key: string): DraftMap {
  if (!key) {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) {
      return {};
    }
    const parsed = JSON.parse(stored) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => typeof value === "string" && value.trim().length > 0),
    );
  } catch {
    return {};
  }
}

export function useConversationDrafts(userId: string | null) {
  const storageKey = useMemo(() => (userId ? `chat:drafts:${userId}` : ""), [userId]);
  const storageKeyRef = useRef(storageKey);
  const [drafts, setDrafts] = useState<DraftMap>({});

  useEffect(() => {
    storageKeyRef.current = storageKey;
    if (!storageKey) {
      setDrafts({});
      return;
    }
    setDrafts(readDraftMap(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) {
      return;
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(drafts));
    } catch {
      // Ignore storage quota or privacy mode errors.
    }
  }, [drafts, storageKey]);

  const setDraft = useCallback((conversationId: string, value: string) => {
    const nextValue = value.trim().length > 0 ? value : "";
    setDrafts((previous) => {
      const next = { ...previous };
      if (!nextValue) {
        delete next[conversationId];
        return next;
      }
      next[conversationId] = nextValue;
      return next;
    });
  }, []);

  const clearDraft = useCallback((conversationId: string) => {
    setDrafts((previous) => {
      if (!previous[conversationId]) {
        return previous;
      }
      const next = { ...previous };
      delete next[conversationId];
      return next;
    });
  }, []);

  const clearAllDrafts = useCallback(() => {
    if (storageKeyRef.current) {
      window.localStorage.removeItem(storageKeyRef.current);
    }
    setDrafts({});
  }, []);

  return {
    drafts,
    setDraft,
    clearDraft,
    clearAllDrafts,
  };
}
