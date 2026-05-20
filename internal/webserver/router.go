package webserver

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"easyChat/internal/auth"
	"easyChat/internal/chatstore"
	"easyChat/internal/social"
	"easyChat/internal/webchat"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type Server struct {
	Addr   string
	Hub    *webchat.Hub
	Auth   *auth.Service
	Store  *chatstore.Service
	Social *social.Service
}

func NewServer(addr string) *Server {
	dbPath := filepath.FromSlash("data/chat.db")
	uploadsDir := filepath.FromSlash("uploads")

	authService, err := auth.NewService(dbPath)
	if err != nil {
		log.Fatalf("failed to initialize auth service: %v", err)
	}
	store, err := chatstore.NewService(dbPath, uploadsDir)
	if err != nil {
		log.Fatalf("failed to initialize chat store: %v", err)
	}
	socialService, err := social.NewService(dbPath)
	if err != nil {
		log.Fatalf("failed to initialize social service: %v", err)
	}

	return &Server{
		Addr:   addr,
		Hub:    webchat.NewHub(),
		Auth:   authService,
		Store:  store,
		Social: socialService,
	}
}

func (s *Server) Run() error {
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())
	s.registerAPIRoutes(router)
	router.GET("/ws", s.handleWebSocket)
	s.registerFrontendRoutes(router)

	go s.Hub.Run()

	log.Printf("web server listening on http://%s", s.Addr)
	return router.Run(s.Addr)
}

func (s *Server) registerAPIRoutes(router *gin.Engine) {
	api := router.Group("/api")
	api.Use(corsMiddleware())

	api.GET("/captcha", func(c *gin.Context) {
		captcha, err := s.Auth.Captcha()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "验证码生成失败"})
			return
		}
		c.JSON(http.StatusOK, captcha)
	})

	authGroup := api.Group("/auth")
	authGroup.POST("/register", func(c *gin.Context) {
		var req auth.RegisterRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "璇锋眰鏍煎紡閿欒"})
			return
		}
		resp, err := s.Auth.Register(req)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, resp)
	})
	authGroup.POST("/login", func(c *gin.Context) {
		var req auth.LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "璇锋眰鏍煎紡閿欒"})
			return
		}
		resp, err := s.Auth.Login(req)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, resp)
	})
	authGroup.GET("/me", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"user": user})
	})
	authGroup.GET("/me/profile", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"user": user})
	})
	api.GET("/users/me", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"user": user})
	})
	api.GET("/users/me/profile", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"user": user})
	})
	authGroup.PUT("/me/password", func(c *gin.Context) {
		var req auth.ChangePasswordRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误"})
			return
		}
		if err := s.Auth.ChangePassword(bearerToken(c), req); err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), "登录已过期，请重新登录") {
				status = http.StatusUnauthorized
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "密码修改成功，请重新登录"})
	})
	api.PUT("/users/me/profile", func(c *gin.Context) {
		var req auth.UpdateProfileRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误"})
			return
		}
		user, err := s.Auth.UpdateProfile(bearerToken(c), req)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"user": user})
	})
	api.PUT("/users/me/password", func(c *gin.Context) {
		var req auth.ChangePasswordRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误"})
			return
		}
		if err := s.Auth.ChangePassword(bearerToken(c), req); err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), "登录已过期，请重新登录") {
				status = http.StatusUnauthorized
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "密码修改成功，请重新登录"})
	})
	authGroup.PATCH("/me", func(c *gin.Context) {
		var req auth.UpdateProfileRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "璇锋眰鏍煎紡閿欒"})
			return
		}
		user, err := s.Auth.UpdateProfile(bearerToken(c), req)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"user": user})
	})

	api.GET("/conversations", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		items, err := s.Store.ListConversations(user.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"items": items})
	})

	api.PATCH("/conversations/:conversationId/settings", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		var req struct {
			IsPinned *bool `json:"isPinned"`
			IsMuted  *bool `json:"isMuted"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "璇锋眰鏍煎紡閿欒"})
			return
		}
		conversation, err := s.Store.UpdateConversationSettings(user.ID, c.Param("conversationId"), req.IsPinned, req.IsMuted)
		if err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), "无权限访问该会话") {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"conversation": conversation})
	})

	api.DELETE("/conversations/:conversationId", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		if err := s.Store.DeleteConversationForUser(user.ID, c.Param("conversationId")); err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), "无权限访问该会话") {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	api.POST("/conversations/:conversationId/clear", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		if err := s.Store.ClearConversationForUser(user.ID, c.Param("conversationId")); err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), "无权限访问该会话") {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	api.POST("/conversations/:conversationId/read", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		if err := s.Store.MarkConversationRead(user.ID, c.Param("conversationId")); err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), "无权限访问该会话") {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"unreadCount": 0})
	})

	api.POST("/conversations/private", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		var req struct {
			TargetUserID string `json:"targetUserId"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "璇锋眰鏍煎紡閿欒"})
			return
		}
		if err := s.Social.CanStartPrivateConversation(user.ID, req.TargetUserID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		conversation, err := s.Store.EnsurePrivateConversation(user.ID, req.TargetUserID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"conversation": conversation})
	})

	api.POST("/conversations/group", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		var req chatstore.CreateGroupConversationInput
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误"})
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
				c.JSON(http.StatusForbidden, gin.H{"error": "只能邀请好友创建群聊"})
				return
			}
			if _, ok := seen[memberID]; ok {
				continue
			}
			seen[memberID] = struct{}{}
			memberIDs = append(memberIDs, memberID)
		}
		if len(memberIDs) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请至少选择一位好友"})
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
			if strings.Contains(err.Error(), "无权访问该会话") {
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
			c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误"})
			return
		}
		conversation, err := s.Store.UpdateGroupConversation(user.ID, c.Param("conversationId"), req)
		if err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), "无权访问该会话") {
				status = http.StatusForbidden
			}
			if strings.Contains(err.Error(), "只有群主") {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"conversation": conversation})
	})

	api.GET("/messages", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "30"))
		result, err := s.Store.GetMessages(user.ID, c.Query("conversationId"), page, pageSize)
		if err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), "无权限访问该会话") {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, result)
	})
	api.GET("/messages/around", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "30"))
		result, err := s.Store.GetMessagesAround(user.ID, c.Query("conversationId"), c.Query("messageId"), limit)
		if err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), "无权访问该会话") {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, result)
	})

	api.GET("/favorites", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		items, err := s.Store.ListFavorites(user.ID, c.Query("type"), c.Query("keyword"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"items": items})
	})

	api.POST("/favorites", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		var req struct {
			MessageID string `json:"messageId"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "璇锋眰鏍煎紡閿欒"})
			return
		}
		favorite, err := s.Store.CreateFavorite(user.ID, req.MessageID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"favorite": favorite})
	})

	api.DELETE("/favorites/:id", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		if err := s.Store.DeleteFavorite(user.ID, c.Param("id")); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})
	api.DELETE("/favorites/message/:messageId", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		if err := s.Store.DeleteFavoriteByMessage(user.ID, c.Param("messageId")); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	api.POST("/upload", func(c *gin.Context) {
		if _, err := s.Auth.UserFromToken(bearerToken(c)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		file, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缂傚搫鐨崶鍓у"})
			return
		}
		url, err := s.Store.StoreUpload(file)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"url": url})
	})
	api.POST("/upload/file", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		file, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请上传文件"})
			return
		}
		record, err := s.Store.StoreGenericUpload(user, file)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, record)
	})
	api.GET("/files", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		items, err := s.Store.ListFiles(user.ID, c.Query("type"), c.Query("keyword"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"items": items})
	})

	api.GET("/users/search", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		result, err := s.Social.SearchUser(user.ID, c.Query("username"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"user": result})
	})

	api.GET("/users/:id/profile", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		profile, err := s.Social.GetProfile(user.ID, c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"user": profile})
	})

	api.GET("/users/me/privacy", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		settings, err := s.Social.GetPrivacy(user.ID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, settings)
	})

	api.PUT("/users/me/privacy", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		var req social.PrivacySettings
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "璇锋眰鏍煎紡閿欒"})
			return
		}
		settings, err := s.Social.UpdatePrivacy(user.ID, req)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, settings)
	})

	api.POST("/friend-requests", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		var req social.SendFriendRequestInput
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "璇锋眰鏍煎紡閿欒"})
			return
		}
		result, err := s.Social.SendFriendRequest(user.ID, req)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, result)
	})

	api.GET("/friend-requests", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		items, err := s.Social.ListFriendRequests(user.ID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"items": items})
	})

	api.POST("/friend-requests/:id/accept", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		friend, err := s.Social.AcceptFriendRequest(user.ID, c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if _, convErr := s.Store.EnsurePrivateConversation(user.ID, friend.FriendID); convErr != nil {
			log.Printf("failed to ensure private conversation after friend acceptance: %v", convErr)
		}
		c.JSON(http.StatusOK, gin.H{"friend": friend})
	})

	api.POST("/friend-requests/:id/reject", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		if err := s.Social.RejectFriendRequest(user.ID, c.Param("id")); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	api.GET("/friends", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		items, err := s.Social.ListFriends(user.ID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"items": items})
	})

	api.GET("/friends/blocked", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		items, err := s.Social.ListBlockedFriends(user.ID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"items": items})
	})

	api.PUT("/friends/:friendId", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		var req social.UpdateFriendRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "璇锋眰鏍煎紡閿欒"})
			return
		}
		friend, err := s.Social.UpdateFriend(user.ID, c.Param("friendId"), req)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"friend": friend})
	})

	api.DELETE("/friends/:friendId", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		if err := s.Social.DeleteFriend(user.ID, c.Param("friendId")); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	api.POST("/friends/:friendId/block", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		friend, err := s.Social.BlockFriend(user.ID, c.Param("friendId"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"message":   "宸插姞鍏ラ粦鍚嶅崟",
			"friendId":  friend.FriendID,
			"isBlocked": friend.IsBlocked,
			"friend":    friend,
		})
	})

	api.POST("/friends/:friendId/unblock", func(c *gin.Context) {
		user, err := s.Auth.UserFromToken(bearerToken(c))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		friend, err := s.Social.UnblockFriend(user.ID, c.Param("friendId"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"message":   "宸茬Щ鍑洪粦鍚嶅崟",
			"friendId":  friend.FriendID,
			"isBlocked": friend.IsBlocked,
			"friend":    friend,
		})
	})
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept,Origin,X-Requested-With")
		c.Writer.Header().Set("Access-Control-Max-Age", "3600")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func bearerToken(c *gin.Context) string {
	header := c.GetHeader("Authorization")
	if len(header) > 7 && header[:7] == "Bearer " {
		return header[7:]
	}
	return ""
}

func (s *Server) registerFrontendRoutes(router *gin.Engine) {
	distDir := filepath.FromSlash("frontend/dist")
	indexPath := filepath.Join(distDir, "index.html")
	assetsPath := filepath.Join(distDir, "assets")
	uploadsPath := filepath.FromSlash("uploads")

	if info, err := os.Stat(assetsPath); err == nil && info.IsDir() {
		router.Static("/assets", assetsPath)
	}
	if info, err := os.Stat(uploadsPath); err == nil && info.IsDir() {
		router.Static("/uploads", uploadsPath)
	}

	if info, err := os.Stat(indexPath); err == nil && !info.IsDir() {
		router.GET("/", func(c *gin.Context) {
			c.File(indexPath)
		})
		router.NoRoute(func(c *gin.Context) {
			if c.Request.Method != http.MethodGet {
				c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
				return
			}
			c.File(indexPath)
		})
		return
	}

	router.GET("/", func(c *gin.Context) {
		c.Data(
			http.StatusOK,
			"text/plain; charset=utf-8",
			[]byte("frontend/dist not found. Run npm install and npm run build in frontend."),
		)
	})
}

func (s *Server) handleWebSocket(c *gin.Context) {
	user, err := s.Auth.UserFromToken(c.Query("token"))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("websocket upgrade failed: %v", err)
		return
	}

	client := webchat.NewClient(s.Hub, s.Store, s.Social, conn, user)
	s.Hub.Register(client)
	client.Start()
}
