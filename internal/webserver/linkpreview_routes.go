package webserver

import (
	"net/http"
	"strings"

	"easyChat/internal/linkpreview"

	"github.com/gin-gonic/gin"
)

func (s *Server) registerLinkPreviewRoutes(rg *gin.RouterGroup) {
	lp := linkpreview.NewService(s.Store.DB())

	rg.GET("/link-preview", func(c *gin.Context) {
		rawURL := c.Query("url")
		if rawURL == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing url parameter"})
			return
		}

		preview, err := lp.FetchPreview(rawURL)
		if err != nil {
			errMsg := err.Error()
			if strings.Contains(errMsg, "invalid URL") || strings.Contains(errMsg, "private network") {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid URL"})
			} else {
				c.JSON(http.StatusBadGateway, gin.H{"error": "failed to fetch preview"})
			}
			return
		}

		c.JSON(http.StatusOK, preview)
	})
}
