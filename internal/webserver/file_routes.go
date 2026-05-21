package webserver

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (s *Server) registerFileRoutes(api *gin.RouterGroup) {
	api.POST("/upload", func(c *gin.Context) {
		if _, err := s.Auth.UserFromToken(bearerToken(c)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		file, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errMissingUploadFile})
			return
		}
		url, err := s.Store.StoreUpload(file)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"url": url})
	})

	api.POST("/upload/file", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		file, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errPleaseUploadFile})
			return
		}
		record, err := s.Store.StoreGenericUpload(user, file)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, record)
	})

	api.GET("/files", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		items, err := s.Store.ListFiles(user.ID, c.Query("type"), c.Query("keyword"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"items": items})
	})
}
