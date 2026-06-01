package webserver

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func (s *Server) registerSolitaireRoutes(api *gin.RouterGroup) {
	// List solitaires by conversation
	api.GET("/conversations/:conversationId/solitaires", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		solitaires, err := s.Store.GetSolitairesByConversation(user.ID, c.Param("conversationId"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, solitaires)
	})

	// Create a solitaire
	api.POST("/conversations/:conversationId/solitaires", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		var req struct {
			Title string `json:"title"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.Title == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		solitaire, err := s.Store.CreateSolitaire(user.ID, c.Param("conversationId"), req.Title)
		if err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), errAdminOnly) || strings.Contains(err.Error(), errGroupOwnerOnly) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"solitaire": solitaire})
	})

	// Get solitaire details
	api.GET("/solitaires/:solitaireId", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		solitaire, err := s.Store.GetSolitaire(user.ID, c.Param("solitaireId"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"solitaire": solitaire})
	})

	// Join solitaire
	api.POST("/solitaires/:solitaireId/join", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		var req struct {
			Content string `json:"content"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.Content == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		if err := s.Store.JoinSolitaire(user.ID, c.Param("solitaireId"), req.Content); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Update solitaire entry
	api.PUT("/solitaires/:solitaireId/items/:itemId", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		var req struct {
			Content string `json:"content"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.Content == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		if err := s.Store.UpdateSolitaireItem(user.ID, c.Param("solitaireId"), c.Param("itemId"), req.Content); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})
}
