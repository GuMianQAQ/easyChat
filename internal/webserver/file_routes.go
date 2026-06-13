package webserver

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"easyChat/internal/auth"

	"github.com/gin-gonic/gin"
)

func (s *Server) registerFileRoutes(api *gin.RouterGroup) {
	api.POST("/upload", func(c *gin.Context) {
		_ = c.MustGet("user").(auth.PublicUser)
		file, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errMissingUploadFile})
			return
		}
		url, err := s.Store.StoreUpload(file)
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"url": url})
	})

	api.POST("/upload/file", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		file, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errPleaseUploadFile})
			return
		}
		record, err := s.Store.StoreGenericUpload(user, file)
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, record)
	})

	api.POST("/upload/voice", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		_ = user

		file, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errPleaseUploadFile})
			return
		}

		contentType := file.Header.Get("Content-Type")
		if !strings.HasPrefix(contentType, "audio/") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "仅支持音频文件"})
			return
		}

		const maxVoiceBytes = 10 * 1024 * 1024 // 10MB
		if file.Size > maxVoiceBytes {
			c.JSON(http.StatusBadRequest, gin.H{"error": "语音文件不能超过 10MB"})
			return
		}

		durationStr := c.PostForm("duration")
		duration := 0
		if durationStr != "" {
			duration, _ = strconv.Atoi(durationStr)
		}

		extension := strings.ToLower(filepath.Ext(file.Filename))
		if extension == "" {
			extension = ".webm"
		}

		targetDir := filepath.Join(s.uploadsDir, "voice")
		if err := os.MkdirAll(targetDir, 0o755); err != nil {
			c.Error(err)
			return
		}

		filename := fmt.Sprintf("voice-%d%s", time.Now().UnixNano(), extension)
		targetPath := filepath.Join(targetDir, filename)

		src, err := file.Open()
		if err != nil {
			c.Error(err)
			return
		}
		defer src.Close()

		dst, err := os.Create(targetPath)
		if err != nil {
			c.Error(err)
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, src); err != nil {
			c.Error(err)
			return
		}

		url := "/uploads/voice/" + filename
		c.JSON(http.StatusOK, gin.H{"url": url, "duration": duration})
	})

	api.GET("/files", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		items, err := s.Store.ListFiles(user.ID, c.Query("type"), c.Query("keyword"))
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"items": items})
	})
}
