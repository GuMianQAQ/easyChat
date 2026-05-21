package webserver

import (
	"net/http"
	"strings"

	"easyChat/internal/auth"

	"github.com/gin-gonic/gin"
)

func (s *Server) registerAuthRoutes(api *gin.RouterGroup) {
	api.GET("/captcha", func(c *gin.Context) {
		captcha, err := s.Auth.Captcha()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": errCaptchaGenerateFailed})
			return
		}
		c.JSON(http.StatusOK, captcha)
	})

	authGroup := api.Group("/auth")
	authGroup.POST("/register", func(c *gin.Context) {
		var req auth.RegisterRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
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
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
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
	authGroup.PUT("/me/password", func(c *gin.Context) {
		var req auth.ChangePasswordRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		if err := s.Auth.ChangePassword(bearerToken(c), req); err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), errAuthExpired) {
				status = http.StatusUnauthorized
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": errPasswordChangedReLogin})
	})
	authGroup.PATCH("/me", func(c *gin.Context) {
		var req auth.UpdateProfileRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		user, err := s.Auth.UpdateProfile(bearerToken(c), req)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
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
	api.PUT("/users/me/profile", func(c *gin.Context) {
		var req auth.UpdateProfileRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
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
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		if err := s.Auth.ChangePassword(bearerToken(c), req); err != nil {
			status := http.StatusBadRequest
			if strings.Contains(err.Error(), errAuthExpired) {
				status = http.StatusUnauthorized
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": errPasswordChangedReLogin})
	})
}
