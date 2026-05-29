import { useCallback, useEffect, useRef, useState } from "react";
import type { PredictionScope } from "../types/chat";
import { resolveApiUrl } from "../config/env";
import { inScope } from "../utils/prediction";

interface UseQuestionPredictionProps {
  content: string;
  enabled: boolean;
  scope: PredictionScope;
  isAIAssistant: boolean;
  token: string;
}

export function useQuestionPrediction({
  content,
  enabled,
  scope,
  isAIAssistant,
  token,
}: UseQuestionPredictionProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPrediction = useCallback(async () => {
    if (!enabled || !inScope(scope, isAIAssistant) || !token || content.trim().length < 2) {
      setQuestion("");
      setAnswer("");
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    try {
      const resp = await fetch(resolveApiUrl("/api/ai/predict-question"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: content }),
        signal: abortControllerRef.current.signal,
      });
      const data = await resp.json();
      if (resp.ok && data.question && data.answer) {
        setQuestion(data.question);
        setAnswer(data.answer);
      } else {
        setQuestion("");
        setAnswer("");
      }
    } catch {
      setQuestion("");
      setAnswer("");
    } finally {
      setLoading(false);
    }
  }, [content, enabled, scope, isAIAssistant, token]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!enabled || !inScope(scope, isAIAssistant) || !content.trim() || content.trim().length < 2) {
      setQuestion("");
      setAnswer("");
      return;
    }

    debounceRef.current = setTimeout(() => {
      void fetchPrediction();
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [content, enabled, scope, isAIAssistant, fetchPrediction]);

  const dismiss = useCallback(() => {
    setQuestion("");
    setAnswer("");
  }, []);

  return { question, answer, loading, dismiss };
}
