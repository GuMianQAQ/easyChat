package chatstore

import (
	"fmt"
	"testing"
	"time"

	"easyChat/internal/auth"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func BenchmarkGetMessagesAround(b *testing.B) {
	db := setupTestDB(b)
	service := &Service{db: db}

	conversationID := "conv-1"
	createTestData(b, db, conversationID, 10000)

	targetMessageID := "msg-5000"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.GetMessagesAround("user-1", conversationID, targetMessageID, 30)
		if err != nil {
			b.Fatalf("GetMessagesAround failed: %v", err)
		}
	}
}

func BenchmarkGetGroupConversation(b *testing.B) {
	db := setupTestDB(b)
	service := &Service{db: db}

	conversationID := "conv-1"
	userID := "user-1"

	conv := Conversation{
		ID:   conversationID,
		Type: GroupConversationType,
		Name: "Test Group",
	}
	db.Create(&conv)

	member := ConversationMember{
		ID:             "member-1",
		ConversationID: conversationID,
		UserID:         userID,
		Role:           "owner",
		JoinedAt:       time.Now(),
	}
	db.Create(&member)

	for i := 0; i < 100; i++ {
		user := auth.User{
			ID:       fmt.Sprintf("user-%d", i),
			Username: fmt.Sprintf("user%d", i),
			Nickname: fmt.Sprintf("User %d", i),
		}
		db.Create(&user)

		member := ConversationMember{
			ID:             fmt.Sprintf("member-%d", i+1),
			ConversationID: conversationID,
			UserID:         user.ID,
			Role:           "member",
			JoinedAt:       time.Now(),
		}
		db.Create(&member)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.GetGroupConversation(userID, conversationID)
		if err != nil {
			b.Fatalf("GetGroupConversation failed: %v", err)
		}
	}
}

func setupTestDB(b *testing.B) *gorm.DB {
	b.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		b.Fatalf("failed to open database: %v", err)
	}
	if err := db.AutoMigrate(&Conversation{}, &ConversationMember{}, &Message{}, &auth.User{}); err != nil {
		b.Fatalf("failed to migrate database: %v", err)
	}
	return db
}

func createTestData(b *testing.B, db *gorm.DB, conversationID string, count int) {
	b.Helper()
	for i := 0; i < count; i++ {
		msg := Message{
			ID:             fmt.Sprintf("msg-%d", i),
			ConversationID: conversationID,
			SenderID:       "user-1",
			SenderName:     "Test User",
			MessageType:    "text",
			Content:        fmt.Sprintf("Message %d", i),
			CreatedAt:      time.Now().Add(time.Duration(i) * time.Minute),
		}
		if err := db.Create(&msg).Error; err != nil {
			b.Fatalf("failed to create message: %v", err)
		}
	}
}
