package chatstore

import (
	"fmt"
	"os"
	"path"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"easyChat/internal/auth"
	apperrors "easyChat/internal/errors"
)

func (s *Service) GetMessages(userID, conversationID string, page, pageSize int) (MessagePage, error) {
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 30
	}
	if pageSize > 100 {
		pageSize = 100
	}

	if _, err := s.getConversationForUser(userID, conversationID); err != nil {
		return MessagePage{}, err
	}

	member, err := s.memberRecord(userID, conversationID)
	if err != nil {
		return MessagePage{}, err
	}

	query := s.db.Where("conversation_id = ?", conversationID)
	if member != nil && member.ClearedAt != nil {
		query = query.Where("created_at > ?", *member.ClearedAt)
	}

	var records []Message
	offset := (page - 1) * pageSize
	if err := query.
		Order("created_at desc").
		Limit(pageSize + 1).
		Offset(offset).
		Find(&records).Error; err != nil {
		return MessagePage{}, err
	}

	hasMore := len(records) > pageSize
	if hasMore {
		records = records[:pageSize]
	}
	slices.Reverse(records)

	items, err := s.buildMessages(userID, records)
	if err != nil {
		return MessagePage{}, err
	}

	return MessagePage{
		Items:    items,
		Page:     page,
		PageSize: pageSize,
		HasMore:  hasMore,
	}, nil
}

func (s *Service) SaveMessage(user auth.PublicUser, input PersistMessageInput) (MessagePayload, error) {
	conversation, err := s.resolveConversation(user.ID, input.ConversationID, input.MessageScope)
	if err != nil {
		return MessagePayload{}, err
	}

	quoteID, quoteSummary, err := s.resolveQuote(conversation.ID, input.Quote)
	if err != nil {
		return MessagePayload{}, err
	}

	now := time.Now()
	record := Message{
		ID:             normalizeID(input.ID),
		ConversationID: conversation.ID,
		SenderID:       user.ID,
		SenderName:     s.groupDisplayName(conversation.ID, user.ID, user.Nickname),
		SenderAvatar:   user.Avatar,
		MessageType:    input.MessageType,
		Content:        input.Content,
		QuoteID:        quoteID,
		Duration:       input.Duration,
		CreatedAt:      now,
	}
	if err := s.db.Create(&record).Error; err != nil {
		return MessagePayload{}, err
	}
	if err := s.db.Model(&Conversation{}).Where("id = ?", conversation.ID).Update("updated_at", now).Error; err != nil {
		return MessagePayload{}, err
	}

	return s.toPayload(user.ID, record, conversation, quoteSummary), nil
}

func (s *Service) SaveNotification(conversationID, senderID, senderName, content string) (MessagePayload, error) {
	conversationID = strings.TrimSpace(conversationID)
	senderID = strings.TrimSpace(senderID)
	content = strings.TrimSpace(content)

	if conversationID == "" || content == "" {
		return MessagePayload{}, apperrors.ErrMissingRequiredParam
	}

	var conversation Conversation
	if err := s.db.Where("id = ?", conversationID).First(&conversation).Error; err != nil {
		return MessagePayload{}, apperrors.ErrConversationNotFound
	}

	now := time.Now()
	record := Message{
		ID:             fmt.Sprintf("notif-%d", now.UnixNano()),
		ConversationID: conversationID,
		SenderID:       senderID,
		SenderName:     senderName,
		MessageType:    "text",
		Content:        content,
		CreatedAt:      now,
	}
	if err := s.db.Create(&record).Error; err != nil {
		return MessagePayload{}, err
	}
	if err := s.db.Model(&Conversation{}).Where("id = ?", conversationID).Update("updated_at", now).Error; err != nil {
		return MessagePayload{}, err
	}

	return MessagePayload{
		ID:             record.ID,
		ConversationID: record.ConversationID,
		MessageScope:   conversation.Type,
		Type:           "notification",
		MessageType:    "text",
		SenderID:       record.SenderID,
		SenderName:     record.SenderName,
		Content:        record.Content,
		CreatedAt:      formatTime(record.CreatedAt),
	}, nil
}

func (s *Service) RevokeMessage(user auth.PublicUser, messageID, conversationID string) (RevokeResult, error) {
	if strings.TrimSpace(messageID) == "" {
		return RevokeResult{}, apperrors.ErrMissingMessageID
	}
	conversation, err := s.getConversationForUser(user.ID, conversationID)
	if err != nil {
		return RevokeResult{}, err
	}

	var record Message
	if err := s.db.Where("id = ? AND conversation_id = ?", messageID, conversationID).First(&record).Error; err != nil {
		return RevokeResult{}, apperrors.ErrMessageNotFound
	}
	if record.SenderID != user.ID {
		return RevokeResult{}, apperrors.ErrCanOnlyRevokeSelf
	}
	if record.Revoked {
		return RevokeResult{}, apperrors.ErrMessageAlreadyRevoked
	}
	if time.Since(record.CreatedAt) > 2*time.Minute {
		return RevokeResult{}, apperrors.ErrRevokeTimeExpired
	}
	if record.MessageType == "voice" {
		// Voice messages: hard delete + remove audio file
		if err := s.db.Delete(&record).Error; err != nil {
			return RevokeResult{}, err
		}
		// Try to remove the audio file from disk
		audioPath := strings.TrimPrefix(record.Content, "/uploads/")
		fullPath := filepath.Join(s.uploadsDir, audioPath)
		os.Remove(fullPath) // ignore error
	} else {
		if err := s.db.Model(&record).Update("revoked", true).Error; err != nil {
			return RevokeResult{}, err
		}
	}

	now := time.Now()
	result := RevokeResult{
		Message: MessagePayload{
			ID:             record.ID,
			ConversationID: record.ConversationID,
			MessageScope:   conversation.Type,
			Type:           "revoke",
			MessageType:    "text",
			SenderID:       user.ID,
			SenderName:     s.groupDisplayName(conversation.ID, user.ID, user.Nickname),
			Content:        "",
			CreatedAt:      formatTime(now),
		},
	}
	if conversation.Type == "private" {
		target, err := s.privatePartner(record.ConversationID, user.ID)
		if err != nil {
			return RevokeResult{}, err
		}
		result.TargetUserID = target.ID
		result.Message.TargetUserID = target.ID
	}
	return result, nil
}

func (s *Service) GetMessagesAround(userID, conversationID, messageID string, limit int) (MessagePage, error) {
	if limit <= 0 {
		limit = 30
	}
	if limit > 100 {
		limit = 100
	}

	if _, err := s.getConversationForUser(userID, conversationID); err != nil {
		return MessagePage{}, err
	}

	var target Message
	if err := s.db.Where("id = ? AND conversation_id = ?", strings.TrimSpace(messageID), conversationID).First(&target).Error; err != nil {
		return MessagePage{}, apperrors.ErrMessageNotFound
	}

	member, err := s.memberRecord(userID, conversationID)
	if err != nil {
		return MessagePage{}, err
	}

	baseQuery := s.db.Where("conversation_id = ?", conversationID)
	if member != nil && member.ClearedAt != nil {
		baseQuery = baseQuery.Where("created_at > ?", *member.ClearedAt)
	}

	half := limit / 2

	var beforeRecords []Message
	if err := baseQuery.
		Where("(created_at < ?) OR (created_at = ? AND id < ?)", target.CreatedAt, target.CreatedAt, target.ID).
		Order("created_at desc, id desc").
		Limit(half).
		Find(&beforeRecords).Error; err != nil {
		return MessagePage{}, err
	}

	var afterRecords []Message
	if err := baseQuery.
		Where("(created_at > ?) OR (created_at = ? AND id >= ?)", target.CreatedAt, target.CreatedAt, target.ID).
		Order("created_at asc, id asc").
		Limit(limit - half).
		Find(&afterRecords).Error; err != nil {
		return MessagePage{}, err
	}

	for i, j := 0, len(beforeRecords)-1; i < j; i, j = i+1, j-1 {
		beforeRecords[i], beforeRecords[j] = beforeRecords[j], beforeRecords[i]
	}

	records := make([]Message, 0, len(beforeRecords)+len(afterRecords))
	records = append(records, beforeRecords...)
	records = append(records, afterRecords...)

	items, err := s.buildMessages(userID, records)
	if err != nil {
		return MessagePage{}, err
	}

	hasMoreBefore := len(beforeRecords) == half
	hasMoreAfter := len(afterRecords) == limit-half

	return MessagePage{
		Items:    items,
		Page:     1,
		PageSize: limit,
		HasMore:  hasMoreBefore || hasMoreAfter,
	}, nil
}

func (s *Service) resolveQuote(conversationID string, quote *QuotePayload) (*string, *QuotePayload, error) {
	if quote == nil || strings.TrimSpace(quote.ID) == "" {
		return nil, nil, nil
	}

	var message Message
	if err := s.db.Where("id = ? AND conversation_id = ?", strings.TrimSpace(quote.ID), conversationID).First(&message).Error; err != nil {
		return nil, &QuotePayload{
			ID:          strings.TrimSpace(quote.ID),
			Username:    strings.TrimSpace(quote.Username),
			Content:     strings.TrimSpace(quote.Content),
			MessageType: strings.TrimSpace(quote.MessageType),
			Time:        strings.TrimSpace(quote.Time),
		}, nil
	}

	quoteID := message.ID
	return &quoteID, &QuotePayload{
		ID:          message.ID,
		Username:    message.SenderName,
		Content:     summarizeMessageRecord(message, false),
		MessageType: message.MessageType,
		Time:        formatTime(message.CreatedAt),
	}, nil
}

func (s *Service) buildMessages(currentUserID string, records []Message) ([]MessagePayload, error) {
	conversationIDs := make([]string, 0, len(records))
	quoteIDs := make([]string, 0)
	for _, record := range records {
		conversationIDs = append(conversationIDs, record.ConversationID)
		if record.QuoteID != nil && *record.QuoteID != "" {
			quoteIDs = append(quoteIDs, *record.QuoteID)
		}
	}

	quoteMap := make(map[string]Message)
	if len(quoteIDs) > 0 {
		var quotes []Message
		if err := s.db.Where("id IN ?", quoteIDs).Find(&quotes).Error; err != nil {
			return nil, err
		}
		for _, item := range quotes {
			quoteMap[item.ID] = item
		}
	}

	conversationMap := make(map[string]Conversation)
	if len(conversationIDs) > 0 {
		var conversations []Conversation
		if err := s.db.Where("id IN ?", conversationIDs).Find(&conversations).Error; err != nil {
			return nil, err
		}
		for _, conversation := range conversations {
			conversationMap[conversation.ID] = conversation
		}
	}

	items := make([]MessagePayload, 0, len(records))
	for _, record := range records {
		quote := quoteSummaryFromMap(record.QuoteID, quoteMap)
		conversation := conversationMap[record.ConversationID]
		if conversation.ID == "" {
			conversation = Conversation{ID: record.ConversationID, Type: "private"}
		}
		items = append(items, s.toPayload(currentUserID, record, conversation, quote))
	}
	return items, nil
}

func (s *Service) toPayload(currentUserID string, record Message, conversation Conversation, quote *QuotePayload) MessagePayload {
	content := record.Content
	messageType := record.MessageType
	if record.Revoked {
		messageType = "text"
		if record.SenderID == currentUserID {
			content = "你撤回了一条消息"
		} else {
			content = "对方撤回了一条消息"
		}
	}

	message := MessagePayload{
		ID:             record.ID,
		ConversationID: record.ConversationID,
		MessageScope:   conversation.Type,
		Type:           "chat",
		MessageType:    messageType,
		SenderID:       record.SenderID,
		SenderName:     record.SenderName,
		Content:        content,
		CreatedAt:      formatTime(record.CreatedAt),
		Avatar:         record.SenderAvatar,
		Quote:          quote,
		Revoked:        record.Revoked,
		Duration:       record.Duration,
		Transcript:     record.Transcript,
	}

	if conversation.Type == "private" {
		target, err := s.privatePartner(record.ConversationID, currentUserID)
		if err == nil {
			message.TargetUserID = target.ID
			message.TargetName = target.Nickname
		}
	} else if conversation.Type == GroupConversationType {
		message.SenderName = s.groupDisplayName(record.ConversationID, record.SenderID, record.SenderName)
	}
	return message
}

func summarizeMessageRecord(record Message, isSelf bool) string {
	if record.Revoked {
		if isSelf {
			return "你撤回了一条消息"
		}
		return "对方撤回了一条消息"
	}
	if record.MessageType == "image" {
		return "[图片]"
	}
	if record.MessageType == "file" {
		fileName := path.Base(strings.SplitN(record.Content, "?", 2)[0])
		if fileName == "." || fileName == "/" {
			return "[文件]"
		}
		return fmt.Sprintf("[文件] %s", fileName)
	}
	if record.MessageType == "voice" {
		if record.Duration > 0 {
			return fmt.Sprintf("[语音] %d:%02d", record.Duration/60, record.Duration%60)
		}
		return "[语音]"
	}
	return record.Content
}

func quoteSummaryFromMap(quoteID *string, quoteMap map[string]Message) *QuotePayload {
	if quoteID == nil || *quoteID == "" {
		return nil
	}
	record, ok := quoteMap[*quoteID]
	if !ok {
		return nil
	}
	return &QuotePayload{
		ID:          record.ID,
		Username:    record.SenderName,
		Content:     summarizeMessageRecord(record, false),
		MessageType: record.MessageType,
		Time:        formatTime(record.CreatedAt),
	}
}
