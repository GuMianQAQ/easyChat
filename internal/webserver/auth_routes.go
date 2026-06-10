package webserver

import (
	"net/http"

	"easyChat/internal/auth"

	"github.com/gin-gonic/gin"
)

func (s *Server) registerPublicAuthRoutes(api *gin.RouterGroup) {
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
			c.Error(err)
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
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, resp)
	})
}

func (s *Server) registerProtectedAuthRoutes(api *gin.RouterGroup) {
	api.GET("/users/me/profile", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		c.JSON(http.StatusOK, gin.H{"user": user})
	})
	api.PUT("/users/me/profile", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		var req auth.UpdateProfileRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		updatedUser, err := s.Auth.UpdateProfileByID(user.ID, req)
		if err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"user": updatedUser})
	})
	api.PUT("/users/me/password", func(c *gin.Context) {
		user := c.MustGet("user").(auth.PublicUser)
		var req auth.ChangePasswordRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
			return
		}
		if err := s.Auth.ChangePasswordByID(user.ID, req); err != nil {
			c.Error(err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": errPasswordChangedReLogin})
	})
}
