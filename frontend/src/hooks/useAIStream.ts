import { useState, useEffect, useRef, useCallback } from "react";

interface UseAIStreamOptions {
  baseUrl?: string;
  token?: string;
}

interface UseAIStreamResult {
  content: string;
  loading: boolean;
  error: string;
  stream: (query: string) => void;
  cancel: () => void;
}

export function useAIStream(options: UseAIStreamOptions = {}): UseAIStreamResult {
  const { baseUrl = "", token = "" } = options;

  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const eventSourceRef = useRef<EventSource | null>(null);

  const cancel = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setLoading(false);
  }, []);

  const stream = useCallback(
    (query: string) => {
      cancel();

      if (!query.trim()) {
        setError("请输入问题内容");
        return;
      }

      setContent("");
      setLoading(true);
      setError("");

      const url = `${baseUrl}/api/ai/stream?query=${encodeURIComponent(query)}&token=${encodeURIComponent(token)}`;

      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        console.log("SSE connection opened");
      };

      es.onmessage = (event) => {
        const delta = event.data;
        if (delta) {
          setContent((prev) => prev + delta);
        }
      };

      es.addEventListener("done", () => {
        setLoading(false);
        es.close();
        eventSourceRef.current = null;
      });

      es.addEventListener("error", (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data);
          setError(data.error || "AI 服务错误");
        } catch {
          setError("连接中断");
        }
        setLoading(false);
        es.close();
        eventSourceRef.current = null;
      });

      es.onerror = () => {
        if (es.readyState === EventSource.CLOSED) {
          setLoading(false);
          eventSourceRef.current = null;
        }
      };
    },
    [baseUrl, token, cancel]
  );

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  return { content, loading, error, stream, cancel };
}
