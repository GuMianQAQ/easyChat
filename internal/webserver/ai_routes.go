package webserver

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"easyChat/internal/auth"
	"easyChat/internal/chatstore"

	"github.com/gin-gonic/gin"
)

func (s *Server) registerAIRoutes(api *gin.RouterGroup) {
	ai := api.Group("/ai")
	ai.GET("/stream", s.handleAIStream)
	ai.POST("/chat", s.handleAIChat)
	ai.POST("/translate", s.handleAITranslate)
	ai.POST("/summarize", s.handleAISummarize)
	ai.POST("/complete", s.handleAIComplete)
	ai.POST("/predict-question", s.handleAIPredictQuestion)
	ai.GET("/search", s.handleAISearch)
	ai.GET("/stats", s.handleAIStats)
	ai.POST("/transcribe", s.handleAITranscribe)
}

func (s *Server) handleAIStream(c *gin.Context) {
	_ = c.MustGet("user").(auth.PublicUser)

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
	user := c.MustGet("user").(auth.PublicUser)

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
	_ = c.MustGet("user").(auth.PublicUser)

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
	_ = c.MustGet("user").(auth.PublicUser)

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

func (s *Server) handleAIComplete(c *gin.Context) {
	_ = c.MustGet("user").(auth.PublicUser)

	var req struct {
		Text        string `json:"text"`
		Granularity string `json:"granularity"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
		return
	}

	completion, err := s.AI.Complete(c.Request.Context(), req.Text, req.Granularity)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"completion": completion})
}

func (s *Server) handleAIPredictQuestion(c *gin.Context) {
	_ = c.MustGet("user").(auth.PublicUser)

	var req struct {
		Text string `json:"text"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
		return
	}

	question, answer, err := s.AI.PredictQuestion(c.Request.Context(), req.Text)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"question": question, "answer": answer})
}

func (s *Server) handleAISearch(c *gin.Context) {
	_ = c.MustGet("user").(auth.PublicUser)

	query := strings.TrimSpace(c.Query("q"))
	conversationID := strings.TrimSpace(c.Query("conversationId"))
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 q 参数"})
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
	_ = c.MustGet("user").(auth.PublicUser)

	c.JSON(http.StatusOK, s.AI.GetStats().Snapshot())
}

func (s *Server) handleAITranscribe(c *gin.Context) {
	_ = c.MustGet("user").(auth.PublicUser)

	var req struct {
		MessageID string `json:"messageId"`
		AudioURL  string `json:"audioUrl"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": errRequestFormat})
		return
	}

	if !s.AI.IsTranscribeEnabled() {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "语音转写功能未启用"})
		return
	}

	// Check if transcript already cached
	var message chatstore.Message
	if err := s.Store.DB().Where("id = ?", req.MessageID).First(&message).Error; err == nil && message.Transcript != "" {
		c.JSON(http.StatusOK, gin.H{"transcript": message.Transcript})
		return
	}

	// Resolve audio file path
	relPath := strings.TrimPrefix(req.AudioURL, "/")
	audioPath := filepath.Join(s.uploadsDir, strings.TrimPrefix(relPath, "uploads/"))

	transcript, err := s.AI.Transcribe(audioPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Cache transcript in DB
	if req.MessageID != "" {
		s.Store.DB().Model(&chatstore.Message{}).Where("id = ?", req.MessageID).Update("transcript", transcript)
	}

	// Get conversation members for broadcast
	if message.ConversationID != "" {
		memberIDs, _ := s.Store.GetConversationMemberIDs(message.ConversationID)
		if len(memberIDs) > 0 {
			s.Hub.BroadcastTranscriptUpdate(req.MessageID, message.ConversationID, transcript, memberIDs)
		}
	}

	c.JSON(http.StatusOK, gin.H{"transcript": transcript})
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
