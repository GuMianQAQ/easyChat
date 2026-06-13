import { useCallback, useEffect, useRef, useState } from "react";
import { X, Play, Pause, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";

interface VideoPlayerProps {
  isOpen: boolean;
  url: string;
  onClose: () => void;
}

function VideoPlayer({ isOpen, url, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
      setPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [isOpen]);

  // Sync fullscreen state
  useEffect(() => {
    const handler = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === " " || e.key === "k") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "m") {
        toggleMute();
      } else if (e.key === "ArrowLeft") {
        const video = videoRef.current;
        if (video) video.currentTime = Math.max(0, video.currentTime - 5);
      } else if (e.key === "ArrowRight") {
        const video = videoRef.current;
        if (video) video.currentTime = Math.min(video.duration, video.currentTime + 5);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
    }
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (video) {
      const time = parseFloat(e.target.value);
      video.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (video) {
      const vol = parseFloat(e.target.value);
      video.volume = vol;
      setVolume(vol);
      setMuted(vol === 0);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setMuted(video.muted);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!document.fullscreenElement) {
      video.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="video-player-overlay" onClick={onClose}>
      <div className="video-player" role="dialog" aria-modal="true" aria-label="视频播放器" onClick={(e) => e.stopPropagation()}>
        <div className="video-player-header">
          <button type="button" className="video-player-close" aria-label="关闭" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="video-player-container">
          <video
            ref={videoRef}
            className="video-player-video"
            src={url}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setPlaying(false)}
            onClick={togglePlay}
          />
        </div>

        <div className="video-player-controls">
          <button type="button" className="video-control-btn" aria-label={playing ? "暂停" : "播放"} onClick={togglePlay}>
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <span className="video-time">{formatTime(currentTime)}</span>
          <input
            type="range"
            className="video-progress"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            aria-label="进度"
            onChange={handleSeek}
          />
          <span className="video-time">{formatTime(duration)}</span>

          <button type="button" className="video-control-btn" aria-label={muted ? "取消静音" : "静音"} onClick={toggleMute}>
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            className="video-volume"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            aria-label="音量"
            onChange={handleVolumeChange}
          />

          <button type="button" className="video-control-btn" aria-label={fullscreen ? "退出全屏" : "全屏"} onClick={toggleFullscreen}>
            {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer;
