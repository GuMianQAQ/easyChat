package webserver

import (
	"net/http"

	"easyChat/internal/auth"

	"github.com/gin-gonic/gin"
)

func (s *Server) registerSolitaireRoutes(api *gin.RouterGroup) {
	// List solitaires by conversation
	api.GET("/conversations/:conversationId/solitaires", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		solitaires, err := s.Store.GetSolitairesByConversation(user.ID, c.Param("conversationId"))
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, solitaires)
	})

	// Create a solitaire
	api.POST("/conversations/:conversationId/solitaires", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		var req struct {
			Title  string `json:"title"`
			Format string `json:"format"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.Title == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		solitaire, err := s.Store.CreateSolitaire(user.ID, c.Param("conversationId"), req.Title, req.Format)
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"solitaire": solitaire})
	})

	// Get solitaire details
	api.GET("/solitaires/:solitaireId", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		solitaire, err := s.Store.GetSolitaire(user.ID, c.Param("solitaireId"))
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"solitaire": solitaire})
	})

	// Join solitaire
	api.POST("/solitaires/:solitaireId/join", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		var req struct {
			Content string `json:"content"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.Content == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		if err := s.Store.JoinSolitaire(user.ID, c.Param("solitaireId"), req.Content); err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Update solitaire entry
	api.PUT("/solitaires/:solitaireId/items/:itemId", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		var req struct {
			Content string `json:"content"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.Content == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		if err := s.Store.UpdateSolitaireItem(user.ID, c.Param("solitaireId"), c.Param("itemId"), req.Content); err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})
}
