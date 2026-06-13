import { useEffect, useRef } from "react";
import { X, Send } from "lucide-react";
import { formatVoiceDuration } from "../../utils/time";

interface VoiceRecorderProps {
  analyserNode: AnalyserNode | null;
  duration: number;
  isCancelZone?: boolean;
  onCancel: () => void;
  onSend: () => void;
}

function VoiceRecorder({
  analyserNode,
  duration,
  isCancelZone = false,
  onCancel,
  onSend,
}: VoiceRecorderProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  // Canvas waveform drawing
  useEffect(() => {
    if (!analyserNode || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyserNode.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const barCount = 24;
      const barWidth = width / barCount - 2;
      const step = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step];
        const barHeight = Math.max(4, (value / 255) * height * 0.8);
        const x = i * (barWidth + 2);
        const y = (height - barHeight) / 2;

        ctx.fillStyle = isCancelZone ? "rgba(199, 72, 72, 0.5)" : "#07c160";
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    };

    draw();

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyserNode, isCancelZone]);

  return (
    <div className="composer-voice-recording">
      <div className="voice-recording-indicator">
        <div className={`voice-recording-dot ${isCancelZone ? "voice-recording-dot-cancel" : ""}`} />
        <span className="voice-recording-time" style={{ fontVariantNumeric: "tabular-nums" }}>
          {formatVoiceDuration(duration)}
        </span>
      </div>

      <canvas
        ref={canvasRef}
        className="voice-recording-canvas"
        width={240}
        height={48}
      />

      {isCancelZone ? (
        <div className="voice-recording-cancel-hint">松开取消</div>
      ) : null}

      <div className="voice-recording-actions">
        <button
          type="button"
          className="voice-recording-cancel-btn"
          onClick={onCancel}
          title="取消"
        >
          <X size={18} />
        </button>
        <button
          type="button"
          className="voice-recording-send-btn"
          onClick={onSend}
          title="发送"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

export default VoiceRecorder;
