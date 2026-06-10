package webserver

import (
	"net/http"
	"strconv"

	"easyChat/internal/auth"

	"github.com/gin-gonic/gin"
)

func (s *Server) registerMessageRoutes(api *gin.RouterGroup) {
	api.GET("/messages", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "30"))
		result, err := s.Store.GetMessages(user.ID, c.Query("conversationId"), page, pageSize)
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, result)
	})

	api.GET("/messages/around", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "30"))
		result, err := s.Store.GetMessagesAround(user.ID, c.Query("conversationId"), c.Query("messageId"), limit)
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, result)
	})
}
