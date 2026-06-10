package middleware

import (
	"net/http"
	"strings"

	"easyChat/internal/auth"

	"github.com/gin-gonic/gin"
)

// AuthRequired 认证中间件
func AuthRequired(authService *auth.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := bearerToken(c)
		if token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "未提供认证令牌"})
			return
		}

		user, err := authService.UserFromToken(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "认证失败"})
			return
		}

		c.Set("user", user)
		c.Next()
	}
}

// bearerToken 从请求中提取 Bearer token
func bearerToken(c *gin.Context) string {
	header := c.GetHeader("Authorization")
	if len(header) > 7 && header[:7] == "Bearer " {
		return header[7:]
	}
	if token := strings.TrimSpace(c.Query("token")); token != "" {
		return token
	}
	return ""
}
