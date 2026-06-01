package chatstore

import (
	"errors"
	"time"

	"easyChat/internal/uid"
)

// PinMessage marks a message as pinned in a group conversation. Only admin/owner can pin.
func (s *Service) PinMessage(userID, conversationID, messageID string) error {
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
	if member == nil {
		return errors.New("当前用户不在该群聊中")
	}
	if member.Role != "owner" && member.Role != "admin" {
		return errors.New("只有管理员可以标记精华消息")
	}

	// Verify message exists in this conversation
	var msg Message
	if err := s.db.Where("id = ? AND conversation_id = ?", messageID, conversationID).First(&msg).Error; err != nil {
		return errors.New("消息不存在")
	}

	// Check if already pinned
	var existing GroupPinnedMessage
	if err := s.db.Where("conversation_id = ? AND message_id = ?", conversationID, messageID).First(&existing).Error; err == nil {
		return errors.New("该消息已是精华消息")
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
		return errors.New("当前会话不是群聊")
	}

	member, err := s.memberRecord(userID, conversationID)
	if err != nil {
		return err
	}
	if member == nil {
		return errors.New("当前用户不在该群聊中")
	}
	if member.Role != "owner" && member.Role != "admin" {
		return errors.New("只有管理员可以取消精华消息")
	}

	result := s.db.Where("conversation_id = ? AND message_id = ?", conversationID, messageID).Delete(&GroupPinnedMessage{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("该消息不是精华消息")
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
		return nil, errors.New("当前会话不是群聊")
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
