package webserver

import (
	"log"
	"net/http"

	"easyChat/internal/auth"
	"easyChat/internal/social"

	"github.com/gin-gonic/gin"
)

func (s *Server) registerFriendRoutes(api *gin.RouterGroup) {
	api.GET("/users/search", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		result, err := s.Social.SearchUser(user.ID, c.Query("username"))
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"user": result})
	})

	api.GET("/users/:id/profile", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		profile, err := s.Social.GetProfile(user.ID, c.Param("id"))
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"user": profile})
	})

	api.GET("/users/me/privacy", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		settings, err := s.Social.GetPrivacy(user.ID)
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, settings)
	})

	api.PUT("/users/me/privacy", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		var req social.PrivacySettings
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		settings, err := s.Social.UpdatePrivacy(user.ID, req)
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, settings)
	})

	api.POST("/friend-requests", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		var req social.SendFriendRequestInput
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		result, err := s.Social.SendFriendRequest(user.ID, req)
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, result)
	})

	api.GET("/friend-requests", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		items, err := s.Social.ListFriendRequests(user.ID)
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"items": items})
	})

	api.POST("/friend-requests/:id/accept", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		friend, err := s.Social.AcceptFriendRequest(user.ID, c.Param("id"))
		if err != nil {
			c.Error(err)
			return
		}
		if _, convErr := s.Store.EnsurePrivateConversation(user.ID, friend.FriendID); convErr != nil {
			log.Printf("failed to ensure private conversation after friend acceptance: %v", convErr)
		}
		c.JSON(http.StatusOK, gin.H{"friend": friend})
	})

	api.POST("/friend-requests/:id/reject", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		if err := s.Social.RejectFriendRequest(user.ID, c.Param("id")); err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	api.GET("/friends", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		items, err := s.Social.ListFriends(user.ID)
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"items": items})
	})

	api.GET("/friends/blocked", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		items, err := s.Social.ListBlockedFriends(user.ID)
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"items": items})
	})

	api.PUT("/friends/:friendId", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		var req social.UpdateFriendRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		friend, err := s.Social.UpdateFriend(user.ID, c.Param("friendId"), req)
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"friend": friend})
	})

	api.DELETE("/friends/:friendId", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		if err := s.Social.DeleteFriend(user.ID, c.Param("friendId")); err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	api.POST("/friends/:friendId/block", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		friend, err := s.Social.BlockFriend(user.ID, c.Param("friendId"))
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"message":   msgFriendBlocked,
			"friendId":  friend.FriendID,
			"isBlocked": friend.IsBlocked,
			"friend":    friend,
		})
	})

	api.POST("/friends/:friendId/unblock", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		friend, err := s.Social.UnblockFriend(user.ID, c.Param("friendId"))
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"message":   msgFriendUnblocked,
			"friendId":  friend.FriendID,
			"isBlocked": friend.IsBlocked,
			"friend":    friend,
		})
	})
}
