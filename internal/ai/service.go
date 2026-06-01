package ai

import (
	"context"
	"encoding/binary"
	"encoding/json"
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
	if !s.config.Enable.Chat {
		return nil, fmt.Errorf("AI 对话功能已关闭")
	}

	query := strings.TrimSpace(strings.TrimPrefix(content, "/ai"))
	if query == "" {
		return nil, fmt.Errorf("请输入问题内容，例如：/ai 你好")
	}

	history := s.GetConversationHistory(user.ID, conversationID, s.config.ContextWindow)
	messages := make([]Message, 0, len(history)+2)
	messages = append(messages, Message{Role: "system", Content: s.config.SystemPrompt})
	messages = append(messages, history...)
	messages = append(messages, Message{Role: "user", Content: query})

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(s.config.Timeout.Chat)*time.Second)
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

type StreamResult struct {
	Content string
	Payload *chatstore.MessagePayload
	Error   error
}

func (s *Service) HandleMessageStream(user auth.PublicUser, conversationID, messageScope, content string) (<-chan string, <-chan StreamResult) {
	chunkCh := make(chan string, 64)
	resultCh := make(chan StreamResult, 1)

	go func() {
		defer close(chunkCh)

		if !s.config.Enable.Stream {
			resultCh <- StreamResult{Error: fmt.Errorf("AI 流式功能已关闭")}
			return
		}

		query := strings.TrimSpace(strings.TrimPrefix(content, "/ai"))
		if query == "" {
			resultCh <- StreamResult{Error: fmt.Errorf("请输入问题内容，例如：/ai 你好")}
			return
		}

		history := s.GetConversationHistory(user.ID, conversationID, s.config.ContextWindow)
		messages := make([]Message, 0, len(history)+2)
		messages = append(messages, Message{Role: "system", Content: s.config.SystemPrompt})
		messages = append(messages, history...)
		messages = append(messages, Message{Role: "user", Content: query})

		ctx, cancel := context.WithTimeout(context.Background(), time.Duration(s.config.Timeout.Stream)*time.Second)
		defer cancel()

		stream, err := s.provider.Stream(ctx, ChatRequest{
			Messages:    messages,
			Temperature: s.config.Temperature,
			MaxTokens:   s.config.MaxTokens,
		})
		if err != nil {
			resultCh <- StreamResult{Error: fmt.Errorf("AI 服务错误: %v", err)}
			return
		}

		var fullContent strings.Builder
		buf := make([]byte, 4096)
		for {
			n, readErr := stream.Read(buf)
			if n > 0 {
				chunk := string(buf[:n])
				fullContent.WriteString(chunk)
				select {
				case chunkCh <- chunk:
				case <-ctx.Done():
					resultCh <- StreamResult{Error: ctx.Err()}
					return
				}
			}
			if readErr != nil {
				if readErr != io.EOF {
					resultCh <- StreamResult{Error: fmt.Errorf("读取流失败: %v", readErr)}
					return
				}
				break
			}
		}

		finalContent := fullContent.String()
		if finalContent == "" {
			resultCh <- StreamResult{Error: fmt.Errorf("AI 返回内容为空")}
			return
		}

		if err := s.SaveConversation(user.ID, conversationID, "user", query); err != nil {
			log.Printf("failed to save user AI conversation: %v", err)
		}
		if err := s.SaveConversation(user.ID, conversationID, "assistant", finalContent); err != nil {
			log.Printf("failed to save assistant AI conversation: %v", err)
		}

		aiUser := SystemUser()
		if err := s.store.EnsureMember(conversationID, aiUser.ID); err != nil {
			log.Printf("failed to ensure AI member: %v", err)
			resultCh <- StreamResult{Error: fmt.Errorf("AI 加入会话失败: %v", err)}
			return
		}

		payload, err := s.store.SaveMessage(aiUser, chatstore.PersistMessageInput{
			ConversationID: conversationID,
			MessageScope:   messageScope,
			MessageType:    "text",
			Content:        finalContent,
		})
		if err != nil {
			log.Printf("failed to save AI message: %v", err)
			resultCh <- StreamResult{Error: fmt.Errorf("保存 AI 回复失败")}
			return
		}

		s.stats.RecordStream()
		resultCh <- StreamResult{Content: finalContent, Payload: &payload}
	}()

	return chunkCh, resultCh
}

func (s *Service) HandleStream(ctx context.Context, query string) (io.Reader, error) {
	if !s.config.Enable.Stream {
		return nil, fmt.Errorf("AI 流式功能已关闭")
	}

	s.stats.RecordStream()
	return s.provider.Stream(ctx, ChatRequest{
		Messages: []Message{
			{Role: "system", Content: s.config.SystemPrompt},
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
	if !s.config.Enable.Tools {
		return "", fmt.Errorf("AI 工具功能已关闭")
	}
	if targetLang == "" {
		targetLang = "中文"
	}

	resp, err := s.provider.Chat(ctx, ChatRequest{
		Messages: []Message{
			{Role: "system", Content: s.config.TranslatePrompt},
			{Role: "user", Content: fmt.Sprintf("将以下文本翻译成%s：\n\n%s", targetLang, text)},
		},
		Temperature: s.config.Translate.Temperature,
		MaxTokens:   s.config.Translate.MaxTokens,
	})
	if err != nil {
		return "", fmt.Errorf("翻译失败: %v", err)
	}

	s.stats.RecordTranslate()
	return resp.Content, nil
}

func (s *Service) Summarize(ctx context.Context, texts []string) (string, error) {
	if !s.config.Enable.Tools {
		return "", fmt.Errorf("AI 工具功能已关闭")
	}

	resp, err := s.provider.Chat(ctx, ChatRequest{
		Messages: []Message{
			{Role: "system", Content: s.config.SummarizePrompt},
			{Role: "user", Content: fmt.Sprintf("请总结以下消息：\n\n%s", strings.Join(texts, "\n"))},
		},
		Temperature: s.config.Summarize.Temperature,
		MaxTokens:   s.config.Summarize.MaxTokens,
	})
	if err != nil {
		return "", fmt.Errorf("摘要失败: %v", err)
	}

	s.stats.RecordSummarize()
	return resp.Content, nil
}

func (s *Service) Complete(ctx context.Context, text, granularity string) (string, error) {
	if !s.config.Enable.Tools {
		return "", nil
	}

	var systemPrompt string
	switch granularity {
	case "medium":
		systemPrompt = s.config.CompleteMediumPrompt
	case "complex":
		systemPrompt = s.config.CompleteComplexPrompt
	default:
		systemPrompt = s.config.CompleteSimplePrompt
	}

	resp, err := s.provider.Chat(ctx, ChatRequest{
		Messages: []Message{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: fmt.Sprintf("用户当前输入: %s", text)},
		},
		Temperature: s.config.Temperature,
		MaxTokens:   s.config.Complete.MaxTokens,
	})
	if err != nil {
		log.Printf("[Complete] AI error: %v", err)
		return "", nil
	}

	completion := strings.TrimSpace(resp.Content)
	log.Printf("[Complete] AI response: text=%q, granularity=%s, completion=%q", text, granularity, completion)

	s.stats.RecordComplete()
	return completion, nil
}

func (s *Service) PredictQuestion(ctx context.Context, text string) (string, string, error) {
	if !s.config.Enable.Tools {
		return "", "", nil
	}

	resp, err := s.provider.Chat(ctx, ChatRequest{
		Messages: []Message{
			{Role: "system", Content: s.config.PredictQuestionPrompt},
			{Role: "user", Content: fmt.Sprintf("用户当前输入: %s", text)},
		},
		Temperature: s.config.Temperature,
		MaxTokens:   s.config.Predict.MaxTokens,
	})
	if err != nil {
		log.Printf("[PredictQuestion] AI error: %v", err)
		return "", "", nil
	}

	rawContent := strings.TrimSpace(resp.Content)
	log.Printf("[PredictQuestion] AI raw response: %q", rawContent)

	var result struct {
		Question string `json:"question"`
		Answer   string `json:"answer"`
	}
	if err := json.Unmarshal([]byte(rawContent), &result); err != nil {
		log.Printf("[PredictQuestion] JSON parse error: %v, raw content: %q", err, rawContent)
		return "", "", nil
	}

	log.Printf("[PredictQuestion] parsed result: question=%q, answer=%q", result.Question, result.Answer)

	s.stats.RecordPredict()
	return strings.TrimSpace(result.Question), strings.TrimSpace(result.Answer), nil
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

func (s *Service) SearchHybrid(conversationID, query string, limit int) ([]SearchResultItem, error) {
	if !s.config.Enable.Search {
		return nil, fmt.Errorf("AI 搜索功能已关闭")
	}
	if limit <= 0 {
		limit = 10
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(s.config.Timeout.Chat)*time.Second)
	defer cancel()

	queryEmbedding, err := s.provider.Embed(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("生成查询向量失败: %v", err)
	}

	var records []AIEmbedding
	dbQuery := s.db
	if conversationID != "" {
		dbQuery = dbQuery.Where("conversation_id = ?", conversationID)
	}
	dbQuery.Limit(limit * 3).Find(&records)

	type scored struct {
		record AIEmbedding
		score  float64
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
			record: record,
			score:  keywordScore*0.4 + semanticScore*0.6,
		})
	}

	sort.Slice(results, func(i, j int) bool {
		return results[i].score > results[j].score
	})

	items := make([]SearchResultItem, 0, limit)
	for i := 0; i < len(results) && i < limit; i++ {
		r := results[i].record
		items = append(items, SearchResultItem{
			MessageID:        r.MessageID,
			ConversationID:   r.ConversationID,
			ConversationName: r.ConversationID,
			SenderName:       "",
			Content:          r.Content,
			CreatedAt:        r.CreatedAt.Format("2006-01-02 15:04:05"),
			Score:            results[i].score,
		})
	}

	s.stats.RecordSearch()
	return items, nil
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
