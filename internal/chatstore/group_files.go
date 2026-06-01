package chatstore

import (
	"errors"
	"net/url"
	"strings"
)

// GroupFileItem represents a file or image shared in a group conversation.
type GroupFileItem struct {
	ID        string `json:"id"`
	SenderID  string `json:"senderId"`
	FileName  string `json:"fileName"`
	FileURL   string `json:"fileUrl"`
	FileSize  int64  `json:"fileSize"`
	MimeType  string `json:"mimeType"`
	CreatedAt string `json:"createdAt"`
}

// GetGroupFiles returns files shared in a group conversation with optional type filter and keyword search.
// fileType: "image", "document", "archive", "other", or "" for all.
func (s *Service) GetGroupFiles(userID, conversationID, fileType, keyword string, page, pageSize int) ([]GroupFileItem, int, error) {
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return nil, 0, err
	}
	if conversation.Type != GroupConversationType {
		return nil, 0, errors.New("当前会话不是群聊")
	}

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 20
	}

	query := s.db.Model(&Message{}).Where("conversation_id = ? AND revoked = false", conversationID)

	// Filter by message type
	switch fileType {
	case "image":
		query = query.Where("message_type = ?", "image")
	case "document":
		query = query.Where("message_type = ? AND (content LIKE ? OR content LIKE ? OR content LIKE ? OR content LIKE ?)",
			"file", "%.pdf", "%.doc", "%.xls", "%.txt")
	case "archive":
		query = query.Where("message_type = ? AND (content LIKE ? OR content LIKE ? OR content LIKE ?)",
			"file", "%.zip", "%.rar", "%.7z")
	case "other":
		query = query.Where("message_type = ?", "file")
	default:
		query = query.Where("message_type IN ?", []string{"image", "file"})
	}

	if keyword != "" {
		keyword = strings.TrimSpace(keyword)
		query = query.Where("content LIKE ?", "%"+keyword+"%")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var messages []Message
	if err := query.Order("created_at desc").
		Offset((page - 1) * pageSize).Limit(pageSize).
		Find(&messages).Error; err != nil {
		return nil, 0, err
	}

	items := make([]GroupFileItem, 0, len(messages))
	for _, msg := range messages {
		item := GroupFileItem{
			ID:        msg.ID,
			SenderID:  msg.SenderID,
			FileURL:   msg.Content,
			CreatedAt: formatTime(msg.CreatedAt),
		}
		// Extract filename from content URL
		if parsedURL, err := url.Parse(msg.Content); err == nil {
			parts := strings.Split(parsedURL.Path, "/")
			if len(parts) > 0 {
				item.FileName = parts[len(parts)-1]
			}
		} else {
			parts := strings.Split(msg.Content, "/")
			if len(parts) > 0 {
				item.FileName = parts[len(parts)-1]
			}
		}
		// Try to get file metadata from UploadedFile table
		var uploaded UploadedFile
		if err := s.db.Where("file_url = ?", msg.Content).First(&uploaded).Error; err == nil {
			item.FileName = uploaded.FileName
			item.FileSize = uploaded.FileSize
			item.MimeType = uploaded.MimeType
		}
		items = append(items, item)
	}

	return items, int(total), nil
}

// GetGroupImages returns images shared in a group conversation, grouped by date.
func (s *Service) GetGroupImages(userID, conversationID string, page, pageSize int) ([]GroupFileItem, int, error) {
	return s.GetGroupFiles(userID, conversationID, "image", "", page, pageSize)
}
