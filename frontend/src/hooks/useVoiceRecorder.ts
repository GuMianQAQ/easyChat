import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceRecorderState = "idle" | "recording" | "processing";

export interface UseVoiceRecorderResult {
  start: () => Promise<{ blob: Blob; duration: number }>;
  stop: () => void;
  cancel: () => void;
  state: VoiceRecorderState;
  duration: number;
  analyserNode: AnalyserNode | null;
  isSupported: boolean;
  error: string | null;
}

export function useVoiceRecorder(): UseVoiceRecorderResult {
  const [state, setState] = useState<VoiceRecorderState>("idle");
  const [duration, setDuration] = useState(0);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(0);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxDurationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolveRef = useRef<((value: { blob: Blob; duration: number }) => void) | null>(null);
  const rejectRef = useRef<((reason: Error) => void) | null>(null);

  const isSupported =
    typeof MediaRecorder !== "undefined" &&
    MediaRecorder.isTypeSupported("audio/webm;codecs=opus");

  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    mediaRecorderRef.current = null;
    analyserRef.current = null;
    setAnalyserNode(null);
  }, []);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      setState("processing");
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError("浏览器不支持录音");
      rejectRef.current?.(new Error("浏览器不支持录音"));
      rejectRef.current = null;
      return;
    }

    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      setAnalyserNode(analyser);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const recordedDuration = Math.floor(
          (Date.now() - startTimeRef.current) / 1000,
        );
        cleanup();
        setState("idle");
        setDuration(0);

        if (recordedDuration < 1) {
          setError("录音时间太短");
          rejectRef.current?.(new Error("录音时间太短"));
        } else {
          resolveRef.current?.({ blob, duration: recordedDuration });
        }
        resolveRef.current = null;
        rejectRef.current = null;
      };

      mediaRecorder.start();
      startTimeRef.current = Date.now();
      setState("recording");
      setDuration(0);

      durationIntervalRef.current = setInterval(() => {
        setDuration(
          Math.floor((Date.now() - startTimeRef.current) / 1000),
        );
      }, 100);

      // Auto-stop at 60 seconds
      maxDurationTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          stop();
        }
      }, 60000);
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "需要麦克风权限才能录音"
          : "录音失败";
      setError(message);
      cleanup();
      rejectRef.current?.(new Error(message));
      rejectRef.current = null;
    }
  }, [isSupported, cleanup, stop]);

  const cancel = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      // Override the onstop handler to reject with "cancelled"
      mediaRecorderRef.current.onstop = () => {
        cleanup();
        setState("idle");
        setDuration(0);
        rejectRef.current?.(new Error("cancelled"));
        resolveRef.current = null;
        rejectRef.current = null;
      };
      mediaRecorderRef.current.stop();
    }
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
      cleanup();
    };
  }, [cleanup]);

  return {
    start: () =>
      new Promise((resolve, reject) => {
        resolveRef.current = resolve;
        rejectRef.current = reject;
        startRecording();
      }),
    stop,
    cancel,
    state,
    duration,
    analyserNode,
    isSupported,
    error,
  };
}
