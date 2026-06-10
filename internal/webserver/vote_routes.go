package webserver

import (
	"net/http"
	"time"

	"easyChat/internal/auth"

	"github.com/gin-gonic/gin"
)

func (s *Server) registerVoteRoutes(api *gin.RouterGroup) {
	// List votes by conversation
	api.GET("/conversations/:conversationId/votes", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		votes, err := s.Store.GetVotesByConversation(user.ID, c.Param("conversationId"))
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, votes)
	})

	// Create a vote
	api.POST("/conversations/:conversationId/votes", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		var req struct {
			Question  string     `json:"question"`
			VoteType  string     `json:"voteType"`
			Options   []string   `json:"options"`
			Anonymous bool       `json:"anonymous"`
			Deadline  *time.Time `json:"deadline,omitempty"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || len(req.Options) < 2 {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		// Default voteType to "single" if not provided
		if req.VoteType == "" {
			req.VoteType = "single"
		}
		vote, err := s.Store.CreateVote(user.ID, c.Param("conversationId"), req.Question, req.VoteType, req.Options, req.Anonymous, req.Deadline)
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"vote": vote})
	})

	// Get vote details
	api.GET("/votes/:voteId", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		vote, err := s.Store.GetVote(user.ID, c.Param("voteId"))
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"vote": vote})
	})

	// Cast vote
	api.POST("/votes/:voteId/vote", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		var req struct {
			OptionIDs []string `json:"optionIds"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || len(req.OptionIDs) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		if err := s.Store.CastVote(user.ID, c.Param("voteId"), req.OptionIDs); err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Unvote
	api.DELETE("/votes/:voteId/vote", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		if err := s.Store.Unvote(user.ID, c.Param("voteId")); err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})
}
