package webserver

import (
	"net/http"

	"easyChat/internal/auth"

	"github.com/gin-gonic/gin"
)

func (s *Server) registerFavoriteRoutes(api *gin.RouterGroup) {
	api.GET("/favorites", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		items, err := s.Store.ListFavorites(user.ID, c.Query("type"), c.Query("keyword"))
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"items": items})
	})

	api.POST("/favorites", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		var req struct {
			MessageID string `json:"messageId"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		favorite, err := s.Store.CreateFavorite(user.ID, req.MessageID)
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"favorite": favorite})
	})

	api.DELETE("/favorites/:id", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		if err := s.Store.DeleteFavorite(user.ID, c.Param("id")); err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	api.DELETE("/favorites/message/:messageId", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		if err := s.Store.DeleteFavoriteByMessage(user.ID, c.Param("messageId")); err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})
}
