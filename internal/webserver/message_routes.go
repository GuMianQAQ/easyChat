package webserver

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

func (s *Server) registerMessageRoutes(api *gin.RouterGroup) {
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
			if strings.Contains(err.Error(), errConversationAccessDenied) || strings.Contains(err.Error(), errConversationNoPermission) {
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
			if strings.Contains(err.Error(), errConversationAccessDenied) || strings.Contains(err.Error(), errConversationNoPermission) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, result)
	})
}
