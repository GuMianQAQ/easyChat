package ai

import (
	"context"
	"io"
	"strings"
	"testing"
)

type MockProvider struct {
	response string
	embedding []float64
}

func (m *MockProvider) Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	return &ChatResponse{
		Content: m.response,
		Model:   "mock",
		Usage:   Usage{TotalTokens: 10},
	}, nil
}

func (m *MockProvider) Stream(ctx context.Context, req ChatRequest) (io.Reader, error) {
	return strings.NewReader(m.response), nil
}

func (m *MockProvider) Embed(ctx context.Context, text string) ([]float64, error) {
	if m.embedding != nil {
		return m.embedding, nil
	}
	return []float64{0.1, 0.2, 0.3}, nil
}

func TestTranslate(t *testing.T) {
	mock := &MockProvider{response: "Hello"}
	service := NewService(mock, nil, nil, Config{
		Enable:    EnableConfig{Chat: true, Stream: true, Tools: true, Search: true},
		Timeout:   TimeoutConfig{Chat: 30, Stream: 60},
		Translate: TranslateConfig{Temperature: 0.3, MaxTokens: 1000},
		Summarize: SummarizeConfig{Temperature: 0.3, MaxTokens: 500},
		Complete:  CompleteConfig{MaxTokens: 3000},
		Predict:   PredictConfig{MaxTokens: 3000},
	})

	result, err := service.Translate(context.Background(), "你好", "英文")
	if err != nil {
		t.Fatalf("Translate() error: %v", err)
	}
	if result != "Hello" {
		t.Errorf("expected 'Hello', got '%s'", result)
	}
}

func TestSummarize(t *testing.T) {
	mock := &MockProvider{response: "这是一段摘要"}
	service := NewService(mock, nil, nil, Config{
		Enable:    EnableConfig{Chat: true, Stream: true, Tools: true, Search: true},
		Timeout:   TimeoutConfig{Chat: 30, Stream: 60},
		Translate: TranslateConfig{Temperature: 0.3, MaxTokens: 1000},
		Summarize: SummarizeConfig{Temperature: 0.3, MaxTokens: 500},
		Complete:  CompleteConfig{MaxTokens: 3000},
		Predict:   PredictConfig{MaxTokens: 3000},
	})

	result, err := service.Summarize(context.Background(), []string{"消息1", "消息2"})
	if err != nil {
		t.Fatalf("Summarize() error: %v", err)
	}
	if result != "这是一段摘要" {
		t.Errorf("expected '这是一段摘要', got '%s'", result)
	}
}

func TestEncodeDecodeEmbedding(t *testing.T) {
	original := []float64{0.1, 0.2, 0.3, -0.5, 1.0}
	encoded := encodeEmbedding(original)
	decoded := decodeEmbedding(encoded)

	if len(decoded) != len(original) {
		t.Fatalf("length mismatch: %d vs %d", len(decoded), len(original))
	}
	for i := range original {
		if original[i] != decoded[i] {
			t.Errorf("value mismatch at %d: %f vs %f", i, original[i], decoded[i])
		}
	}
}

func TestCosineSimilarity(t *testing.T) {
	a := []float64{1, 0, 0}
	b := []float64{1, 0, 0}
	sim := cosineSimilarity(a, b)
	if sim != 1.0 {
		t.Errorf("expected 1.0, got %f", sim)
	}

	c := []float64{0, 1, 0}
	sim = cosineSimilarity(a, c)
	if sim != 0.0 {
		t.Errorf("expected 0.0, got %f", sim)
	}
}
