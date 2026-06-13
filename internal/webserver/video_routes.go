package webserver

import (
	"net/http"
	"os"
	"path/filepath"

	"easyChat/internal/uid"
	"easyChat/internal/video"

	"github.com/gin-gonic/gin"
)

func (s *Server) registerVideoRoutes(rg *gin.RouterGroup) {
	videoSvc := video.NewService(s.uploadsDir)

	rg.POST("/upload/video", func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, video.MaxFileSize)

		file, header, err := c.Request.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing file"})
			return
		}
		defer file.Close()

		if err := video.ValidateVideoFile(header.Filename); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		tempDir := filepath.Join(os.TempDir(), "easychat-video-"+uid.New("tmp"))
		if err := os.MkdirAll(tempDir, 0o755); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create temp directory"})
			return
		}
		defer os.RemoveAll(tempDir)

		tempFile := filepath.Join(tempDir, "input"+filepath.Ext(header.Filename))
		if err := c.SaveUploadedFile(header, tempFile); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save uploaded file"})
			return
		}

		info, err := videoSvc.ProcessVideo(tempFile)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, info)
	})

	rg.GET("/upload/video/check", func(c *gin.Context) {
		if err := video.CheckFFmpeg(); err != nil {
			c.JSON(http.StatusOK, gin.H{"available": false, "error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"available": true})
	})
}
