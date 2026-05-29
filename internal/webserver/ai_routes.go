package webserver

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func (s *Server) registerAIRoutes(api *gin.RouterGroup) {
	ai := api.Group("/ai")
	ai.GET("/stream", s.handleAIStream)
	ai.POST("/chat", s.handleAIChat)
	ai.POST("/translate", s.handleAITranslate)
	ai.POST("/summarize", s.handleAISummarize)
	ai.POST("/generate-replies", s.handleAIGenerateReplies)
	ai.POST("/generate-code", s.handleAIGenerateCode)
	ai.GET("/search", s.handleAISearch)
	ai.GET("/stats", s.handleAIStats)
}

func (s *Server) handleAIStream(c *gin.Context) {
	if _, err := s.Auth.UserFromToken(bearerToken(c)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	query := strings.TrimSpace(c.Query("query"))
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 query 参数"})
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	ctx, cancel := context.WithCancel(c.Request.Context())
	defer cancel()

	stream, err := s.AI.HandleStream(ctx, query)
	if err != nil {
		_ = writeSSEJSON(c.Writer, "error", gin.H{"error": err.Error()})
		c.Writer.Flush()
		return
	}

	scanner := bufio.NewScanner(stream)
	for scanner.Scan() {
		select {
		case <-ctx.Done():
			return
		default:
		}

		chunk := scanner.Text()
		if chunk == "" {
			continue
		}
		_ = writeSSEText(c.Writer, "", chunk)
		c.Writer.Flush()
	}

	if err := scanner.Err(); err != nil && ctx.Err() == nil {
		_ = writeSSEJSON(c.Writer, "error", gin.H{"error": err.Error()})
		c.Writer.Flush()
		return
	}

	_ = writeSSEJSON(c.Writer, "done", gin.H{})
	c.Writer.Flush()
}

func (s *Server) handleAIChat(c *gin.Context) {
	user, err := s.Auth.UserFromToken(bearerToken(c))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var req struct {
		Content        string `json:"content"`
		ConversationID string `json:"conversationId"`
		MessageScope   string `json:"messageScope"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
		return
	}

	payload, err := s.AI.HandleMessage(user, req.ConversationID, req.MessageScope, req.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, payload)
}

func (s *Server) handleAITranslate(c *gin.Context) {
	if _, err := s.Auth.UserFromToken(bearerToken(c)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var req struct {
		Text       string `json:"text"`
		TargetLang string `json:"targetLang"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
		return
	}

	result, err := s.AI.Translate(c.Request.Context(), req.Text, req.TargetLang)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"translation": result})
}

func (s *Server) handleAISummarize(c *gin.Context) {
	if _, err := s.Auth.UserFromToken(bearerToken(c)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var req struct {
		Texts []string `json:"texts"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
		return
	}

	result, err := s.AI.Summarize(c.Request.Context(), req.Texts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"summary": result})
}

func (s *Server) handleAIGenerateReplies(c *gin.Context) {
	if _, err := s.Auth.UserFromToken(bearerToken(c)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var req struct {
		Message string `json:"message"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
		return
	}

	replies, err := s.AI.GenerateReplies(c.Request.Context(), req.Message)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"replies": replies})
}

func (s *Server) handleAIGenerateCode(c *gin.Context) {
	if _, err := s.Auth.UserFromToken(bearerToken(c)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var req struct {
		Query string `json:"query"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
		return
	}

	result, err := s.AI.GenerateCode(c.Request.Context(), req.Query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": result})
}

func (s *Server) handleAISearch(c *gin.Context) {
	if _, err := s.Auth.UserFromToken(bearerToken(c)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	query := strings.TrimSpace(c.Query("q"))
	conversationID := strings.TrimSpace(c.Query("conversationId"))
	if query == "" || conversationID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 q 或 conversationId 参数"})
		return
	}

	results, err := s.AI.SearchHybrid(conversationID, query, 10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"results": results})
}

func (s *Server) handleAIStats(c *gin.Context) {
	if _, err := s.Auth.UserFromToken(bearerToken(c)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, s.AI.GetStats().Snapshot())
}

func writeSSEJSON(w http.ResponseWriter, event string, payload any) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return writeSSEText(w, event, string(data))
}

func writeSSEText(w http.ResponseWriter, event, data string) error {
	if event != "" {
		if _, err := fmt.Fprintf(w, "event: %s\n", event); err != nil {
			return err
		}
	}

	for _, line := range strings.Split(data, "\n") {
		if _, err := fmt.Fprintf(w, "data: %s\n", line); err != nil {
			return err
		}
	}

	_, err := fmt.Fprint(w, "\n")
	return err
}
