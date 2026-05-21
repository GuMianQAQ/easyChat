package webserver

import (
	"net/http"
	"strings"

	"easyChat/internal/chatstore"

	"github.com/gin-gonic/gin"
)

func (s *Server) registerGroupRoutes(api *gin.RouterGroup) {
	api.POST("/conversations/group", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		var req chatstore.CreateGroupConversationInput
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}

		friends, err := s.Social.ListFriends(user.ID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		friendSet := make(map[string]struct{}, len(friends))
		for _, friend := range friends {
			friendSet[strings.TrimSpace(friend.FriendID)] = struct{}{}
		}

		seen := map[string]struct{}{}
		memberIDs := make([]string, 0, len(req.MemberIDs))
		for _, memberID := range req.MemberIDs {
			memberID = strings.TrimSpace(memberID)
			if memberID == "" || memberID == user.ID {
				continue
			}
			if _, ok := friendSet[memberID]; !ok {
				c.JSON(http.StatusForbidden, gin.H{"error": errOnlyInviteFriendsToGroup})
				return
			}
			if _, ok := seen[memberID]; ok {
				continue
			}
			seen[memberID] = struct{}{}
			memberIDs = append(memberIDs, memberID)
		}
		if len(memberIDs) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": errSelectAtLeastOneFriend})
			return
		}

		conversation, err := s.Store.CreateGroupConversation(user.ID, req.Name, memberIDs)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"conversation": conversation})
	})

	api.GET("/conversations/:conversationId/group", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		conversation, err := s.Store.GetGroupConversation(user.ID, c.Param("conversationId"))
		if err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), errConversationAccessDenied) || strings.Contains(err.Error(), errGroupAccessDenied) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"conversation": conversation})
	})

	api.PATCH("/conversations/:conversationId/group", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		var req chatstore.UpdateGroupConversationRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		conversation, err := s.Store.UpdateGroupConversation(user.ID, c.Param("conversationId"), req)
		if err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), errConversationAccessDenied) || strings.Contains(err.Error(), errGroupAccessDenied) {
				status = http.StatusForbidden
			}
			if strings.Contains(err.Error(), errGroupOwnerOnly) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"conversation": conversation})
	})

	api.POST("/conversations/:conversationId/group/leave", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		if err := s.Store.LeaveGroupConversation(user.ID, c.Param("conversationId")); err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), errGroupAccessDenied) ||
				strings.Contains(err.Error(), errConversationNoPermission) ||
				strings.Contains(err.Error(), errNotInGroupConversation) {
				status = http.StatusForbidden
			}
			if strings.Contains(err.Error(), errUseDismissForOwner) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	api.DELETE("/conversations/:conversationId/group", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		if err := s.Store.DismissGroupConversation(user.ID, c.Param("conversationId")); err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), errGroupAccessDenied) ||
				strings.Contains(err.Error(), errConversationNoPermission) ||
				strings.Contains(err.Error(), errNotInGroupConversation) {
				status = http.StatusForbidden
			}
			if strings.Contains(err.Error(), errDismissGroupOwnerOnly) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})
}
