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

func newBehaviorMatrixService(t *testing.T) *Service {
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

func seedBehaviorUser(t *testing.T, service *Service, user auth.User) auth.User {
	t.Helper()
	if err := service.db.Create(&user).Error; err != nil {
		t.Fatalf("create user %s: %v", user.ID, err)
	}
	return user
}

func boolPtr(value bool) *bool {
	return &value
}

func stringPtr(value string) *string {
	return &value
}

func publicUserFromRecord(user auth.User) auth.PublicUser {
	return auth.PublicUser{
		ID:        user.ID,
		Username:  user.Username,
		Nickname:  user.Nickname,
		Avatar:    user.Avatar,
		Gender:    user.Gender,
		Region:    user.Region,
		Signature: user.Signature,
	}
}

func TestConversationMemberStateRemainsPerUser(t *testing.T) {
	service := newBehaviorMatrixService(t)

	self := seedBehaviorUser(t, service, auth.User{ID: "u-self", Username: "self_01", Nickname: "Self", PasswordHash: "hash"})
	peer := seedBehaviorUser(t, service, auth.User{ID: "u-peer", Username: "peer_01", Nickname: "Peer", PasswordHash: "hash"})

	conversation, err := service.EnsurePrivateConversation(self.ID, peer.ID)
	if err != nil {
		t.Fatalf("ensure private conversation: %v", err)
	}

	if _, err := service.SaveMessage(publicUserFromRecord(peer), PersistMessageInput{
		ID:             "msg-peer-1",
		ConversationID: conversation.ID,
		MessageScope:   "private",
		MessageType:    "text",
		Content:        "first message",
	}); err != nil {
		t.Fatalf("save peer message: %v", err)
	}

	updated, err := service.UpdateConversationSettings(self.ID, conversation.ID, boolPtr(true), boolPtr(true))
	if err != nil {
		t.Fatalf("update conversation settings: %v", err)
	}
	if !updated.Pinned || !updated.Muted {
		t.Fatalf("expected updated summary to keep pinned and muted, got %+v", updated)
	}

	selfMember, err := service.memberRecord(self.ID, conversation.ID)
	if err != nil {
		t.Fatalf("self member record: %v", err)
	}
	peerMember, err := service.memberRecord(peer.ID, conversation.ID)
	if err != nil {
		t.Fatalf("peer member record: %v", err)
	}
	if selfMember == nil || peerMember == nil {
		t.Fatal("expected both members to exist")
	}
	if !selfMember.IsPinned || !selfMember.IsMuted {
		t.Fatalf("expected self settings to be updated, got %+v", selfMember)
	}
	if peerMember.IsPinned || peerMember.IsMuted {
		t.Fatalf("expected peer settings to remain unchanged, got %+v", peerMember)
	}

	if err := service.MarkConversationRead(self.ID, conversation.ID); err != nil {
		t.Fatalf("mark conversation read: %v", err)
	}

	selfMember, err = service.memberRecord(self.ID, conversation.ID)
	if err != nil {
		t.Fatalf("reload self member: %v", err)
	}
	peerMember, err = service.memberRecord(peer.ID, conversation.ID)
	if err != nil {
		t.Fatalf("reload peer member: %v", err)
	}
	if selfMember.LastReadAt == nil {
		t.Fatal("expected self last_read_at to be set")
	}
	if peerMember.LastReadAt != nil {
		t.Fatalf("expected peer last_read_at to remain nil, got %+v", peerMember.LastReadAt)
	}
}

func TestClearAndDeleteConversationRemainLocalToActingUser(t *testing.T) {
	service := newBehaviorMatrixService(t)

	self := seedBehaviorUser(t, service, auth.User{ID: "u-self", Username: "self_01", Nickname: "Self", PasswordHash: "hash"})
	peer := seedBehaviorUser(t, service, auth.User{ID: "u-peer", Username: "peer_01", Nickname: "Peer", PasswordHash: "hash"})

	conversation, err := service.EnsurePrivateConversation(self.ID, peer.ID)
	if err != nil {
		t.Fatalf("ensure private conversation: %v", err)
	}

	if _, err := service.SaveMessage(publicUserFromRecord(peer), PersistMessageInput{
		ID:             "msg-before-clear",
		ConversationID: conversation.ID,
		MessageScope:   "private",
		MessageType:    "text",
		Content:        "before clear",
	}); err != nil {
		t.Fatalf("save first message: %v", err)
	}

	if err := service.ClearConversationForUser(self.ID, conversation.ID); err != nil {
		t.Fatalf("clear conversation for self: %v", err)
	}

	if _, err := service.SaveMessage(publicUserFromRecord(peer), PersistMessageInput{
		ID:             "msg-after-clear",
		ConversationID: conversation.ID,
		MessageScope:   "private",
		MessageType:    "text",
		Content:        "after clear",
	}); err != nil {
		t.Fatalf("save second message: %v", err)
	}

	selfMessages, err := service.GetMessages(self.ID, conversation.ID, 1, 20)
	if err != nil {
		t.Fatalf("get self messages: %v", err)
	}
	if len(selfMessages.Items) != 1 || selfMessages.Items[0].Content != "after clear" {
		t.Fatalf("expected self to see only post-clear message, got %+v", selfMessages.Items)
	}

	peerMessages, err := service.GetMessages(peer.ID, conversation.ID, 1, 20)
	if err != nil {
		t.Fatalf("get peer messages: %v", err)
	}
	if len(peerMessages.Items) != 2 {
		t.Fatalf("expected peer to see both messages, got %d", len(peerMessages.Items))
	}

	if err := service.DeleteConversationForUser(self.ID, conversation.ID); err != nil {
		t.Fatalf("delete conversation for self: %v", err)
	}

	selfConversations, err := service.ListConversations(self.ID)
	if err != nil {
		t.Fatalf("list self conversations: %v", err)
	}
	for _, item := range selfConversations {
		if item.ID == conversation.ID {
			t.Fatalf("expected deleted conversation to be hidden from self, got %+v", item)
		}
	}

	peerConversations, err := service.ListConversations(peer.ID)
	if err != nil {
		t.Fatalf("list peer conversations: %v", err)
	}
	foundPeerConversation := false
	for _, item := range peerConversations {
		if item.ID == conversation.ID {
			foundPeerConversation = true
			break
		}
	}
	if !foundPeerConversation {
		t.Fatal("expected peer conversation to remain visible")
	}
}

func TestRevokeFailuresPreserveLatestConversationSummary(t *testing.T) {
	service := newBehaviorMatrixService(t)

	self := seedBehaviorUser(t, service, auth.User{ID: "u-self", Username: "self_01", Nickname: "Self", PasswordHash: "hash"})
	peer := seedBehaviorUser(t, service, auth.User{ID: "u-peer", Username: "peer_01", Nickname: "Peer", PasswordHash: "hash"})

	conversation, err := service.EnsurePrivateConversation(self.ID, peer.ID)
	if err != nil {
		t.Fatalf("ensure private conversation: %v", err)
	}

	if _, err := service.SaveMessage(publicUserFromRecord(self), PersistMessageInput{
		ID:             "msg-owned",
		ConversationID: conversation.ID,
		MessageScope:   "private",
		MessageType:    "text",
		Content:        "latest preview",
	}); err != nil {
		t.Fatalf("save owned message: %v", err)
	}

	member, err := service.memberRecord(self.ID, conversation.ID)
	if err != nil {
		t.Fatalf("member record: %v", err)
	}
	record, err := service.getConversationForUser(self.ID, conversation.ID)
	if err != nil {
		t.Fatalf("conversation record: %v", err)
	}
	summaryBefore, err := service.buildConversationSummary(self.ID, record, member)
	if err != nil {
		t.Fatalf("summary before revoke failures: %v", err)
	}

	if _, err := service.RevokeMessage(publicUserFromRecord(peer), "msg-owned", conversation.ID); err == nil {
		t.Fatal("expected non-sender revoke to fail")
	}

	if err := service.db.Model(&Message{}).
		Where("id = ?", "msg-owned").
		Update("created_at", time.Now().Add(-3*time.Minute)).Error; err != nil {
		t.Fatalf("age message beyond revoke window: %v", err)
	}

	if _, err := service.RevokeMessage(publicUserFromRecord(self), "msg-owned", conversation.ID); err == nil {
		t.Fatal("expected expired revoke to fail")
	}

	summaryAfter, err := service.buildConversationSummary(self.ID, record, member)
	if err != nil {
		t.Fatalf("summary after revoke failures: %v", err)
	}
	if summaryAfter.LastMessage != summaryBefore.LastMessage {
		t.Fatalf("expected latest summary to remain stable, before=%q after=%q", summaryBefore.LastMessage, summaryAfter.LastMessage)
	}
}

func TestGroupLifecycleRoleBoundaries(t *testing.T) {
	service := newBehaviorMatrixService(t)

	owner := seedBehaviorUser(t, service, auth.User{ID: "u-owner", Username: "owner_01", Nickname: "Owner", PasswordHash: "hash"})
	member := seedBehaviorUser(t, service, auth.User{ID: "u-member", Username: "member_01", Nickname: "Member", PasswordHash: "hash"})
	conversation, err := service.CreateGroupConversation(owner.ID, "Team", []string{member.ID})
	if err != nil {
		t.Fatalf("create group conversation: %v", err)
	}

	if _, err := service.UpdateGroupConversation(member.ID, conversation.ID, UpdateGroupConversationRequest{
		Name: stringPtr("Renamed by member"),
	}); err == nil {
		t.Fatal("expected member group-name update to fail")
	}

	if err := service.LeaveGroupConversation(owner.ID, conversation.ID); err == nil {
		t.Fatal("expected owner leave to fail")
	}

	if err := service.DismissGroupConversation(member.ID, conversation.ID); err == nil {
		t.Fatal("expected non-owner dismiss to fail")
	}

	if _, err := service.SaveMessage(publicUserFromRecord(owner), PersistMessageInput{
		ID:             "group-message",
		ConversationID: conversation.ID,
		MessageScope:   GroupConversationType,
		MessageType:    "text",
		Content:        "hello team",
	}); err != nil {
		t.Fatalf("save group message: %v", err)
	}

	favorite := Favorite{
		ID:               "fav-group",
		UserID:           owner.ID,
		MessageID:        "group-message",
		ConversationID:   conversation.ID,
		ConversationName: "Team",
		MessageType:      "text",
		Content:          "hello team",
		SenderID:         owner.ID,
		SenderName:       owner.Nickname,
		MessageCreatedAt: time.Now(),
	}
	if err := service.db.Create(&favorite).Error; err != nil {
		t.Fatalf("create favorite: %v", err)
	}

	if err := service.LeaveGroupConversation(member.ID, conversation.ID); err != nil {
		t.Fatalf("member leave group: %v", err)
	}
	if memberRecord, err := service.memberRecord(member.ID, conversation.ID); err != nil {
		t.Fatalf("reload member after leave: %v", err)
	} else if memberRecord != nil {
		t.Fatalf("expected member record to be removed after leave, got %+v", memberRecord)
	}

	if err := service.DismissGroupConversation(owner.ID, conversation.ID); err != nil {
		t.Fatalf("owner dismiss group: %v", err)
	}

	var conversationCount, memberCount, messageCount, favoriteCount int64
	if err := service.db.Model(&Conversation{}).Where("id = ?", conversation.ID).Count(&conversationCount).Error; err != nil {
		t.Fatalf("count conversations: %v", err)
	}
	if err := service.db.Model(&ConversationMember{}).Where("conversation_id = ?", conversation.ID).Count(&memberCount).Error; err != nil {
		t.Fatalf("count members: %v", err)
	}
	if err := service.db.Model(&Message{}).Where("conversation_id = ?", conversation.ID).Count(&messageCount).Error; err != nil {
		t.Fatalf("count messages: %v", err)
	}
	if err := service.db.Model(&Favorite{}).Where("conversation_id = ?", conversation.ID).Count(&favoriteCount).Error; err != nil {
		t.Fatalf("count favorites: %v", err)
	}

	if conversationCount != 0 || memberCount != 0 || messageCount != 0 || favoriteCount != 0 {
		t.Fatalf(
			"expected group dismissal cleanup to remove all records, conversations=%d members=%d messages=%d favorites=%d",
			conversationCount,
			memberCount,
			messageCount,
			favoriteCount,
		)
	}
}

func TestGroupBotTogglePreservesMemberConversationVisibility(t *testing.T) {
	service := newBehaviorMatrixService(t)

	owner := seedBehaviorUser(t, service, auth.User{ID: "u-owner", Username: "owner_01", Nickname: "Owner", PasswordHash: "hash"})
	member := seedBehaviorUser(t, service, auth.User{ID: "u-member", Username: "member_01", Nickname: "Member", PasswordHash: "hash"})
	seedBehaviorUser(t, service, auth.User{ID: "ai-assistant", Username: "ai_assistant", Nickname: "AI 助手", PasswordHash: "hash"})

	conversation, err := service.CreateGroupConversation(owner.ID, "Team", []string{member.ID})
	if err != nil {
		t.Fatalf("create group conversation: %v", err)
	}

	enabled, err := service.SetGroupBotEnabled(owner.ID, conversation.ID, true)
	if err != nil {
		t.Fatalf("enable group bot: %v", err)
	}
	if !enabled.BotEnabled {
		t.Fatal("expected botEnabled to be true after enabling")
	}

	ownerConversations, err := service.ListConversations(owner.ID)
	if err != nil {
		t.Fatalf("list owner conversations: %v", err)
	}
	memberConversations, err := service.ListConversations(member.ID)
	if err != nil {
		t.Fatalf("list member conversations after enable: %v", err)
	}
	if !containsConversationSummary(ownerConversations, conversation.ID) {
		t.Fatal("expected owner to keep seeing the group after enabling bot")
	}
	if !containsConversationSummary(memberConversations, conversation.ID) {
		t.Fatal("expected member to keep seeing the group after enabling bot")
	}

	disabled, err := service.SetGroupBotEnabled(owner.ID, conversation.ID, false)
	if err != nil {
		t.Fatalf("disable group bot: %v", err)
	}
	if disabled.BotEnabled {
		t.Fatal("expected botEnabled to be false after disabling")
	}

	memberConversations, err = service.ListConversations(member.ID)
	if err != nil {
		t.Fatalf("list member conversations after disable: %v", err)
	}
	if !containsConversationSummary(memberConversations, conversation.ID) {
		t.Fatal("expected member to keep seeing the group after disabling bot")
	}
}

func containsConversationSummary(items []ConversationSummary, conversationID string) bool {
	for _, item := range items {
		if item.ID == conversationID {
			return true
		}
	}
	return false
}
