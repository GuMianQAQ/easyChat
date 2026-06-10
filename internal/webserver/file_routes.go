package webserver

import (
	"net/http"

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
