package video

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"easyChat/internal/uid"
)

const (
	MaxDuration    = 30  // seconds
	MaxFileSize    = 50 * 1024 * 1024 // 50MB
	CompressWidth  = 1280
	CompressHeight = 720
	VideoBitrate   = "2M"
	AudioBitrate   = "128k"
)

type Service struct {
	uploadsDir string
}

func NewService(uploadsDir string) *Service {
	return &Service{uploadsDir: uploadsDir}
}

type VideoInfo struct {
	URL       string `json:"url"`
	Thumbnail string `json:"thumbnail"`
	Duration  int    `json:"duration"`
	Width     int    `json:"width"`
	Height    int    `json:"height"`
	Size      int64  `json:"size"`
}

func CheckFFmpeg() error {
	_, err := exec.LookPath("ffmpeg")
	if err != nil {
		return fmt.Errorf("ffmpeg not found in PATH")
	}
	return nil
}

func (s *Service) ProcessVideo(inputPath string) (*VideoInfo, error) {
	info, err := s.getVideoInfo(inputPath)
	if err != nil {
		return nil, fmt.Errorf("failed to get video info: %w", err)
	}

	if info.Duration > MaxDuration {
		return nil, fmt.Errorf("video duration exceeds %d seconds", MaxDuration)
	}

	if info.Size > MaxFileSize {
		return nil, fmt.Errorf("video size exceeds 50MB")
	}

	videoID := uid.New("vid")
	videoDir := filepath.Join(s.uploadsDir, "videos", videoID)
	if err := os.MkdirAll(videoDir, 0o755); err != nil {
		return nil, fmt.Errorf("failed to create video directory: %w", err)
	}

	compressedPath := filepath.Join(videoDir, "video.mp4")
	if err := s.compressVideo(inputPath, compressedPath); err != nil {
		os.RemoveAll(videoDir)
		return nil, fmt.Errorf("failed to compress video: %w", err)
	}

	thumbnailPath := filepath.Join(videoDir, "thumb.jpg")
	if err := s.generateThumbnail(inputPath, thumbnailPath); err != nil {
		os.RemoveAll(videoDir)
		return nil, fmt.Errorf("failed to generate thumbnail: %w", err)
	}

	compressedInfo, err := s.getVideoInfo(compressedPath)
	if err != nil {
		os.RemoveAll(videoDir)
		return nil, err
	}

	return &VideoInfo{
		URL:       fmt.Sprintf("/uploads/videos/%s/video.mp4", videoID),
		Thumbnail: fmt.Sprintf("/uploads/videos/%s/thumb.jpg", videoID),
		Duration:  compressedInfo.Duration,
		Width:     compressedInfo.Width,
		Height:    compressedInfo.Height,
		Size:      compressedInfo.Size,
	}, nil
}

func (s *Service) getVideoInfo(path string) (*VideoInfo, error) {
	cmd := exec.Command("ffprobe",
		"-v", "quiet",
		"-print_format", "json",
		"-show_format",
		"-show_streams",
		path,
	)

	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	var probe struct {
		Format struct {
			Duration string `json:"duration"`
			Size     string `json:"size"`
		} `json:"format"`
		Streams []struct {
			Width  int    `json:"width"`
			Height int    `json:"height"`
			Type   string `json:"codec_type"`
		} `json:"streams"`
	}

	if err := json.Unmarshal(output, &probe); err != nil {
		return nil, err
	}

	duration, _ := strconv.ParseFloat(probe.Format.Duration, 64)
	size, _ := strconv.ParseInt(probe.Format.Size, 10, 64)

	info := &VideoInfo{
		Duration: int(duration),
		Size:     size,
	}

	for _, stream := range probe.Streams {
		if stream.Type == "video" {
			info.Width = stream.Width
			info.Height = stream.Height
			break
		}
	}

	return info, nil
}

func (s *Service) compressVideo(input, output string) error {
	cmd := exec.Command("ffmpeg",
		"-i", input,
		"-vf", fmt.Sprintf("scale='min(%d,iw)':'min(%d,ih)':force_original_aspect_ratio=decrease", CompressWidth, CompressHeight),
		"-c:v", "libx264",
		"-b:v", VideoBitrate,
		"-c:a", "aac",
		"-b:a", AudioBitrate,
		"-movflags", "+faststart",
		"-y",
		output,
	)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("ffmpeg failed: %s", stderr.String())
	}
	return nil
}

func (s *Service) generateThumbnail(input, output string) error {
	duration, err := s.getDuration(input)
	if err != nil {
		duration = 1
	}

	thumbnailTime := fmt.Sprintf("00:00:%02d", duration/10)
	if thumbnailTime > "00:00:05" {
		thumbnailTime = "00:00:01"
	}

	cmd := exec.Command("ffmpeg",
		"-i", input,
		"-ss", thumbnailTime,
		"-vframes", "1",
		"-vf", "scale=320:-1",
		"-y",
		output,
	)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("ffmpeg failed: %s", stderr.String())
	}
	return nil
}

func (s *Service) getDuration(path string) (int, error) {
	cmd := exec.Command("ffprobe",
		"-v", "quiet",
		"-show_entries", "format=duration",
		"-of", "default=noprint_wrappers=1:nokey=1",
		path,
	)

	output, err := cmd.Output()
	if err != nil {
		return 0, err
	}

	duration, err := strconv.ParseFloat(strings.TrimSpace(string(output)), 64)
	if err != nil {
		return 0, err
	}

	return int(duration), nil
}

func (s *Service) CleanupOldVideos(maxAge time.Duration) error {
	videosDir := filepath.Join(s.uploadsDir, "videos")
	entries, err := os.ReadDir(videosDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	cutoff := time.Now().Add(-maxAge)
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		if info.ModTime().Before(cutoff) {
			os.RemoveAll(filepath.Join(videosDir, entry.Name()))
		}
	}

	return nil
}

func ValidateVideoFile(filename string) error {
	ext := strings.ToLower(filepath.Ext(filename))
	allowed := map[string]bool{
		".mp4":  true,
		".mov":  true,
		".avi":  true,
		".mkv":  true,
		".webm": true,
	}
	if !allowed[ext] {
		return fmt.Errorf("unsupported video format: %s", ext)
	}
	return nil
}
