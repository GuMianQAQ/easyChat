package ai

import (
	"context"
	"encoding/binary"
	"fmt"
	"io"
	"log"
	"math"
	"sort"
	"strings"
	"time"

	"easyChat/internal/auth"
	"easyChat/internal/chatstore"

	"gorm.io/gorm"
)

const (
	assistantSystemPrompt = "你是一个友好的 AI 助手，名叫 AI 助手。请用简洁、准确的中文回答问题。"
	translateSystemPrompt = "你是一个翻译助手。将用户提供的文本翻译成目标语言。只输出翻译结果，不要解释。"
	summarySystemPrompt   = "你是一个摘要助手。将用户提供的多条消息总结为简洁的摘要。包含关键话题、主要结论和待办事项（如有）。"
	replySystemPrompt     = "你是一个回复建议助手。根据用户收到的消息，生成 3 个简短的回复建议。每行一个建议，不要编号。"
	codeSystemPrompt      = "你是一个代码生成助手。根据用户的需求生成代码。用 markdown 代码块格式输出，包含语言标识。"
)

type Service struct {
	provider Provider
	store    *chatstore.Service
	db       *gorm.DB
	config   Config
	stats    *Stats
}

func NewService(provider Provider, store *chatstore.Service, db *gorm.DB, config Config) *Service {
	return &Service{
		provider: provider,
		store:    store,
		db:       db,
		config:   config,
		stats:    NewStats(),
	}
}

func (s *Service) GetStats() *Stats {
	return s.stats
}

func (s *Service) HandleMessage(user auth.PublicUser, conversationID, messageScope, content string) (*chatstore.MessagePayload, error) {
	if !s.config.EnableChat {
		return nil, fmt.Errorf("AI 对话功能已关闭")
	}

	query := strings.TrimSpace(strings.TrimPrefix(content, "/ai"))
	if query == "" {
		return nil, fmt.Errorf("请输入问题内容，例如：/ai 你好")
	}

	history := s.GetConversationHistory(user.ID, conversationID, s.config.ContextWindow)
	messages := make([]Message, 0, len(history)+2)
	messages = append(messages, Message{Role: "system", Content: assistantSystemPrompt})
	messages = append(messages, history...)
	messages = append(messages, Message{Role: "user", Content: query})

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	resp, err := s.provider.Chat(ctx, ChatRequest{
		Messages:    messages,
		Temperature: s.config.Temperature,
		MaxTokens:   s.config.MaxTokens,
	})
	if err != nil {
		log.Printf("AI API error: %v", err)
		return nil, fmt.Errorf("AI 服务错误: %v", err)
	}

	if err := s.SaveConversation(user.ID, conversationID, "user", query); err != nil {
		log.Printf("failed to save user AI conversation: %v", err)
	}
	if err := s.SaveConversation(user.ID, conversationID, "assistant", resp.Content); err != nil {
		log.Printf("failed to save assistant AI conversation: %v", err)
	}

	aiUser := SystemUser()
	if err := s.store.EnsureMember(conversationID, aiUser.ID); err != nil {
		log.Printf("failed to ensure AI member: %v", err)
		return nil, fmt.Errorf("AI 加入会话失败: %v", err)
	}

	payload, err := s.store.SaveMessage(aiUser, chatstore.PersistMessageInput{
		ConversationID: conversationID,
		MessageScope:   messageScope,
		MessageType:    "text",
		Content:        resp.Content,
	})
	if err != nil {
		log.Printf("failed to save AI message: %v", err)
		return nil, fmt.Errorf("保存 AI 回复失败")
	}

	s.stats.RecordChat()
	return &payload, nil
}

func (s *Service) HandleStream(ctx context.Context, query string) (io.Reader, error) {
	if !s.config.EnableStream {
		return nil, fmt.Errorf("AI 流式功能已关闭")
	}

	s.stats.RecordStream()
	return s.provider.Stream(ctx, ChatRequest{
		Messages: []Message{
			{Role: "system", Content: assistantSystemPrompt},
			{Role: "user", Content: query},
		},
		Temperature: s.config.Temperature,
		MaxTokens:   s.config.MaxTokens,
	})
}

func (s *Service) EmbedText(ctx context.Context, text string) ([]float64, error) {
	return s.provider.Embed(ctx, text)
}

func (s *Service) Translate(ctx context.Context, text, targetLang string) (string, error) {
	if !s.config.EnableTools {
		return "", fmt.Errorf("AI 工具功能已关闭")
	}
	if targetLang == "" {
		targetLang = "中文"
	}

	resp, err := s.provider.Chat(ctx, ChatRequest{
		Messages: []Message{
			{Role: "system", Content: translateSystemPrompt},
			{Role: "user", Content: fmt.Sprintf("将以下文本翻译成%s：\n\n%s", targetLang, text)},
		},
		Temperature: 0.3,
		MaxTokens:   1000,
	})
	if err != nil {
		return "", fmt.Errorf("翻译失败: %v", err)
	}

	s.stats.RecordTranslate()
	return resp.Content, nil
}

func (s *Service) Summarize(ctx context.Context, texts []string) (string, error) {
	if !s.config.EnableTools {
		return "", fmt.Errorf("AI 工具功能已关闭")
	}

	resp, err := s.provider.Chat(ctx, ChatRequest{
		Messages: []Message{
			{Role: "system", Content: summarySystemPrompt},
			{Role: "user", Content: fmt.Sprintf("请总结以下消息：\n\n%s", strings.Join(texts, "\n"))},
		},
		Temperature: 0.3,
		MaxTokens:   500,
	})
	if err != nil {
		return "", fmt.Errorf("摘要失败: %v", err)
	}

	s.stats.RecordSummarize()
	return resp.Content, nil
}

func (s *Service) GenerateReplies(ctx context.Context, message string) ([]string, error) {
	if !s.config.EnableTools {
		return nil, fmt.Errorf("AI 工具功能已关闭")
	}

	resp, err := s.provider.Chat(ctx, ChatRequest{
		Messages: []Message{
			{Role: "system", Content: replySystemPrompt},
			{Role: "user", Content: fmt.Sprintf("收到这条消息，请生成 3 个回复建议：\n\n%s", message)},
		},
		Temperature: 0.7,
		MaxTokens:   200,
	})
	if err != nil {
		return nil, fmt.Errorf("生成回复建议失败: %v", err)
	}

	lines := strings.Split(strings.TrimSpace(resp.Content), "\n")
	replies := make([]string, 0, 3)
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		line = strings.TrimSpace(strings.TrimLeft(line, "0123456789.-)、"))
		if line != "" {
			replies = append(replies, line)
		}
	}

	s.stats.RecordReply()
	return replies, nil
}

func (s *Service) GenerateCode(ctx context.Context, query string) (string, error) {
	if !s.config.EnableTools {
		return "", fmt.Errorf("AI 工具功能已关闭")
	}

	resp, err := s.provider.Chat(ctx, ChatRequest{
		Messages: []Message{
			{Role: "system", Content: codeSystemPrompt},
			{Role: "user", Content: query},
		},
		Temperature: 0.2,
		MaxTokens:   2000,
	})
	if err != nil {
		return "", fmt.Errorf("代码生成失败: %v", err)
	}

	s.stats.RecordCode()
	return resp.Content, nil
}

func (s *Service) SaveConversation(userID, conversationID, role, content string) error {
	record := AIConversation{
		ID:             fmt.Sprintf("ai-conv-%d", time.Now().UnixNano()),
		ConversationID: conversationID,
		UserID:         userID,
		Role:           role,
		Content:        content,
		CreatedAt:      time.Now(),
	}
	return s.db.Create(&record).Error
}

func (s *Service) GetConversationHistory(userID, conversationID string, limit int) []Message {
	if limit <= 0 {
		limit = s.config.ContextWindow
	}

	var records []AIConversation
	s.db.Where("user_id = ? AND conversation_id = ?", userID, conversationID).
		Order("created_at asc").
		Limit(limit).
		Find(&records)

	messages := make([]Message, 0, len(records))
	for _, record := range records {
		messages = append(messages, Message{Role: record.Role, Content: record.Content})
	}
	return messages
}

func (s *Service) SaveEmbedding(conversationID, messageID, content string, embedding []float64) error {
	record := AIEmbedding{
		ID:             fmt.Sprintf("ai-emb-%d", time.Now().UnixNano()),
		ConversationID: conversationID,
		MessageID:      messageID,
		Content:        content,
		Embedding:      encodeEmbedding(embedding),
		CreatedAt:      time.Now(),
	}
	return s.db.Create(&record).Error
}

func (s *Service) SearchSimilar(conversationID, query string, limit int) ([]string, error) {
	if !s.config.EnableSearch {
		return nil, fmt.Errorf("AI 搜索功能已关闭")
	}
	if limit <= 0 {
		limit = 10
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	queryEmbedding, err := s.provider.Embed(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("生成查询向量失败: %v", err)
	}

	var records []AIEmbedding
	s.db.Where("conversation_id = ?", conversationID).Limit(limit * 3).Find(&records)

	type scored struct {
		content string
		score   float64
	}
	results := make([]scored, 0, len(records))
	for _, record := range records {
		embedding := decodeEmbedding(record.Embedding)
		if embedding == nil {
			continue
		}
		results = append(results, scored{
			content: record.Content,
			score:   cosineSimilarity(queryEmbedding, embedding),
		})
	}

	sort.Slice(results, func(i, j int) bool {
		return results[i].score > results[j].score
	})

	contents := make([]string, 0, limit)
	for i := 0; i < len(results) && i < limit; i++ {
		contents = append(contents, results[i].content)
	}

	s.stats.RecordSearch()
	return contents, nil
}

func (s *Service) SearchHybrid(conversationID, query string, limit int) ([]string, error) {
	if !s.config.EnableSearch {
		return nil, fmt.Errorf("AI 搜索功能已关闭")
	}
	if limit <= 0 {
		limit = 10
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	queryEmbedding, err := s.provider.Embed(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("生成查询向量失败: %v", err)
	}

	var records []AIEmbedding
	s.db.Where("conversation_id = ?", conversationID).Limit(limit * 3).Find(&records)

	type scored struct {
		content string
		score   float64
	}
	results := make([]scored, 0, len(records))

	queryLower := strings.ToLower(query)
	for _, record := range records {
		keywordScore := 0.0
		if strings.Contains(strings.ToLower(record.Content), queryLower) {
			keywordScore = 1
		}

		semanticScore := 0.0
		if embedding := decodeEmbedding(record.Embedding); embedding != nil {
			semanticScore = cosineSimilarity(queryEmbedding, embedding)
		}

		results = append(results, scored{
			content: record.Content,
			score:   keywordScore*0.4 + semanticScore*0.6,
		})
	}

	sort.Slice(results, func(i, j int) bool {
		return results[i].score > results[j].score
	})

	contents := make([]string, 0, limit)
	for i := 0; i < len(results) && i < limit; i++ {
		contents = append(contents, results[i].content)
	}

	s.stats.RecordSearch()
	return contents, nil
}

func encodeEmbedding(embedding []float64) []byte {
	buf := make([]byte, 8*len(embedding))
	for i, value := range embedding {
		binary.LittleEndian.PutUint64(buf[i*8:], math.Float64bits(value))
	}
	return buf
}

func decodeEmbedding(data []byte) []float64 {
	if len(data)%8 != 0 || len(data) == 0 {
		return nil
	}
	embedding := make([]float64, len(data)/8)
	for i := range embedding {
		embedding[i] = math.Float64frombits(binary.LittleEndian.Uint64(data[i*8:]))
	}
	return embedding
}

func cosineSimilarity(a, b []float64) float64 {
	if len(a) != len(b) || len(a) == 0 {
		return 0
	}

	var dot, normA, normB float64
	for i := range a {
		dot += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}
	if normA == 0 || normB == 0 {
		return 0
	}
	return dot / (math.Sqrt(normA) * math.Sqrt(normB))
}
