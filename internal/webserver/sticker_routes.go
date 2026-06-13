package webserver

import (
	"net/http"

	"easyChat/internal/auth"
	"easyChat/internal/sticker"

	"github.com/gin-gonic/gin"
)

func (s *Server) registerStickerRoutes(rg *gin.RouterGroup) {
	stickerSvc := sticker.NewService(s.Store.DB())

	rg.GET("/favorite-stickers", func(c *gin.Context) {
		user := c.MustGet("user").(auth.User)
		stickers, err := stickerSvc.GetByUser(user.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch stickers"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"stickers": stickers})
	})

	rg.POST("/favorite-stickers", func(c *gin.Context) {
		user := c.MustGet("user").(auth.User)

		file, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing file"})
			return
		}

		url, err := s.Store.StoreUpload(file)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to upload file"})
			return
		}

		sticker, err := stickerSvc.Create(user.ID, url)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create sticker"})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"sticker": sticker})
	})

	rg.DELETE("/favorite-stickers/:id", func(c *gin.Context) {
		user := c.MustGet("user").(auth.User)
		stickerID := c.Param("id")

		if err := stickerSvc.Delete(user.ID, stickerID); err != nil {
			if err.Error() == "sticker not found" {
				c.JSON(http.StatusNotFound, gin.H{"error": "sticker not found"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete sticker"})
			}
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	rg.POST("/favorite-stickers/collect", func(c *gin.Context) {
		user := c.MustGet("user").(auth.User)

		var req struct {
			MessageID string `json:"messageId" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing messageId"})
			return
		}

		sticker, err := stickerSvc.CollectFromMessage(user.ID, req.MessageID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"sticker": sticker})
	})
}
