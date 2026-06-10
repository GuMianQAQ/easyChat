package webserver

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"easyChat/internal/auth"
	"easyChat/internal/chatstore"
	"easyChat/internal/webchat"

	"github.com/gin-gonic/gin"
)

func (s *Server) registerGroupRoutes(api *gin.RouterGroup) {
	api.POST("/conversations/group", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		var req chatstore.CreateGroupConversationInput
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}

		friends, err := s.Social.ListFriends(user.ID)
		if err != nil {
			c.Error(err)
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
			c.Error(err)
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
		user := c.MustGet("user").(auth.PublicUser)
		conversation, err := s.Store.GetGroupConversation(user.ID, c.Param("conversationId"))
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"conversation": conversation})
	})

	api.PATCH("/conversations/:conversationId/group", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		var req chatstore.UpdateGroupConversationRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		conversation, err := s.Store.UpdateGroupConversation(user.ID, c.Param("conversationId"), req)
		if err != nil {
			c.Error(err)
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
		user := c.MustGet("user").(auth.PublicUser)
		var req struct {
			BotEnabled bool `json:"botEnabled"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		conversation, err := s.Store.SetGroupBotEnabled(user.ID, c.Param("id"), req.BotEnabled)
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"conversation": conversation})
	})

	api.POST("/conversations/:conversationId/group/leave", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		if err := s.Store.LeaveGroupConversation(user.ID, c.Param("conversationId")); err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	api.DELETE("/conversations/:conversationId/group", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		if err := s.Store.DismissGroupConversation(user.ID, c.Param("conversationId")); err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Set member as admin (owner only)
	api.POST("/conversations/:conversationId/group/admin", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		var req struct {
			UserID string `json:"userId"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.UserID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		if err := s.Store.SetMemberRole(user.ID, c.Param("conversationId"), req.UserID, "admin"); err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Revoke admin role (owner only)
	api.DELETE("/conversations/:conversationId/group/admin/:userId", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		if err := s.Store.SetMemberRole(user.ID, c.Param("conversationId"), c.Param("userId"), "member"); err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Transfer ownership
	api.POST("/conversations/:conversationId/group/transfer", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		var req struct {
			UserID string `json:"userId"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.UserID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		if err := s.Store.TransferOwner(user.ID, c.Param("conversationId"), req.UserID); err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Mute a member
	api.POST("/conversations/:conversationId/group/mute", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
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
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Unmute a member
	api.POST("/conversations/:conversationId/group/unmute", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		var req struct {
			UserID string `json:"userId"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.UserID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		if err := s.Store.UnmuteMember(user.ID, c.Param("conversationId"), req.UserID); err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Get group permissions
	api.GET("/conversations/:conversationId/group/permissions", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		perms, err := s.Store.GetGroupPermissions(user.ID, c.Param("conversationId"))
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"permissions": perms})
	})

	// Update group permissions (owner only)
	api.PUT("/conversations/:conversationId/group/permissions", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		var req map[string]any
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		if err := s.Store.UpdateGroupPermissions(user.ID, c.Param("conversationId"), req); err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Pin a message (admin/owner only)
	api.POST("/conversations/:conversationId/group/pin", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		var req struct {
			MessageID string `json:"messageId"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.MessageID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		if err := s.Store.PinMessage(user.ID, c.Param("conversationId"), req.MessageID); err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Unpin a message (admin/owner only)
	api.DELETE("/conversations/:conversationId/group/pin/:messageId", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		if err := s.Store.UnpinMessage(user.ID, c.Param("conversationId"), c.Param("messageId")); err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Get pinned messages
	api.GET("/conversations/:conversationId/group/pins", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		pins, err := s.Store.GetPinnedMessages(user.ID, c.Param("conversationId"))
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"pins": pins})
	})

	// Get group files
	api.GET("/conversations/:conversationId/files", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
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
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"files": files, "total": total, "page": page, "pageSize": pageSize})
	})

	// Get group images
	api.GET("/conversations/:conversationId/images", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
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
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"images": images, "total": total, "page": page, "pageSize": pageSize})
	})

	// Generate invite link
	api.POST("/conversations/:conversationId/group/invites", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
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
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"invite": link})
	})

	// List invite links
	api.GET("/conversations/:conversationId/group/invites", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		invites, err := s.Store.ListInviteLinks(user.ID, c.Param("conversationId"))
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"invites": invites})
	})

	// Delete invite link
	api.DELETE("/conversations/:conversationId/group/invites/:inviteId", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		if err := s.Store.DeleteInviteLink(user.ID, c.Param("conversationId"), c.Param("inviteId")); err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Join by invite code
	api.POST("/conversations/group/join/:code", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		conversation, err := s.Store.JoinByInviteCode(user.ID, c.Param("code"))
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"conversation": conversation})
	})

	// Add members to group (direct invitation)
	api.POST("/conversations/:conversationId/group/members", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		var req struct {
			UserIDs []string `json:"userIds"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || len(req.UserIDs) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请选择要邀请的好友"})
			return
		}

		conversationID := c.Param("conversationId")
		addedNames, err := s.Store.AddGroupMembers(user.ID, conversationID, req.UserIDs)
		if err != nil {
			c.Error(err)
			return
		}

		// Save notification message and broadcast
		if len(addedNames) > 0 && s.Hub != nil {
			content := user.Nickname + " 邀请 " + strings.Join(addedNames, "、") + " 加入了群聊"
			notif, err := s.Store.SaveNotification(conversationID, user.ID, user.Nickname, content)
			if err == nil {
				// Get all group members to broadcast
				memberIDs, err := s.Store.ConversationMemberIDs(user.ID, conversationID)
				if err == nil {
					targets := make([]string, 0, len(memberIDs))
					for _, id := range memberIDs {
						if id != user.ID {
							targets = append(targets, id)
						}
					}
					if len(targets) > 0 {
						s.Hub.BroadcastPrivate(webchat.Message{
							ID:             notif.ID,
							ConversationID: conversationID,
							MessageScope:   webchat.ScopeGroup,
							Type:           webchat.MessageTypeNotification,
							MessageType:    webchat.ChatMessageText,
							SenderID:       user.ID,
							SenderName:     user.Nickname,
							Content:        content,
							CreatedAt:      notif.CreatedAt,
						}, targets...)
					}
				}
			}
		}

		c.JSON(http.StatusOK, gin.H{"added": addedNames})
	})

	// Album routes
	api.POST("/conversations/:conversationId/albums", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		conversationID := c.Param("conversationId")

		var req struct {
			Name        string `json:"name"`
			Description string `json:"description"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}

		album, err := s.Store.CreateAlbum(user.ID, conversationID, req.Name, req.Description)
		if err != nil {
			c.Error(err)
			return
		}

		c.JSON(http.StatusOK, gin.H{"album": album})
	})

	api.GET("/conversations/:conversationId/albums", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		conversationID := c.Param("conversationId")

		page := 1
		pageSize := 20
		if p := c.Query("page"); p != "" {
			fmt.Sscanf(p, "%d", &page)
		}
		if ps := c.Query("pageSize"); ps != "" {
			fmt.Sscanf(ps, "%d", &pageSize)
		}

		albums, total, err := s.Store.GetAlbums(user.ID, conversationID, page, pageSize)
		if err != nil {
			c.Error(err)
			return
		}

		c.JSON(http.StatusOK, gin.H{"albums": albums, "total": total, "page": page, "pageSize": pageSize})
	})

	api.GET("/conversations/:conversationId/albums/:albumId", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		albumID := c.Param("albumId")

		album, err := s.Store.GetAlbum(user.ID, albumID)
		if err != nil {
			c.Error(err)
			return
		}

		c.JSON(http.StatusOK, gin.H{"album": album})
	})

	api.PUT("/conversations/:conversationId/albums/:albumId", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		albumID := c.Param("albumId")

		var req struct {
			Name        string `json:"name"`
			Description string `json:"description"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}

		album, err := s.Store.UpdateAlbum(user.ID, albumID, req.Name, req.Description)
		if err != nil {
			c.Error(err)
			return
		}

		c.JSON(http.StatusOK, gin.H{"album": album})
	})

	api.DELETE("/conversations/:conversationId/albums/:albumId", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		albumID := c.Param("albumId")

		if err := s.Store.DeleteAlbum(user.ID, albumID); err != nil {
			c.Error(err)
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "相册已删除"})
	})

	api.POST("/conversations/:conversationId/albums/:albumId/photos", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		albumID := c.Param("albumId")

		file, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请选择文件"})
			return
		}

		// Upload file
		fileURL, err := s.Store.StoreUpload(file)
		if err != nil {
			c.Error(err)
			return
		}

		photo, err := s.Store.UploadAlbumPhoto(user.ID, albumID, fileURL, file.Filename, file.Size, file.Header.Get("Content-Type"))
		if err != nil {
			c.Error(err)
			return
		}

		c.JSON(http.StatusOK, gin.H{"photo": photo})
	})

	api.GET("/conversations/:conversationId/albums/:albumId/photos", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		albumID := c.Param("albumId")

		page := 1
		pageSize := 20
		if p := c.Query("page"); p != "" {
			fmt.Sscanf(p, "%d", &page)
		}
		if ps := c.Query("pageSize"); ps != "" {
			fmt.Sscanf(ps, "%d", &pageSize)
		}

		photos, total, err := s.Store.GetAlbumPhotos(user.ID, albumID, page, pageSize)
		if err != nil {
			c.Error(err)
			return
		}

		c.JSON(http.StatusOK, gin.H{"photos": photos, "total": total, "page": page, "pageSize": pageSize})
	})

	api.DELETE("/conversations/:conversationId/albums/:albumId/photos/:photoId", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		photoID := c.Param("photoId")

		if err := s.Store.DeleteAlbumPhoto(user.ID, photoID); err != nil {
			c.Error(err)
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "图片已删除"})
	})

	api.POST("/conversations/:conversationId/albums/:albumId/photos/batch-delete", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		albumID := c.Param("albumId")

		var req struct {
			PhotoIDs []string `json:"photoIds"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}

		if err := s.Store.BatchDeleteAlbumPhotos(user.ID, albumID, req.PhotoIDs); err != nil {
			c.Error(err)
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "图片已批量删除"})
	})

	api.GET("/conversations/:conversationId/album-photos", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		conversationID := c.Param("conversationId")

		page := 1
		pageSize := 20
		if p := c.Query("page"); p != "" {
			fmt.Sscanf(p, "%d", &page)
		}
		if ps := c.Query("pageSize"); ps != "" {
			fmt.Sscanf(ps, "%d", &pageSize)
		}

		photos, total, err := s.Store.GetAllAlbumPhotos(user.ID, conversationID, page, pageSize)
		if err != nil {
			c.Error(err)
			return
		}

		c.JSON(http.StatusOK, gin.H{"photos": photos, "total": total, "page": page, "pageSize": pageSize})
	})

	api.GET("/conversations/:conversationId/album-photos/mine", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		conversationID := c.Param("conversationId")

		page := 1
		pageSize := 20
		if p := c.Query("page"); p != "" {
			fmt.Sscanf(p, "%d", &page)
		}
		if ps := c.Query("pageSize"); ps != "" {
			fmt.Sscanf(ps, "%d", &pageSize)
		}

		photos, total, err := s.Store.GetMyAlbumPhotos(user.ID, conversationID, page, pageSize)
		if err != nil {
			c.Error(err)
			return
		}

		c.JSON(http.StatusOK, gin.H{"photos": photos, "total": total, "page": page, "pageSize": pageSize})
	})
}
