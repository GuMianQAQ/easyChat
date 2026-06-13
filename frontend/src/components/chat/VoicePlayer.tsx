import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { resolveMediaUrl } from "../../config/env";
import { formatVoiceDuration } from "../../utils/time";

interface VoicePlayerProps {
  content: string;
  duration: number;
  transcript?: string;
}

function VoicePlayer({ content, duration, transcript }: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const audioUrl = resolveMediaUrl(content);

  // Dynamic width based on duration
  const playerWidth = Math.max(180, Math.min(280, 180 + duration * 2));

  // Audio playback control
  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      if (audio.duration) {
        setProgress(audio.currentTime / audio.duration);
      }
    };

    audio.onended = () => {
      setPlaying(false);
      setProgress(0);
    };

    audio.onpause = () => {
      setPlaying(false);
    };

    audio.onplay = () => {
      setPlaying(true);
    };

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [audioUrl]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
    } else {
      audio.play().catch((error) => {
        console.debug("[VoicePlayer] 自动播放被阻止:", error);
      });
    }
  }, [playing]);

  const handleProgressClick = useCallback((e: React.MouseEvent) => {
    const audio = audioRef.current;
    const progressEl = progressRef.current;
    if (!audio || !progressEl) return;

    const rect = progressEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    audio.currentTime = ratio * audio.duration;
  }, []);

  return (
    <div className="voice-player" style={{ width: playerWidth }}>
      <div className="voice-player-controls">
        <button type="button" className="voice-player-btn" onClick={togglePlay}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <div className="voice-player-progress-wrap">
          <div ref={progressRef} className="voice-player-progress" onClick={handleProgressClick}>
            <div className="voice-player-progress-bar" style={{ width: `${progress * 100}%` }} />
          </div>
          <span className="voice-player-duration">{formatVoiceDuration(duration)}</span>
        </div>
      </div>
      {transcript ? <div className="voice-transcript">{transcript}</div> : null}
    </div>
  );
}

export default VoicePlayer;
