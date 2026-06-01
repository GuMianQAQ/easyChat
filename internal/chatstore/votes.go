package chatstore

import (
	"errors"
	"time"

	"easyChat/internal/uid"

	"gorm.io/gorm"
)

type VotePayload struct {
	ID             string              `json:"id"`
	ConversationID string              `json:"conversationId"`
	CreatorID      string              `json:"creatorId"`
	Question       string              `json:"question"`
	AllowMulti     bool                `json:"allowMulti"`
	Anonymous      bool                `json:"anonymous"`
	Deadline       *string             `json:"deadline,omitempty"`
	CreatedAt      string              `json:"createdAt"`
	Options        []VoteOptionPayload `json:"options"`
	TotalVotes     int                 `json:"totalVotes"`
}

type VoteOptionPayload struct {
	ID         string `json:"id"`
	OptionText string `json:"optionText"`
	SortOrder  int    `json:"sortOrder"`
	VoteCount  int    `json:"voteCount"`
}

func (s *Service) CreateVote(userID, conversationID, question string, options []string, allowMulti, anonymous bool, deadline *time.Time) (*VotePayload, error) {
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return nil, err
	}
	if conversation.Type != GroupConversationType {
		return nil, errors.New("当前会话不是群聊")
	}

	if allowed, err := s.CheckPermission(userID, conversationID, "who_can_create_vote"); err != nil {
		return nil, err
	} else if !allowed {
		return nil, errors.New("只有管理员可以发起投票")
	}

	if len(options) < 2 {
		return nil, errors.New("至少需要两个选项")
	}

	vote := Vote{
		ID:             uid.New("vote"),
		ConversationID: conversationID,
		CreatorID:      userID,
		Question:       question,
		AllowMulti:     allowMulti,
		Anonymous:      anonymous,
		Deadline:       deadline,
		CreatedAt:      time.Now(),
	}

	voteOptions := make([]VoteOption, 0, len(options))
	for i, opt := range options {
		voteOptions = append(voteOptions, VoteOption{
			ID:         uid.New("opt"),
			VoteID:     vote.ID,
			OptionText: opt,
			SortOrder:  i,
		})
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&vote).Error; err != nil {
			return err
		}
		return tx.Create(&voteOptions).Error
	}); err != nil {
		return nil, err
	}

	result := &VotePayload{
		ID:             vote.ID,
		ConversationID: vote.ConversationID,
		CreatorID:      vote.CreatorID,
		Question:       vote.Question,
		AllowMulti:     vote.AllowMulti,
		Anonymous:      vote.Anonymous,
		CreatedAt:      formatTime(vote.CreatedAt),
		Options:        make([]VoteOptionPayload, 0, len(voteOptions)),
	}
	if vote.Deadline != nil {
		deadlineStr := formatTime(*vote.Deadline)
		result.Deadline = &deadlineStr
	}
	for _, opt := range voteOptions {
		result.Options = append(result.Options, VoteOptionPayload{
			ID:         opt.ID,
			OptionText: opt.OptionText,
			SortOrder:  opt.SortOrder,
			VoteCount:  0,
		})
	}
	return result, nil
}

func (s *Service) GetVotesByConversation(userID, conversationID string) ([]VotePayload, error) {
	if _, err := s.memberRecord(userID, conversationID); err != nil {
		return nil, err
	}

	var votes []Vote
	if err := s.db.Where("conversation_id = ?", conversationID).Order("created_at desc").Find(&votes).Error; err != nil {
		return nil, err
	}
	if len(votes) == 0 {
		return []VotePayload{}, nil
	}

	voteIDs := make([]string, len(votes))
	for i, v := range votes {
		voteIDs[i] = v.ID
	}

	var options []VoteOption
	if err := s.db.Where("vote_id IN ?", voteIDs).Find(&options).Error; err != nil {
		return nil, err
	}
	optByVote := make(map[string][]VoteOption)
	for _, opt := range options {
		optByVote[opt.VoteID] = append(optByVote[opt.VoteID], opt)
	}

	var records []VoteRecord
	if err := s.db.Where("vote_id IN ?", voteIDs).Find(&records).Error; err != nil {
		return nil, err
	}
	countByOpt := make(map[string]int)
	countByVote := make(map[string]int)
	for _, r := range records {
		countByOpt[r.OptionID]++
		countByVote[r.VoteID]++
	}

	results := make([]VotePayload, 0, len(votes))
	for _, vote := range votes {
		payload := VotePayload{
			ID:             vote.ID,
			ConversationID: vote.ConversationID,
			CreatorID:      vote.CreatorID,
			Question:       vote.Question,
			AllowMulti:     vote.AllowMulti,
			Anonymous:      vote.Anonymous,
			CreatedAt:      formatTime(vote.CreatedAt),
			TotalVotes:     countByVote[vote.ID],
			Options:        make([]VoteOptionPayload, 0),
		}
		if vote.Deadline != nil {
			deadlineStr := formatTime(*vote.Deadline)
			payload.Deadline = &deadlineStr
		}
		for _, opt := range optByVote[vote.ID] {
			payload.Options = append(payload.Options, VoteOptionPayload{
				ID:         opt.ID,
				OptionText: opt.OptionText,
				SortOrder:  opt.SortOrder,
				VoteCount:  countByOpt[opt.ID],
			})
		}
		results = append(results, payload)
	}
	return results, nil
}

func (s *Service) CastVote(userID, voteID string, optionIDs []string) error {
	var vote Vote
	if err := s.db.Where("id = ?", voteID).First(&vote).Error; err != nil {
		return errors.New("投票不存在")
	}

	if vote.Deadline != nil && vote.Deadline.Before(time.Now()) {
		return errors.New("投票已截止")
	}

	if _, err := s.memberRecord(userID, vote.ConversationID); err != nil {
		return err
	}

	var validOptions []VoteOption
	if err := s.db.Where("vote_id = ? AND id IN ?", voteID, optionIDs).Find(&validOptions).Error; err != nil {
		return err
	}
	if len(validOptions) != len(optionIDs) {
		return errors.New("存在无效的选项")
	}

	if !vote.AllowMulti && len(optionIDs) > 1 {
		return errors.New("该投票为单选")
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("vote_id = ? AND user_id = ?", voteID, userID).Delete(&VoteRecord{}).Error; err != nil {
			return err
		}
		for _, optID := range optionIDs {
			record := VoteRecord{
				ID:        uid.New("vr"),
				VoteID:    voteID,
				UserID:    userID,
				OptionID:  optID,
				CreatedAt: time.Now(),
			}
			if err := tx.Create(&record).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *Service) Unvote(userID, voteID string) error {
	var vote Vote
	if err := s.db.Where("id = ?", voteID).First(&vote).Error; err != nil {
		return errors.New("投票不存在")
	}

	if vote.Deadline != nil && vote.Deadline.Before(time.Now()) {
		return errors.New("投票已截止，无法修改")
	}

	result := s.db.Where("vote_id = ? AND user_id = ?", voteID, userID).Delete(&VoteRecord{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("你尚未投票")
	}
	return nil
}

func (s *Service) GetVote(userID, voteID string) (*VotePayload, error) {
	var vote Vote
	if err := s.db.Where("id = ?", voteID).First(&vote).Error; err != nil {
		return nil, errors.New("投票不存在")
	}

	if _, err := s.memberRecord(userID, vote.ConversationID); err != nil {
		return nil, err
	}

	var options []VoteOption
	if err := s.db.Where("vote_id = ?", voteID).Order("sort_order asc").Find(&options).Error; err != nil {
		return nil, err
	}

	var records []VoteRecord
	if err := s.db.Where("vote_id = ?", voteID).Find(&records).Error; err != nil {
		return nil, err
	}

	countMap := make(map[string]int)
	for _, r := range records {
		countMap[r.OptionID]++
	}

	result := &VotePayload{
		ID:             vote.ID,
		ConversationID: vote.ConversationID,
		CreatorID:      vote.CreatorID,
		Question:       vote.Question,
		AllowMulti:     vote.AllowMulti,
		Anonymous:      vote.Anonymous,
		CreatedAt:      formatTime(vote.CreatedAt),
		TotalVotes:     len(records),
		Options:        make([]VoteOptionPayload, 0, len(options)),
	}
	if vote.Deadline != nil {
		deadlineStr := formatTime(*vote.Deadline)
		result.Deadline = &deadlineStr
	}
	for _, opt := range options {
		result.Options = append(result.Options, VoteOptionPayload{
			ID:         opt.ID,
			OptionText: opt.OptionText,
			SortOrder:  opt.SortOrder,
			VoteCount:  countMap[opt.ID],
		})
	}
	return result, nil
}
