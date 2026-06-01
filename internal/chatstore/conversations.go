package chatstore

import (
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"

	"easyChat/internal/auth"
	"easyChat/internal/uid"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func (s *Service) ensureBaseConversations() error {
	now := time.Now()
	system := Conversation{ID: SystemConversationID, Type: "system", Name: "系统通知", CreatedAt: now, UpdatedAt: now}
	if err := s.db.Where("id = ?", system.ID).FirstOrCreate(&system).Error; err != nil {
		return err
	}
	return nil
}

func (s *Service) cleanupLegacyPublicConversation() error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("conversation_id = ?", "public").Delete(&Message{}).Error; err != nil {
			return err
		}
		if err := tx.Where("conversation_id = ?", "public").Delete(&ConversationMember{}).Error; err != nil {
			return err
		}
		if err := tx.Where("id = ?", "public").Delete(&Conversation{}).Error; err != nil {
			return err
		}
		return nil
	})
}

func (s *Service) cleanupAIFromPrivateConversations() error {
	return s.db.Where("user_id = ? AND conversation_id LIKE ?", "ai-assistant", "private:%").
		Delete(&ConversationMember{}).Error
}

func (s *Service) ListConversations(userID string) ([]ConversationSummary, error) {
	memberMap, err := s.memberMap(userID)
	if err != nil {
		return nil, err
	}

	var conversations []Conversation
	if err := s.db.
		Table("conversations").
		Select("conversations.*").
		Joins("join conversation_members on conversation_members.conversation_id = conversations.id").
		Where("conversation_members.user_id = ? AND conversations.type IN ?", userID, []string{"private", GroupConversationType}).
		Find(&conversations).Error; err != nil {
		return nil, err
	}

	summaries := make([]ConversationSummary, 0, len(conversations))
	for _, conversation := range conversations {
		if conversation.Type == "system" {
			continue
		}
		member := memberMap[conversation.ID]
		if member != nil && member.HiddenAt != nil && !conversation.UpdatedAt.After(*member.HiddenAt) {
			continue
		}

		summary, err := s.buildConversationSummary(userID, conversation, member)
		if err != nil {
			return nil, err
		}
		summaries = append(summaries, summary)
	}

	slices.SortFunc(summaries, func(left, right ConversationSummary) int {
		if left.Pinned != right.Pinned {
			if left.Pinned {
				return -1
			}
			return 1
		}
		if left.LastMessageTime == right.LastMessageTime {
			return strings.Compare(left.Name, right.Name)
		}
		return strings.Compare(right.LastMessageTime, left.LastMessageTime)
	})
	return summaries, nil
}

func (s *Service) EnsurePrivateConversation(currentUserID, targetUserID string) (ConversationSummary, error) {
	currentUserID = strings.TrimSpace(currentUserID)
	targetUserID = strings.TrimSpace(targetUserID)
	if currentUserID == "" || targetUserID == "" {
		return ConversationSummary{}, errors.New("缺少有效的用户 ID")
	}
	if currentUserID == targetUserID {
		return ConversationSummary{}, errors.New("不能和自己创建私聊会话")
	}
	if _, err := s.lookupUser(currentUserID); err != nil {
		return ConversationSummary{}, errors.New("当前用户不存在")
	}
	targetUser, err := s.lookupUser(targetUserID)
	if err != nil {
		return ConversationSummary{}, errors.New("目标用户不存在")
	}

	conversationID := StablePrivateConversationID(currentUserID, targetUserID)
	now := time.Now()
	err = s.db.Transaction(func(tx *gorm.DB) error {
		conversation := Conversation{
			ID:        conversationID,
			Type:      "private",
			Name:      targetUser.Nickname,
			Avatar:    targetUser.Avatar,
			CreatedAt: now,
			UpdatedAt: now,
		}
		if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&conversation).Error; err != nil {
			return err
		}
		if err := tx.Model(&Conversation{}).Where("id = ?", conversationID).Updates(map[string]any{
			"name":       targetUser.Nickname,
			"avatar":     targetUser.Avatar,
			"updated_at": now,
		}).Error; err != nil {
			return err
		}

		members := []ConversationMember{
			{
				ID:             uid.New("member"),
				ConversationID: conversationID,
				UserID:         currentUserID,
				Role:           "member",
				JoinedAt:       now,
			},
			{
				ID:             uid.New("member"),
				ConversationID: conversationID,
				UserID:         targetUserID,
				Role:           "member",
				JoinedAt:       now,
			},
		}
		for _, member := range members {
			if err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "conversation_id"}, {Name: "user_id"}},
				DoNothing: true,
			}).Create(&member).Error; err != nil {
				return err
			}
		}

		if err := tx.Model(&ConversationMember{}).
			Where("conversation_id = ? AND user_id = ?", conversationID, currentUserID).
			Update("hidden_at", nil).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return ConversationSummary{}, err
	}

	var conversation Conversation
	if err := s.db.First(&conversation, "id = ?", conversationID).Error; err != nil {
		return ConversationSummary{}, err
	}
	member, err := s.memberRecord(currentUserID, conversationID)
	if err != nil {
		return ConversationSummary{}, err
	}
	return s.buildConversationSummary(currentUserID, conversation, member)
}

func (s *Service) CreateGroupConversation(creatorID, name string, memberIDs []string) (ConversationSummary, error) {
	creatorID = strings.TrimSpace(creatorID)
	name = strings.TrimSpace(name)
	if creatorID == "" {
		return ConversationSummary{}, errors.New("缺少有效的用户 ID")
	}

	unique := make([]string, 0, len(memberIDs))
	seen := map[string]struct{}{creatorID: {}}
	for _, memberID := range memberIDs {
		memberID = strings.TrimSpace(memberID)
		if memberID == "" {
			continue
		}
		if _, ok := seen[memberID]; ok {
			continue
		}
		seen[memberID] = struct{}{}
		unique = append(unique, memberID)
	}
	if len(unique) == 0 {
		return ConversationSummary{}, errors.New("请选择至少一位好友创建群聊")
	}
	if name == "" {
		name = "群聊"
	}

	now := time.Now()
	conversationID := uid.New("group")
	err := s.db.Transaction(func(tx *gorm.DB) error {
		conversation := Conversation{
			ID:        conversationID,
			Type:      GroupConversationType,
			Name:      name,
			Avatar:    "",
			CreatedBy: creatorID,
			CreatedAt: now,
			UpdatedAt: now,
		}
		if err := tx.Create(&conversation).Error; err != nil {
			return err
		}

		members := make([]ConversationMember, 0, len(unique)+1)
		members = append(members, ConversationMember{
			ID:             uid.New("member"),
			ConversationID: conversationID,
			UserID:         creatorID,
			Role:           "owner",
			JoinedAt:       now,
		})
		for _, memberID := range unique {
			members = append(members, ConversationMember{
				ID:             uid.New("member"),
				ConversationID: conversationID,
				UserID:         memberID,
				Role:           "member",
				JoinedAt:       now,
			})
		}
		for _, member := range members {
			if err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "conversation_id"}, {Name: "user_id"}},
				DoNothing: true,
			}).Create(&member).Error; err != nil {
				return err
			}
		}

		return tx.Model(&ConversationMember{}).
			Where("conversation_id = ? AND user_id = ?", conversationID, creatorID).
			Update("hidden_at", nil).Error
	})
	if err != nil {
		return ConversationSummary{}, err
	}

	conversation, err := s.getConversationForUser(creatorID, conversationID)
	if err != nil {
		return ConversationSummary{}, err
	}
	member, err := s.memberRecord(creatorID, conversationID)
	if err != nil {
		return ConversationSummary{}, err
	}
	return s.buildConversationSummary(creatorID, conversation, member)
}

func (s *Service) UpdateConversationSettings(userID, conversationID string, pinned, muted *bool) (ConversationSummary, error) {
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return ConversationSummary{}, err
	}
	member, err := s.ensureSettingsMember(userID, conversationID)
	if err != nil {
		return ConversationSummary{}, err
	}

	updates := map[string]any{}
	if pinned != nil {
		updates["is_pinned"] = *pinned
	}
	if muted != nil {
		updates["is_muted"] = *muted
	}
	if len(updates) > 0 {
		if err := s.db.Model(&ConversationMember{}).
			Where("conversation_id = ? AND user_id = ?", conversationID, userID).
			Updates(updates).Error; err != nil {
			return ConversationSummary{}, err
		}
	}

	member, err = s.memberRecord(userID, conversationID)
	if err != nil {
		return ConversationSummary{}, err
	}
	return s.buildConversationSummary(userID, conversation, member)
}

func (s *Service) DeleteConversationForUser(userID, conversationID string) error {
	if _, err := s.getConversationForUser(userID, conversationID); err != nil {
		return err
	}
	if _, err := s.ensureSettingsMember(userID, conversationID); err != nil {
		return err
	}

	now := time.Now()
	return s.db.Model(&ConversationMember{}).
		Where("conversation_id = ? AND user_id = ?", conversationID, userID).
		Updates(map[string]any{"hidden_at": &now}).Error
}

func (s *Service) ClearConversationForUser(userID, conversationID string) error {
	if _, err := s.getConversationForUser(userID, conversationID); err != nil {
		return err
	}
	if _, err := s.ensureSettingsMember(userID, conversationID); err != nil {
		return err
	}

	now := time.Now()
	return s.db.Model(&ConversationMember{}).
		Where("conversation_id = ? AND user_id = ?", conversationID, userID).
		Update("cleared_at", &now).Error
}

func (s *Service) MarkConversationRead(userID, conversationID string) error {
	if _, err := s.getConversationForUser(userID, conversationID); err != nil {
		return err
	}
	if _, err := s.ensureSettingsMember(userID, conversationID); err != nil {
		return err
	}

	now := time.Now()
	return s.db.Model(&ConversationMember{}).
		Where("conversation_id = ? AND user_id = ?", conversationID, userID).
		Update("last_read_at", &now).Error
}

func (s *Service) resolveConversation(userID, conversationID, messageScope string) (Conversation, error) {
	conversationID = strings.TrimSpace(conversationID)
	if conversationID == "" {
		return Conversation{}, errors.New("缺少会话 ID")
	}
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return Conversation{}, err
	}
	expected := strings.TrimSpace(messageScope)
	if expected == "" {
		expected = conversation.Type
	}
	if expected != conversation.Type {
		return Conversation{}, errors.New("消息类型与会话类型不匹配")
	}
	if conversation.Type != "private" && conversation.Type != GroupConversationType && conversation.Type != "system" {
		return Conversation{}, errors.New("不支持的会话类型")
	}
	return conversation, nil
}

func (s *Service) getConversationForUser(userID, conversationID string) (Conversation, error) {
	if strings.TrimSpace(conversationID) == "" {
		return Conversation{}, errors.New("缺少会话 ID")
	}

	var conversation Conversation
	if err := s.db.First(&conversation, "id = ?", conversationID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return Conversation{}, errors.New("会话不存在")
		}
		return Conversation{}, err
	}

	if conversation.Type == "system" {
		return conversation, nil
	}

	var count int64
	if err := s.db.Model(&ConversationMember{}).
		Where("conversation_id = ? AND user_id = ?", conversationID, userID).
		Count(&count).Error; err != nil {
		return Conversation{}, err
	}
	if count == 0 {
		return Conversation{}, errors.New("无权访问该会话")
	}
	if conversation.Type != "private" && conversation.Type != GroupConversationType {
		return Conversation{}, errors.New("不支持的会话类型")
	}
	return conversation, nil
}

func (s *Service) buildConversationSummary(currentUserID string, conversation Conversation, member *ConversationMember) (ConversationSummary, error) {
	summary := ConversationSummary{
		ID:              conversation.ID,
		Type:            conversation.Type,
		Name:            conversation.Name,
		Avatar:          conversation.Avatar,
		CreatedBy:       conversation.CreatedBy,
		UnreadCount:     0,
		LastMessage:     "",
		LastMessageType: "text",
		LastMessageTime: formatTime(conversation.UpdatedAt),
	}
	if member != nil {
		summary.Pinned = member.IsPinned
		summary.Muted = member.IsMuted
	}

	if conversation.Type == "private" {
		target, err := s.privatePartner(conversation.ID, currentUserID)
		if err != nil {
			return ConversationSummary{}, err
		}
		summary.Name = target.Nickname
		summary.Avatar = target.Avatar
		summary.TargetUserID = target.ID
		summary.TargetUsername = target.Username
		summary.TargetNickname = target.Nickname
		summary.TargetAvatar = target.Avatar
		summary.TargetName = target.Nickname
	}
	if conversation.Type == GroupConversationType {
		var count int64
		if err := s.db.Model(&ConversationMember{}).Where("conversation_id = ?", conversation.ID).Count(&count).Error; err == nil {
			summary.MemberCount = int(count)
		}
		summary.Announcement = conversation.Announcement
	}

	query := s.db.Where("conversation_id = ?", conversation.ID)
	if member != nil && member.ClearedAt != nil {
		query = query.Where("created_at > ?", *member.ClearedAt)
	}

	var record Message
	if err := query.Order("created_at desc").First(&record).Error; err == nil {
		lastMessage := summarizeMessageRecord(record, record.SenderID == currentUserID)
		if conversation.Type == GroupConversationType {
			lastMessage = fmt.Sprintf("%s：%s", s.groupDisplayName(conversation.ID, record.SenderID, record.SenderName), lastMessage)
		}
		summary.LastMessage = lastMessage
		summary.LastMessageType = record.MessageType
		summary.LastMessageTime = formatTime(record.CreatedAt)
	}
	return summary, nil
}

func (s *Service) privatePartner(conversationID, currentUserID string) (auth.User, error) {
	if strings.Contains(conversationID, "ai-assistant") {
		return s.lookupUser("ai-assistant")
	}

	var members []ConversationMember
	if err := s.db.Where("conversation_id = ?", conversationID).Find(&members).Error; err != nil {
		return auth.User{}, err
	}
	for _, member := range members {
		if member.UserID == currentUserID {
			continue
		}
		return s.lookupUser(member.UserID)
	}
	return auth.User{}, errors.New("私聊成员不存在")
}

func (s *Service) memberMap(userID string) (map[string]*ConversationMember, error) {
	var members []ConversationMember
	if err := s.db.Where("user_id = ?", userID).Find(&members).Error; err != nil {
		return nil, err
	}
	result := make(map[string]*ConversationMember, len(members))
	for index := range members {
		member := members[index]
		result[member.ConversationID] = &member
	}
	return result, nil
}

func (s *Service) memberRecord(userID, conversationID string) (*ConversationMember, error) {
	var member ConversationMember
	if err := s.db.Where("conversation_id = ? AND user_id = ?", conversationID, userID).First(&member).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &member, nil
}

func (s *Service) ensureSettingsMember(userID, conversationID string) (*ConversationMember, error) {
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return nil, err
	}

	member, err := s.memberRecord(userID, conversationID)
	if err != nil {
		return nil, err
	}
	if member != nil {
		return member, nil
	}

	if conversation.Type == "private" || conversation.Type == GroupConversationType {
		return nil, errors.New("当前会话不存在成员设置")
	}

	now := time.Now()
	record := ConversationMember{
		ID:             uid.New("member"),
		ConversationID: conversationID,
		UserID:         userID,
		Role:           "member",
		JoinedAt:       now,
	}
	if err := s.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "conversation_id"}, {Name: "user_id"}},
		DoNothing: true,
	}).Create(&record).Error; err != nil {
		return nil, err
	}
	return s.memberRecord(userID, conversationID)
}

func (s *Service) EnsureMember(conversationID, userID string) error {
	conversationID = strings.TrimSpace(conversationID)
	userID = strings.TrimSpace(userID)
	if conversationID == "" || userID == "" {
		return errors.New("缺少会话 ID 或用户 ID")
	}

	var count int64
	if err := s.db.Model(&ConversationMember{}).
		Where("conversation_id = ? AND user_id = ?", conversationID, userID).
		Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	record := ConversationMember{
		ID:             uid.New("member"),
		ConversationID: conversationID,
		UserID:         userID,
		Role:           "member",
		JoinedAt:       time.Now(),
	}
	return s.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "conversation_id"}, {Name: "user_id"}},
		DoNothing: true,
	}).Create(&record).Error
}
