package chatstore

import (
	"errors"
	"time"

	"easyChat/internal/uid"
)

// SolitairePayload represents a solitaire for API responses.
type SolitairePayload struct {
	ID             string               `json:"id"`
	ConversationID string               `json:"conversationId"`
	CreatorID      string               `json:"creatorId"`
	Title          string               `json:"title"`
	CreatedAt      string               `json:"createdAt"`
	Items          []SolitaireItemPayload `json:"items"`
}

// SolitaireItemPayload represents a solitaire entry.
type SolitaireItemPayload struct {
	ID        string `json:"id"`
	UserID    string `json:"userId"`
	Content   string `json:"content"`
	SortOrder int    `json:"sortOrder"`
	CreatedAt string `json:"createdAt"`
}

// CreateSolitaire creates a new solitaire in a group conversation.
func (s *Service) CreateSolitaire(userID, conversationID, title string) (*SolitairePayload, error) {
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return nil, err
	}
	if conversation.Type != GroupConversationType {
		return nil, errors.New("当前会话不是群聊")
	}

	// Check permission
	if allowed, err := s.CheckPermission(userID, conversationID, "who_can_create_solitaire"); err != nil {
		return nil, err
	} else if !allowed {
		return nil, errors.New("只有管理员可以发起接龙")
	}

	solitaire := Solitaire{
		ID:             uid.New("sol"),
		ConversationID: conversationID,
		CreatorID:      userID,
		Title:          title,
		CreatedAt:      time.Now(),
	}

	if err := s.db.Create(&solitaire).Error; err != nil {
		return nil, err
	}

	return &SolitairePayload{
		ID:             solitaire.ID,
		ConversationID: solitaire.ConversationID,
		CreatorID:      solitaire.CreatorID,
		Title:          solitaire.Title,
		CreatedAt:      formatTime(solitaire.CreatedAt),
		Items:          []SolitaireItemPayload{},
	}, nil
}

// JoinSolitaire adds an entry to a solitaire.
func (s *Service) JoinSolitaire(userID, solitaireID, content string) error {
	var solitaire Solitaire
	if err := s.db.Where("id = ?", solitaireID).First(&solitaire).Error; err != nil {
		return errors.New("接龙不存在")
	}

	// Verify user is in the conversation
	if _, err := s.memberRecord(userID, solitaire.ConversationID); err != nil {
		return err
	}

	// Check if already joined
	var existing SolitaireItem
	if err := s.db.Where("solitaire_id = ? AND user_id = ?", solitaireID, userID).First(&existing).Error; err == nil {
		// Already joined, update content
		return s.db.Model(&existing).Update("content", content).Error
	}

	// Get next sort order
	var maxOrder int
	s.db.Model(&SolitaireItem{}).Where("solitaire_id = ?", solitaireID).
		Select("COALESCE(MAX(sort_order), 0)").Scan(&maxOrder)

	item := SolitaireItem{
		ID:          uid.New("item"),
		SolitaireID: solitaireID,
		UserID:      userID,
		Content:     content,
		SortOrder:   maxOrder + 1,
		CreatedAt:   time.Now(),
	}
	return s.db.Create(&item).Error
}

// UpdateSolitaireItem updates a solitaire entry. Only the owner of the entry can update.
func (s *Service) UpdateSolitaireItem(userID, solitaireID, itemID, content string) error {
	var item SolitaireItem
	if err := s.db.Where("id = ? AND solitaire_id = ?", itemID, solitaireID).First(&item).Error; err != nil {
		return errors.New("接龙条目不存在")
	}

	if item.UserID != userID {
		return errors.New("只能修改自己的接龙内容")
	}

	return s.db.Model(&item).Update("content", content).Error
}

// GetSolitaire returns solitaire details with all entries.
func (s *Service) GetSolitaire(userID, solitaireID string) (*SolitairePayload, error) {
	var solitaire Solitaire
	if err := s.db.Where("id = ?", solitaireID).First(&solitaire).Error; err != nil {
		return nil, errors.New("接龙不存在")
	}

	// Verify user is in the conversation
	if _, err := s.memberRecord(userID, solitaire.ConversationID); err != nil {
		return nil, err
	}

	var items []SolitaireItem
	if err := s.db.Where("solitaire_id = ?", solitaireID).
		Order("sort_order asc").Find(&items).Error; err != nil {
		return nil, err
	}

	result := &SolitairePayload{
		ID:             solitaire.ID,
		ConversationID: solitaire.ConversationID,
		CreatorID:      solitaire.CreatorID,
		Title:          solitaire.Title,
		CreatedAt:      formatTime(solitaire.CreatedAt),
		Items:          make([]SolitaireItemPayload, 0, len(items)),
	}
	for _, item := range items {
		result.Items = append(result.Items, SolitaireItemPayload{
			ID:        item.ID,
			UserID:    item.UserID,
			Content:   item.Content,
			SortOrder: item.SortOrder,
			CreatedAt: formatTime(item.CreatedAt),
		})
	}
	return result, nil
}

// GetSolitairesByConversation returns all solitaires in a group conversation.
func (s *Service) GetSolitairesByConversation(userID, conversationID string) ([]SolitairePayload, error) {
	if _, err := s.memberRecord(userID, conversationID); err != nil {
		return nil, err
	}

	var solitaires []Solitaire
	if err := s.db.Where("conversation_id = ?", conversationID).Order("created_at desc").Find(&solitaires).Error; err != nil {
		return nil, err
	}
	if len(solitaires) == 0 {
		return []SolitairePayload{}, nil
	}

	solIDs := make([]string, len(solitaires))
	for i, sol := range solitaires {
		solIDs[i] = sol.ID
	}

	var items []SolitaireItem
	if err := s.db.Where("solitaire_id IN ?", solIDs).Order("sort_order asc").Find(&items).Error; err != nil {
		return nil, err
	}
	itemsBySol := make(map[string][]SolitaireItem)
	for _, item := range items {
		itemsBySol[item.SolitaireID] = append(itemsBySol[item.SolitaireID], item)
	}

	results := make([]SolitairePayload, 0, len(solitaires))
	for _, sol := range solitaires {
		payload := SolitairePayload{
			ID:             sol.ID,
			ConversationID: sol.ConversationID,
			CreatorID:      sol.CreatorID,
			Title:          sol.Title,
			CreatedAt:      formatTime(sol.CreatedAt),
			Items:          make([]SolitaireItemPayload, 0),
		}
		for _, item := range itemsBySol[sol.ID] {
			payload.Items = append(payload.Items, SolitaireItemPayload{
				ID:        item.ID,
				UserID:    item.UserID,
				Content:   item.Content,
				SortOrder: item.SortOrder,
				CreatedAt: formatTime(item.CreatedAt),
			})
		}
		results = append(results, payload)
	}
	return results, nil
}
