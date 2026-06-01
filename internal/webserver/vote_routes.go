package webserver

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func (s *Server) registerVoteRoutes(api *gin.RouterGroup) {
	// List votes by conversation
	api.GET("/conversations/:conversationId/votes", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		votes, err := s.Store.GetVotesByConversation(user.ID, c.Param("conversationId"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, votes)
	})

	// Create a vote
	api.POST("/conversations/:conversationId/votes", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		var req struct {
			Question   string    `json:"question"`
			Options    []string  `json:"options"`
			AllowMulti bool      `json:"allowMulti"`
			Anonymous  bool      `json:"anonymous"`
			Deadline   *time.Time `json:"deadline,omitempty"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || len(req.Options) < 2 {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		vote, err := s.Store.CreateVote(user.ID, c.Param("conversationId"), req.Question, req.Options, req.AllowMulti, req.Anonymous, req.Deadline)
		if err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), errAdminOnly) || strings.Contains(err.Error(), errGroupOwnerOnly) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"vote": vote})
	})

	// Get vote details
	api.GET("/votes/:voteId", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		vote, err := s.Store.GetVote(user.ID, c.Param("voteId"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"vote": vote})
	})

	// Cast vote
	api.POST("/votes/:voteId/vote", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		var req struct {
			OptionIDs []string `json:"optionIds"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || len(req.OptionIDs) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		if err := s.Store.CastVote(user.ID, c.Param("voteId"), req.OptionIDs); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Unvote
	api.DELETE("/votes/:voteId/vote", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		if err := s.Store.Unvote(user.ID, c.Param("voteId")); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})
}
