package sticker

import (
	"encoding/json"
	"fmt"
	"time"

	"easyChat/internal/chatstore"
	"easyChat/internal/uid"

	"gorm.io/gorm"
)

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

type Sticker struct {
	ID        string `json:"id"`
	UserID    string `json:"userId"`
	ImageURL  string `json:"imageUrl"`
	CreatedAt string `json:"createdAt"`
}

func (s *Service) GetByUser(userID string) ([]Sticker, error) {
	var records []chatstore.FavoriteSticker
	if err := s.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&records).Error; err != nil {
		return nil, err
	}

	stickers := make([]Sticker, len(records))
	for i, r := range records {
		stickers[i] = Sticker{
			ID:        r.ID,
			UserID:    r.UserID,
			ImageURL:  r.ImageURL,
			CreatedAt: r.CreatedAt.Format(time.RFC3339),
		}
	}
	return stickers, nil
}

func (s *Service) Create(userID, imageURL string) (*Sticker, error) {
	var existing chatstore.FavoriteSticker
	if err := s.db.Where("user_id = ? AND image_url = ?", userID, imageURL).First(&existing).Error; err == nil {
		return &Sticker{
			ID:        existing.ID,
			UserID:    existing.UserID,
			ImageURL:  existing.ImageURL,
			CreatedAt: existing.CreatedAt.Format(time.RFC3339),
		}, nil
	}

	record := chatstore.FavoriteSticker{
		ID:        uid.New("stk"),
		UserID:    userID,
		ImageURL:  imageURL,
		CreatedAt: time.Now(),
	}
	if err := s.db.Create(&record).Error; err != nil {
		return nil, err
	}
	return &Sticker{
		ID:        record.ID,
		UserID:    record.UserID,
		ImageURL:  record.ImageURL,
		CreatedAt: record.CreatedAt.Format(time.RFC3339),
	}, nil
}

func (s *Service) Delete(userID, stickerID string) error {
	result := s.db.Where("id = ? AND user_id = ?", stickerID, userID).Delete(&chatstore.FavoriteSticker{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("sticker not found")
	}
	return nil
}

func (s *Service) CollectFromMessage(userID, messageID string) (*Sticker, error) {
	var msg chatstore.Message
	if err := s.db.Where("id = ? AND message_type = ?", messageID, "sticker").First(&msg).Error; err != nil {
		return nil, fmt.Errorf("sticker message not found")
	}

	type stickerContent struct {
		URL string `json:"url"`
	}
	var content stickerContent
	if err := json.Unmarshal([]byte(msg.Content), &content); err != nil || content.URL == "" {
		return nil, fmt.Errorf("invalid sticker content")
	}

	return s.Create(userID, content.URL)
}
