import { useState } from "react";
import { Play } from "lucide-react";
import VideoPlayer from "./VideoPlayer";

interface VideoContentProps {
  url: string;
  thumbnail: string;
  duration: number;
  width?: number;
  height?: number;
}

function VideoContent({
  url,
  thumbnail,
  duration,
}: VideoContentProps) {
  const [playerOpen, setPlayerOpen] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <button
        type="button"
        className="video-content"
        onClick={(e) => {
          e.stopPropagation();
          setPlayerOpen(true);
        }}
      >
        <img
          className="video-thumbnail"
          src={thumbnail}
          alt="视频缩略图"
          loading="lazy"
        />
        <div className="video-overlay">
          <div className="video-play-btn">
            <Play size={24} fill="white" />
          </div>
          <div className="video-duration">{formatDuration(duration)}</div>
        </div>
      </button>

      <VideoPlayer
        isOpen={playerOpen}
        url={url}
        onClose={() => setPlayerOpen(false)}
      />
    </>
  );
}

export default VideoContent;
