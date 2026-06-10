package webserver

import (
	"errors"
	"net/http"

	apperrors "easyChat/internal/errors"

	"github.com/gin-gonic/gin"
)

// ErrorHandler 统一错误处理中间件
func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		if len(c.Errors) > 0 {
			err := c.Errors.Last().Err
			var appErr *apperrors.AppError
			if errors.As(err, &appErr) {
				c.JSON(appErr.Code, gin.H{"error": appErr.Message})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "内部错误"})
			}
		}
	}
}
