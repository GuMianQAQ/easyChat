package social

import (
	"path/filepath"
	"testing"

	"easyChat/internal/auth"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func newTestService(t *testing.T) *Service {
	t.Helper()
	dbPath := filepath.Join(t.TempDir(), "social.db")
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		t.Fatalf("open database failed: %v", err)
	}
	if err := db.AutoMigrate(&auth.User{}, &Friendship{}, &FriendRequest{}); err != nil {
		t.Fatalf("migrate database failed: %v", err)
	}
	service, err := NewService(db)
	if err != nil {
		t.Fatalf("NewService failed: %v", err)
	}
	t.Cleanup(func() {
		sqlDB, err := service.db.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})
	return service
}

func TestSearchUserUsesExactUsernameMatch(t *testing.T) {
	service := newTestService(t)

	alice := auth.User{
		ID:                  "u-alice",
		Username:            "alice_001",
		Nickname:            "Alice",
		PasswordHash:        "hash",
		AllowSearch:         true,
		AllowFriendRequest:  true,
		RequireFriendVerify: true,
	}
	bob := auth.User{
		ID:                  "u-bob",
		Username:            "bob_001",
		Nickname:            "Bob",
		PasswordHash:        "hash",
		AllowSearch:         true,
		AllowFriendRequest:  true,
		RequireFriendVerify: true,
	}
	if err := service.db.Create(&alice).Error; err != nil {
		t.Fatalf("create alice failed: %v", err)
	}
	if err := service.db.Create(&bob).Error; err != nil {
		t.Fatalf("create bob failed: %v", err)
	}

	result, err := service.SearchUser(alice.ID, "bob_001")
	if err != nil {
		t.Fatalf("SearchUser exact failed: %v", err)
	}
	if result == nil || result.Username != "bob_001" {
		t.Fatalf("expected exact username result, got %#v", result)
	}

	partial, err := service.SearchUser(alice.ID, "bob")
	if err != nil {
		t.Fatalf("SearchUser partial failed: %v", err)
	}
	if partial != nil {
		t.Fatalf("expected no partial match, got %#v", partial)
	}
}

func TestSearchUserRespectsAllowSearchAndReturnsRequestID(t *testing.T) {
	service := newTestService(t)

	requester := auth.User{
		ID:                  "u-requester",
		Username:            "requester_01",
		Nickname:            "Requester",
		PasswordHash:        "hash",
		AllowSearch:         true,
		AllowFriendRequest:  true,
		RequireFriendVerify: true,
	}
	target := auth.User{
		ID:                  "u-target",
		Username:            "target_01",
		Nickname:            "Target",
		PasswordHash:        "hash",
		AllowSearch:         true,
		AllowFriendRequest:  true,
		RequireFriendVerify: true,
	}
	hidden := auth.User{
		ID:                  "u-hidden",
		Username:            "hidden_01",
		Nickname:            "Hidden",
		PasswordHash:        "hash",
		AllowSearch:         false,
		AllowFriendRequest:  true,
		RequireFriendVerify: true,
	}
	if err := service.db.Create(&requester).Error; err != nil {
		t.Fatalf("create requester failed: %v", err)
	}
	if err := service.db.Create(&target).Error; err != nil {
		t.Fatalf("create target failed: %v", err)
	}
	if err := service.db.Create(&hidden).Error; err != nil {
		t.Fatalf("create hidden failed: %v", err)
	}
	if err := service.db.Model(&hidden).Update("allow_search", false).Error; err != nil {
		t.Fatalf("update hidden allow_search failed: %v", err)
	}

	request := FriendRequest{
		ID:         "req-001",
		FromUserID: target.ID,
		ToUserID:   requester.ID,
		Message:    "hello",
		Status:     RequestPending,
	}
	if err := service.db.Create(&request).Error; err != nil {
		t.Fatalf("create request failed: %v", err)
	}

	result, err := service.SearchUser(requester.ID, "target_01")
	if err != nil {
		t.Fatalf("SearchUser target failed: %v", err)
	}
	if result == nil {
		t.Fatal("expected target result, got nil")
	}
	if result.RequestStatus != "received" {
		t.Fatalf("expected received status, got %q", result.RequestStatus)
	}
	if result.RequestID != "req-001" {
		t.Fatalf("expected requestId req-001, got %q", result.RequestID)
	}

	hiddenResult, err := service.SearchUser(requester.ID, "hidden_01")
	if err != nil {
		t.Fatalf("SearchUser hidden failed: %v", err)
	}
	if hiddenResult != nil {
		t.Fatalf("expected hidden user to be invisible, got %#v", hiddenResult)
	}
}
