package chatstore

import (
	"errors"
	"strings"
	"time"

	"easyChat/internal/uid"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func (s *Service) CreateFavorite(userID, messageID string) (FavoritePayload, error) {
	messageID = strings.TrimSpace(messageID)
	if messageID == "" {
		return FavoritePayload{}, errors.New("缺少消息 ID")
	}

	var message Message
	if err := s.db.First(&message, "id = ?", messageID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return FavoritePayload{}, errors.New("消息不存在")
		}
		return FavoritePayload{}, err
	}
	if message.Revoked {
		return FavoritePayload{}, errors.New("已撤回消息不能收藏")
	}

	conversation, err := s.getConversationForUser(userID, message.ConversationID)
	if err != nil {
		return FavoritePayload{}, err
	}
	member, err := s.memberRecord(userID, message.ConversationID)
	if err != nil {
		return FavoritePayload{}, err
	}
	summary, err := s.buildConversationSummary(userID, conversation, member)
	if err != nil {
		return FavoritePayload{}, err
	}

	quoteContent, quoteMessageType, err := s.favoriteQuoteSnapshot(message.QuoteID)
	if err != nil {
		return FavoritePayload{}, err
	}

	now := time.Now()
	record := Favorite{
		ID:               uid.New("fav"),
		UserID:           userID,
		MessageID:        message.ID,
		ConversationID:   message.ConversationID,
		ConversationName: summary.Name,
		MessageType:      message.MessageType,
		Content:          message.Content,
		QuoteContent:     quoteContent,
		QuoteMessageType: quoteMessageType,
		SenderID:         message.SenderID,
		SenderName:       message.SenderName,
		SenderAvatar:     message.SenderAvatar,
		MessageCreatedAt: message.CreatedAt,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "user_id"}, {Name: "message_id"}},
			DoNothing: true,
		}).Create(&record).Error; err != nil {
			return err
		}
		return tx.Where("user_id = ? AND message_id = ?", userID, message.ID).First(&record).Error
	})
	if err != nil {
		return FavoritePayload{}, err
	}
	return favoritePayload(record), nil
}

func (s *Service) DeleteFavorite(userID, favoriteID string) error {
	favoriteID = strings.TrimSpace(favoriteID)
	if favoriteID == "" {
		return errors.New("缺少收藏 ID")
	}
	result := s.db.Where("id = ? AND user_id = ?", favoriteID, userID).Delete(&Favorite{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("收藏不存在")
	}
	return nil
}

func (s *Service) DeleteFavoriteByMessage(userID, messageID string) error {
	messageID = strings.TrimSpace(messageID)
	if messageID == "" {
		return errors.New("缺少消息 ID")
	}
	result := s.db.Where("user_id = ? AND message_id = ?", userID, messageID).Delete(&Favorite{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("收藏不存在")
	}
	return nil
}

func (s *Service) ListFavorites(userID, messageType, keyword string) ([]FavoritePayload, error) {
	messageType = strings.TrimSpace(messageType)
	keyword = strings.TrimSpace(keyword)

	query := s.db.Where("user_id = ?", userID)
	if messageType == "text" || messageType == "image" {
		query = query.Where("message_type = ?", messageType)
	}
	if keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where(
			"content LIKE ? OR quote_content LIKE ? OR sender_name LIKE ? OR conversation_name LIKE ?",
			like,
			like,
			like,
			like,
		)
	}

	var records []Favorite
	if err := query.Order("created_at desc").Find(&records).Error; err != nil {
		return nil, err
	}
	items := make([]FavoritePayload, 0, len(records))
	for _, record := range records {
		items = append(items, favoritePayload(record))
	}
	return items, nil
}

func (s *Service) favoriteQuoteSnapshot(quoteID *string) (string, string, error) {
	if quoteID == nil || *quoteID == "" {
		return "", "", nil
	}
	var quote Message
	if err := s.db.First(&quote, "id = ?", *quoteID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", "", nil
		}
		return "", "", err
	}
	return summarizeMessageRecord(quote, false), quote.MessageType, nil
}

func favoritePayload(record Favorite) FavoritePayload {
	return FavoritePayload{
		ID:               record.ID,
		MessageID:        record.MessageID,
		ConversationID:   record.ConversationID,
		ConversationName: record.ConversationName,
		MessageType:      record.MessageType,
		Content:          record.Content,
		QuoteContent:     record.QuoteContent,
		QuoteMessageType: record.QuoteMessageType,
		SenderID:         record.SenderID,
		SenderName:       record.SenderName,
		SenderAvatar:     record.SenderAvatar,
		MessageCreatedAt: formatTime(record.MessageCreatedAt),
		CreatedAt:        formatTime(record.CreatedAt),
	}
}
