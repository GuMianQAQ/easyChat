package webserver

import (
	"net/http"
	"strings"

	"easyChat/internal/moments"

	"github.com/gin-gonic/gin"
)

func (s *Server) registerMomentRoutes(api *gin.RouterGroup) {
	api.GET("/moments/feed", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		items, err := s.Moments.GetFeed(user.ID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"items": items})
	})

	api.POST("/moments", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		var req moments.CreateMomentInput
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		// Trim all image URLs
		cleaned := make([]string, 0, len(req.Images))
		for _, img := range req.Images {
			if trimmed := strings.TrimSpace(img); trimmed != "" {
				cleaned = append(cleaned, trimmed)
			}
		}
		req.Images = cleaned

		post, err := s.Moments.CreatePost(user.ID, req)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"post": post})
	})

	api.DELETE("/moments/:id", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		if err := s.Moments.DeletePost(user.ID, c.Param("id")); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	api.POST("/moments/:id/like", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		if err := s.Moments.LikePost(user.ID, c.Param("id")); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	api.DELETE("/moments/:id/like", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		if err := s.Moments.UnlikePost(user.ID, c.Param("id")); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	api.POST("/moments/:id/comments", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		var req moments.AddCommentInput
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		comment, err := s.Moments.AddComment(user.ID, c.Param("id"), req)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"comment": comment})
	})

	api.DELETE("/moments/comments/:id", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		if err := s.Moments.DeleteComment(user.ID, c.Param("id")); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})
}
