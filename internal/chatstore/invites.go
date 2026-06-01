package chatstore

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"easyChat/internal/uid"

	"gorm.io/gorm"
)

// GroupInvitePayload represents an invite link for API responses.
type GroupInvitePayload struct {
	ID             string  `json:"id"`
	ConversationID string  `json:"conversationId"`
	Code           string  `json:"code"`
	CreatedBy      string  `json:"createdBy"`
	MaxUses        int     `json:"maxUses"`
	UseCount       int     `json:"useCount"`
	ExpiresAt      *string `json:"expiresAt,omitempty"`
	CreatedAt      string  `json:"createdAt"`
}

// GenerateInviteLink creates a new invite link for a group conversation.
func (s *Service) GenerateInviteLink(userID, conversationID, expiresIn string, maxUses int) (*GroupInvitePayload, error) {
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return nil, err
	}
	if conversation.Type != GroupConversationType {
		return nil, errors.New("当前会话不是群聊")
	}

	member, err := s.memberRecord(userID, conversationID)
	if err != nil {
		return nil, err
	}
	if member == nil || (member.Role != "owner" && member.Role != "admin") {
		return nil, errors.New("只有管理员可以生成邀请链接")
	}

	// Generate unique code
	codeBytes := make([]byte, 16)
	if _, err := rand.Read(codeBytes); err != nil {
		return nil, err
	}
	code := hex.EncodeToString(codeBytes)

	var expiresAt *time.Time
	switch expiresIn {
	case "1d":
		t := time.Now().Add(24 * time.Hour)
		expiresAt = &t
	case "7d":
		t := time.Now().Add(7 * 24 * time.Hour)
		expiresAt = &t
	case "30d":
		t := time.Now().Add(30 * 24 * time.Hour)
		expiresAt = &t
	case "never":
		expiresAt = nil
	default:
		// Default 7 days
		t := time.Now().Add(7 * 24 * time.Hour)
		expiresAt = &t
	}

	switch maxUses {
	case 1, 10:
		// valid values
	default:
		maxUses = 0 // unlimited
	}

	link := GroupInviteLink{
		ID:             uid.New("invite"),
		ConversationID: conversationID,
		Code:           code,
		CreatedBy:      userID,
		MaxUses:        maxUses,
		UseCount:       0,
		ExpiresAt:      expiresAt,
		CreatedAt:      time.Now(),
	}

	if err := s.db.Create(&link).Error; err != nil {
		return nil, err
	}

	payload := &GroupInvitePayload{
		ID:             link.ID,
		ConversationID: link.ConversationID,
		Code:           link.Code,
		CreatedBy:      link.CreatedBy,
		MaxUses:        link.MaxUses,
		UseCount:       link.UseCount,
		CreatedAt:      formatTime(link.CreatedAt),
	}
	if link.ExpiresAt != nil {
		expiresAtStr := formatTime(*link.ExpiresAt)
		payload.ExpiresAt = &expiresAtStr
	}
	return payload, nil
}

// ListInviteLinks returns all active invite links for a group conversation.
func (s *Service) ListInviteLinks(userID, conversationID string) ([]GroupInvitePayload, error) {
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return nil, err
	}
	if conversation.Type != GroupConversationType {
		return nil, errors.New("当前会话不是群聊")
	}

	var links []GroupInviteLink
	if err := s.db.Where("conversation_id = ?", conversationID).
		Order("created_at desc").Find(&links).Error; err != nil {
		return nil, err
	}

	result := make([]GroupInvitePayload, 0, len(links))
	for _, link := range links {
		// Skip expired links
		if link.ExpiresAt != nil && link.ExpiresAt.Before(time.Now()) {
			continue
		}
		// Skip used-up links
		if link.MaxUses > 0 && link.UseCount >= link.MaxUses {
			continue
		}

		payload := GroupInvitePayload{
			ID:             link.ID,
			ConversationID: link.ConversationID,
			Code:           link.Code,
			CreatedBy:      link.CreatedBy,
			MaxUses:        link.MaxUses,
			UseCount:       link.UseCount,
			CreatedAt:      formatTime(link.CreatedAt),
		}
		if link.ExpiresAt != nil {
			expiresAtStr := formatTime(*link.ExpiresAt)
			payload.ExpiresAt = &expiresAtStr
		}
		result = append(result, payload)
	}

	return result, nil
}

// DeleteInviteLink deletes an invite link.
func (s *Service) DeleteInviteLink(userID, conversationID, inviteID string) error {
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return err
	}
	if conversation.Type != GroupConversationType {
		return errors.New("当前会话不是群聊")
	}

	member, err := s.memberRecord(userID, conversationID)
	if err != nil {
		return err
	}
	if member == nil || (member.Role != "owner" && member.Role != "admin") {
		return errors.New("只有管理员可以删除邀请链接")
	}

	result := s.db.Where("id = ? AND conversation_id = ?", inviteID, conversationID).Delete(&GroupInviteLink{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("邀请链接不存在")
	}
	return nil
}

// JoinByInviteCode joins a group conversation using an invite code.
func (s *Service) JoinByInviteCode(userID, code string) (*ConversationSummary, error) {
	var link GroupInviteLink
	if err := s.db.Where("code = ?", code).First(&link).Error; err != nil {
		return nil, errors.New("邀请链接不存在")
	}

	// Check expiry
	if link.ExpiresAt != nil && link.ExpiresAt.Before(time.Now()) {
		return nil, errors.New("邀请链接已过期")
	}

	// Check max uses
	if link.MaxUses > 0 && link.UseCount >= link.MaxUses {
		return nil, errors.New("邀请链接已达到最大使用次数")
	}

	// Check if already a member
	existing, err := s.memberRecord(userID, link.ConversationID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		var conv Conversation
		if err := s.db.Where("id = ?", link.ConversationID).First(&conv).Error; err != nil {
			return nil, err
		}
		summary, err := s.buildConversationSummary(userID, conv, existing)
		if err != nil {
			return nil, err
		}
		return &summary, nil
	}

	// Add as member
	member := ConversationMember{
		ID:             uid.New("member"),
		ConversationID: link.ConversationID,
		UserID:         userID,
		Role:           "member",
		JoinedAt:       time.Now(),
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&member).Error; err != nil {
			return err
		}
		return tx.Model(&GroupInviteLink{}).Where("id = ?", link.ID).
			Update("use_count", gorm.Expr("use_count + 1")).Error
	}); err != nil {
		return nil, err
	}

	var conv Conversation
	if err := s.db.Where("id = ?", link.ConversationID).First(&conv).Error; err != nil {
		return nil, err
	}
	summary, err := s.buildConversationSummary(userID, conv, &member)
	if err != nil {
		return nil, err
	}
	return &summary, nil
}
