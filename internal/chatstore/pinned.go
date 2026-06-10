package chatstore

import (
	"time"

	apperrors "easyChat/internal/errors"
	"easyChat/internal/uid"
)

// PinMessage marks a message as pinned in a group conversation. Only admin/owner can pin.
func (s *Service) PinMessage(userID, conversationID, messageID string) error {
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return err
	}
	if conversation.Type != GroupConversationType {
		return apperrors.ErrNotGroupConversation
	}

	member, err := s.memberRecord(userID, conversationID)
	if err != nil {
		return err
	}
	if member == nil {
		return apperrors.ErrUserNotInGroup
	}
	if member.Role != "owner" && member.Role != "admin" {
		return apperrors.ErrAdminOnly
	}

	// Verify message exists in this conversation
	var msg Message
	if err := s.db.Where("id = ? AND conversation_id = ?", messageID, conversationID).First(&msg).Error; err != nil {
		return apperrors.ErrMessageNotFound
	}

	// Check if already pinned
	var existing GroupPinnedMessage
	if err := s.db.Where("conversation_id = ? AND message_id = ?", conversationID, messageID).First(&existing).Error; err == nil {
		return apperrors.ErrBadRequest
	}

	pin := GroupPinnedMessage{
		ID:             uid.New("pin"),
		ConversationID: conversationID,
		MessageID:      messageID,
		PinnedBy:       userID,
		CreatedAt:      time.Now(),
	}
	return s.db.Create(&pin).Error
}

// UnpinMessage removes a message from pinned list. Only admin/owner can unpin.
func (s *Service) UnpinMessage(userID, conversationID, messageID string) error {
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return err
	}
	if conversation.Type != GroupConversationType {
		return apperrors.ErrNotGroupConversation
	}

	member, err := s.memberRecord(userID, conversationID)
	if err != nil {
		return err
	}
	if member == nil {
		return apperrors.ErrUserNotInGroup
	}
	if member.Role != "owner" && member.Role != "admin" {
		return apperrors.ErrAdminOnly
	}

	result := s.db.Where("conversation_id = ? AND message_id = ?", conversationID, messageID).Delete(&GroupPinnedMessage{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return apperrors.ErrBadRequest
	}
	return nil
}

// GetPinnedMessages returns all pinned messages in a group conversation, ordered by time desc.
func (s *Service) GetPinnedMessages(userID, conversationID string) ([]MessagePayload, error) {
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return nil, err
	}
	if conversation.Type != GroupConversationType {
		return nil, apperrors.ErrNotGroupConversation
	}

	var pins []GroupPinnedMessage
	if err := s.db.Where("conversation_id = ?", conversationID).
		Order("created_at desc").Find(&pins).Error; err != nil {
		return nil, err
	}

	if len(pins) == 0 {
		return []MessagePayload{}, nil
	}

	messageIDs := make([]string, 0, len(pins))
	for _, pin := range pins {
		messageIDs = append(messageIDs, pin.MessageID)
	}

	var messages []Message
	if err := s.db.Where("id IN ?", messageIDs).Find(&messages).Error; err != nil {
		return nil, err
	}

	// Preserve pin order (by created_at desc)
	msgMap := make(map[string]Message, len(messages))
	for _, msg := range messages {
		msgMap[msg.ID] = msg
	}

	result := make([]MessagePayload, 0, len(pins))
	for _, pin := range pins {
		msg, ok := msgMap[pin.MessageID]
		if !ok {
			continue
		}
		result = append(result, s.toPayload(userID, msg, conversation, nil))
	}

	return result, nil
}
