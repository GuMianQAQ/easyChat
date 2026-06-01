package chatstore

import (
	"path/filepath"
	"testing"
	"time"

	"easyChat/internal/auth"
	"easyChat/internal/social"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func newConversationSummaryTestService(t *testing.T) *Service {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "chat.db")), &gorm.Config{})
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	if err := db.AutoMigrate(
		&auth.User{},
		&social.Friendship{},
		&social.FriendRequest{},
		&Conversation{},
		&ConversationMember{},
		&Message{},
		&Favorite{},
		&UploadedFile{},
	); err != nil {
		t.Fatalf("migrate database: %v", err)
	}

	service, err := NewService(db, filepath.Join(t.TempDir(), "uploads"), Config{
		MaxImageBytes: 2 * 1024 * 1024,
		MaxFileBytes:  10 * 1024 * 1024,
	})
	if err != nil {
		t.Fatalf("create service: %v", err)
	}
	t.Cleanup(func() {
		sqlDB, err := db.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})
	return service
}

func TestBuildConversationSummaryUsesLatestFilePreview(t *testing.T) {
	service := newConversationSummaryTestService(t)

	self := auth.User{ID: "u-self", Username: "self_01", Nickname: "Self", PasswordHash: "hash"}
	peer := auth.User{ID: "u-peer", Username: "peer_01", Nickname: "Peer", PasswordHash: "hash"}
	if err := service.db.Create(&self).Error; err != nil {
		t.Fatalf("create self: %v", err)
	}
	if err := service.db.Create(&peer).Error; err != nil {
		t.Fatalf("create peer: %v", err)
	}

	now := time.Now()
	conversationID := StablePrivateConversationID(self.ID, peer.ID)
	conversation := Conversation{
		ID:        conversationID,
		Type:      "private",
		Name:      peer.Nickname,
		Avatar:    peer.Avatar,
		CreatedAt: now,
		UpdatedAt: now,
	}
	members := []ConversationMember{
		{ID: "member-self", ConversationID: conversationID, UserID: self.ID, Role: "member", JoinedAt: now},
		{ID: "member-peer", ConversationID: conversationID, UserID: peer.ID, Role: "member", JoinedAt: now},
	}
	latestMessageTime := now.Add(time.Minute)
	message := Message{
		ID:             "msg-file",
		ConversationID: conversationID,
		SenderID:       peer.ID,
		SenderName:     peer.Nickname,
		MessageType:    "file",
		Content:        "https://cdn.example.com/files/budget.xlsx?download=1",
		CreatedAt:      latestMessageTime,
	}

	if err := service.db.Create(&conversation).Error; err != nil {
		t.Fatalf("create conversation: %v", err)
	}
	for _, member := range members {
		if err := service.db.Create(&member).Error; err != nil {
			t.Fatalf("create member: %v", err)
		}
	}
	if err := service.db.Create(&message).Error; err != nil {
		t.Fatalf("create message: %v", err)
	}

	member, err := service.memberRecord(self.ID, conversationID)
	if err != nil {
		t.Fatalf("member record: %v", err)
	}
	summary, err := service.buildConversationSummary(self.ID, conversation, member)
	if err != nil {
		t.Fatalf("build conversation summary: %v", err)
	}

	if summary.LastMessage != "[文件] budget.xlsx" {
		t.Fatalf("unexpected last message preview: %q", summary.LastMessage)
	}
	if summary.LastMessageType != "file" {
		t.Fatalf("unexpected last message type: %q", summary.LastMessageType)
	}
}

func TestBuildConversationSummaryUsesRevokedPreview(t *testing.T) {
	service := newConversationSummaryTestService(t)

	self := auth.User{ID: "u-self", Username: "self_01", Nickname: "Self", PasswordHash: "hash"}
	peer := auth.User{ID: "u-peer", Username: "peer_01", Nickname: "Peer", PasswordHash: "hash"}
	if err := service.db.Create(&self).Error; err != nil {
		t.Fatalf("create self: %v", err)
	}
	if err := service.db.Create(&peer).Error; err != nil {
		t.Fatalf("create peer: %v", err)
	}

	now := time.Now()
	conversationID := StablePrivateConversationID(self.ID, peer.ID)
	conversation := Conversation{
		ID:        conversationID,
		Type:      "private",
		Name:      peer.Nickname,
		CreatedAt: now,
		UpdatedAt: now,
	}
	members := []ConversationMember{
		{ID: "member-self", ConversationID: conversationID, UserID: self.ID, Role: "member", JoinedAt: now},
		{ID: "member-peer", ConversationID: conversationID, UserID: peer.ID, Role: "member", JoinedAt: now},
	}
	message := Message{
		ID:             "msg-revoked",
		ConversationID: conversationID,
		SenderID:       peer.ID,
		SenderName:     peer.Nickname,
		MessageType:    "text",
		Content:        "hello",
		Revoked:        true,
		CreatedAt:      now.Add(time.Minute),
	}

	if err := service.db.Create(&conversation).Error; err != nil {
		t.Fatalf("create conversation: %v", err)
	}
	for _, member := range members {
		if err := service.db.Create(&member).Error; err != nil {
			t.Fatalf("create member: %v", err)
		}
	}
	if err := service.db.Create(&message).Error; err != nil {
		t.Fatalf("create message: %v", err)
	}

	member, err := service.memberRecord(self.ID, conversationID)
	if err != nil {
		t.Fatalf("member record: %v", err)
	}
	summary, err := service.buildConversationSummary(self.ID, conversation, member)
	if err != nil {
		t.Fatalf("build conversation summary: %v", err)
	}

	if summary.LastMessage != "对方撤回了一条消息" {
		t.Fatalf("unexpected revoked preview: %q", summary.LastMessage)
	}
}
