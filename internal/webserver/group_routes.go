package webserver

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"easyChat/internal/chatstore"
	"easyChat/internal/webchat"

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
		if targets, err := s.Store.ConversationMemberIDs(user.ID, conversation.ID); err != nil {
			log.Printf("warning: failed to notify group members for %s: %v", conversation.ID, err)
		} else {
			onlineTargets := make([]string, 0, len(targets))
			for _, targetID := range targets {
				if targetID == user.ID {
					continue
				}
				onlineTargets = append(onlineTargets, targetID)
			}
			if s.Hub != nil && len(onlineTargets) > 0 {
				s.Hub.BroadcastPrivate(
					webchat.Message{
						ID:             webchat.NewMessageID(),
						ConversationID: conversation.ID,
						MessageScope:   webchat.ScopeGroup,
						Type:           webchat.MessageTypeSystem,
						MessageType:    webchat.ChatMessageText,
						SenderID:       user.ID,
						SenderName:     conversation.Name,
						Content:        "你已加入群聊",
						CreatedAt:      webchat.NowString(),
					},
					onlineTargets...,
				)
			}
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

		// Broadcast announcement update if announcement was changed
		if req.Announcement != nil && s.Hub != nil {
			if memberIDs, err := s.Store.ConversationMemberIDs(user.ID, c.Param("conversationId")); err == nil {
				targets := make([]string, 0, len(memberIDs))
				for _, id := range memberIDs {
					if id != user.ID {
						targets = append(targets, id)
					}
				}
				if len(targets) > 0 {
					s.Hub.BroadcastPrivate(webchat.Message{
						ID:             webchat.NewMessageID(),
						ConversationID: c.Param("conversationId"),
						MessageScope:   webchat.ScopeGroup,
						Type:           webchat.MessageTypeSystem,
						MessageType:    webchat.ChatMessageText,
						SenderID:       user.ID,
						SenderName:     conversation.Name,
						Content:        "群公告已更新",
						CreatedAt:      webchat.NowString(),
					}, targets...)
				}
			}
		}

		c.JSON(http.StatusOK, gin.H{"conversation": conversation})
	})

	api.PATCH("/groups/:id/bot", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		var req struct {
			BotEnabled bool `json:"botEnabled"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		conversation, err := s.Store.SetGroupBotEnabled(user.ID, c.Param("id"), req.BotEnabled)
		if err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), errConversationAccessDenied) ||
				strings.Contains(err.Error(), errGroupAccessDenied) ||
				strings.Contains(err.Error(), errGroupOwnerOnly) {
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

	// Set member as admin (owner only)
	api.POST("/conversations/:conversationId/group/admin", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		var req struct {
			UserID string `json:"userId"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.UserID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		if err := s.Store.SetMemberRole(user.ID, c.Param("conversationId"), req.UserID, "admin"); err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), errGroupOwnerOnly) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Revoke admin role (owner only)
	api.DELETE("/conversations/:conversationId/group/admin/:userId", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		if err := s.Store.SetMemberRole(user.ID, c.Param("conversationId"), c.Param("userId"), "member"); err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), errGroupOwnerOnly) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Transfer ownership
	api.POST("/conversations/:conversationId/group/transfer", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		var req struct {
			UserID string `json:"userId"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.UserID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		if err := s.Store.TransferOwner(user.ID, c.Param("conversationId"), req.UserID); err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), errGroupOwnerOnly) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Mute a member
	api.POST("/conversations/:conversationId/group/mute", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		var req struct {
			UserID   string `json:"userId"`
			Duration string `json:"duration"` // "10m", "1h", "1d", "forever"
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.UserID == "" || req.Duration == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}

		var duration time.Duration
		switch req.Duration {
		case "10m":
			duration = 10 * time.Minute
		case "1h":
			duration = time.Hour
		case "1d":
			duration = 24 * time.Hour
		case "forever":
			duration = 365 * 24 * time.Hour // 1 year as "forever"
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的禁言时长"})
			return
		}

		if err := s.Store.MuteMember(user.ID, c.Param("conversationId"), req.UserID, duration); err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), errAdminOnly) || strings.Contains(err.Error(), errGroupOwnerOnly) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Unmute a member
	api.POST("/conversations/:conversationId/group/unmute", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		var req struct {
			UserID string `json:"userId"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.UserID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		if err := s.Store.UnmuteMember(user.ID, c.Param("conversationId"), req.UserID); err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), errAdminOnly) || strings.Contains(err.Error(), errGroupOwnerOnly) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Get group permissions
	api.GET("/conversations/:conversationId/group/permissions", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		perms, err := s.Store.GetGroupPermissions(user.ID, c.Param("conversationId"))
		if err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), errConversationAccessDenied) || strings.Contains(err.Error(), errGroupAccessDenied) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"permissions": perms})
	})

	// Update group permissions (owner only)
	api.PUT("/conversations/:conversationId/group/permissions", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		var req map[string]any
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		if err := s.Store.UpdateGroupPermissions(user.ID, c.Param("conversationId"), req); err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), errGroupOwnerOnly) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Pin a message (admin/owner only)
	api.POST("/conversations/:conversationId/group/pin", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		var req struct {
			MessageID string `json:"messageId"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.MessageID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		if err := s.Store.PinMessage(user.ID, c.Param("conversationId"), req.MessageID); err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), errAdminOnly) || strings.Contains(err.Error(), errGroupOwnerOnly) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Unpin a message (admin/owner only)
	api.DELETE("/conversations/:conversationId/group/pin/:messageId", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		if err := s.Store.UnpinMessage(user.ID, c.Param("conversationId"), c.Param("messageId")); err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), errAdminOnly) || strings.Contains(err.Error(), errGroupOwnerOnly) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Get pinned messages
	api.GET("/conversations/:conversationId/group/pins", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		pins, err := s.Store.GetPinnedMessages(user.ID, c.Param("conversationId"))
		if err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), errConversationAccessDenied) || strings.Contains(err.Error(), errGroupAccessDenied) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"pins": pins})
	})

	// Get group files
	api.GET("/conversations/:conversationId/files", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		fileType := c.Query("type")
		keyword := c.Query("keyword")
		page := 1
		pageSize := 20
		if p := c.Query("page"); p != "" {
			fmt.Sscanf(p, "%d", &page)
		}
		if ps := c.Query("pageSize"); ps != "" {
			fmt.Sscanf(ps, "%d", &pageSize)
		}
		files, total, err := s.Store.GetGroupFiles(user.ID, c.Param("conversationId"), fileType, keyword, page, pageSize)
		if err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), errConversationAccessDenied) || strings.Contains(err.Error(), errGroupAccessDenied) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"files": files, "total": total, "page": page, "pageSize": pageSize})
	})

	// Get group images
	api.GET("/conversations/:conversationId/images", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		page := 1
		pageSize := 50
		if p := c.Query("page"); p != "" {
			fmt.Sscanf(p, "%d", &page)
		}
		if ps := c.Query("pageSize"); ps != "" {
			fmt.Sscanf(ps, "%d", &pageSize)
		}
		images, total, err := s.Store.GetGroupImages(user.ID, c.Param("conversationId"), page, pageSize)
		if err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), errConversationAccessDenied) || strings.Contains(err.Error(), errGroupAccessDenied) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"images": images, "total": total, "page": page, "pageSize": pageSize})
	})

	// Generate invite link
	api.POST("/conversations/:conversationId/group/invites", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		var req struct {
			ExpiresIn string `json:"expiresIn"` // "1d", "7d", "30d", "never"
			MaxUses   int    `json:"maxUses"`   // 1, 10, 0 (unlimited)
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		if req.ExpiresIn == "" {
			req.ExpiresIn = "7d"
		}
		link, err := s.Store.GenerateInviteLink(user.ID, c.Param("conversationId"), req.ExpiresIn, req.MaxUses)
		if err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), errAdminOnly) || strings.Contains(err.Error(), errGroupOwnerOnly) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"invite": link})
	})

	// List invite links
	api.GET("/conversations/:conversationId/group/invites", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		invites, err := s.Store.ListInviteLinks(user.ID, c.Param("conversationId"))
		if err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), errConversationAccessDenied) || strings.Contains(err.Error(), errGroupAccessDenied) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"invites": invites})
	})

	// Delete invite link
	api.DELETE("/conversations/:conversationId/group/invites/:inviteId", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		if err := s.Store.DeleteInviteLink(user.ID, c.Param("conversationId"), c.Param("inviteId")); err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), errAdminOnly) || strings.Contains(err.Error(), errGroupOwnerOnly) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Join by invite code
	api.POST("/conversations/group/join/:code", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		conversation, err := s.Store.JoinByInviteCode(user.ID, c.Param("code"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"conversation": conversation})
	})
}
