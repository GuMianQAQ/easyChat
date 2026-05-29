import { useCallback, useEffect, useRef, useState } from "react";
import type { CompletionGranularity, PredictionScope } from "../types/chat";
import { resolveApiUrl } from "../config/env";
import { inScope } from "../utils/prediction";

interface UseInputCompletionProps {
  content: string;
  enabled: boolean;
  granularity: CompletionGranularity;
  scope: PredictionScope;
  isAIAssistant: boolean;
  token: string;
}

export function useInputCompletion({
  content,
  enabled,
  granularity,
  scope,
  isAIAssistant,
  token,
}: UseInputCompletionProps) {
  const [completion, setCompletion] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchCompletion = useCallback(async () => {
    if (!enabled || !inScope(scope, isAIAssistant) || !token || content.trim().length < 2) {
      setCompletion("");
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const resp = await fetch(resolveApiUrl("/api/ai/complete"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: content, granularity }),
        signal: abortControllerRef.current.signal,
      });
      const data = await resp.json();
      if (resp.ok && data.completion) {
        setCompletion(data.completion);
      } else {
        setCompletion("");
      }
    } catch {
      setCompletion("");
    }
  }, [content, enabled, granularity, scope, isAIAssistant, token]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!enabled || !inScope(scope, isAIAssistant) || !content.trim() || content.trim().length < 2) {
      setCompletion("");
      return;
    }

    debounceRef.current = setTimeout(() => {
      void fetchCompletion();
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [content, enabled, scope, isAIAssistant, fetchCompletion]);

  const dismissCompletion = useCallback(() => {
    setCompletion("");
  }, []);

  return { completion, dismissCompletion };
}
