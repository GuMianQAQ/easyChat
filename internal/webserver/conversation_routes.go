package webserver

import (
	"net/http"

	"easyChat/internal/auth"

	"github.com/gin-gonic/gin"
)

func (s *Server) registerConversationRoutes(api *gin.RouterGroup) {
	api.GET("/conversations", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		items, err := s.Store.ListConversations(user.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"items": items})
	})

	api.PATCH("/conversations/:conversationId/settings", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		var req struct {
			IsPinned *bool `json:"isPinned"`
			IsMuted  *bool `json:"isMuted"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		conversation, err := s.Store.UpdateConversationSettings(user.ID, c.Param("conversationId"), req.IsPinned, req.IsMuted)
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"conversation": conversation})
	})

	api.DELETE("/conversations/:conversationId", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		if err := s.Store.DeleteConversationForUser(user.ID, c.Param("conversationId")); err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	api.POST("/conversations/:conversationId/clear", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		if err := s.Store.ClearConversationForUser(user.ID, c.Param("conversationId")); err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	api.POST("/conversations/:conversationId/read", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		if err := s.Store.MarkConversationRead(user.ID, c.Param("conversationId")); err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"unreadCount": 0})
	})

	api.POST("/conversations/private", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		var req struct {
			TargetUserID string `json:"targetUserId"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		if err := s.Social.CanStartPrivateConversation(user.ID, req.TargetUserID); err != nil {
			c.Error(err)
			return
		}
		conversation, err := s.Store.EnsurePrivateConversation(user.ID, req.TargetUserID)
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"conversation": conversation})
	})
}
