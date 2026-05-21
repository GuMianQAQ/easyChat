package chatstore

import (
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"
)

func (s *Service) GetGroupConversation(userID, conversationID string) (GroupConversationPayload, error) {
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return GroupConversationPayload{}, err
	}
	if conversation.Type != GroupConversationType {
		return GroupConversationPayload{}, errors.New("当前会话不是群聊")
	}
	member, err := s.memberRecord(userID, conversationID)
	if err != nil {
		return GroupConversationPayload{}, err
	}
	if member == nil {
		return GroupConversationPayload{}, errors.New("当前用户不在该群聊中")
	}

	var records []ConversationMember
	if err := s.db.Where("conversation_id = ?", conversationID).Order("joined_at asc").Find(&records).Error; err != nil {
		return GroupConversationPayload{}, err
	}

	items := make([]GroupMemberPayload, 0, len(records))
	for _, record := range records {
		user, err := s.lookupUser(record.UserID)
		if err != nil {
			return GroupConversationPayload{}, err
		}
		items = append(items, GroupMemberPayload{
			UserID:        user.ID,
			Username:      user.Username,
			Nickname:      user.Nickname,
			Avatar:        user.Avatar,
			Role:          record.Role,
			GroupNickname: record.GroupNickname,
		})
	}

	return GroupConversationPayload{
		ID:                  conversation.ID,
		Type:                conversation.Type,
		Name:                conversation.Name,
		Avatar:              conversation.Avatar,
		Announcement:        conversation.Announcement,
		Remark:              member.Remark,
		MyNickname:          member.GroupNickname,
		MyRole:              member.Role,
		CanEditGroupProfile: member.Role == "owner",
		IsMuted:             member.IsMuted,
		MemberCount:         len(items),
		Members:             items,
	}, nil
}

func (s *Service) UpdateGroupConversation(userID, conversationID string, input UpdateGroupConversationRequest) (GroupConversationPayload, error) {
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return GroupConversationPayload{}, err
	}
	if conversation.Type != GroupConversationType {
		return GroupConversationPayload{}, errors.New("当前会话不是群聊")
	}
	member, err := s.memberRecord(userID, conversationID)
	if err != nil {
		return GroupConversationPayload{}, err
	}
	if member == nil {
		return GroupConversationPayload{}, errors.New("当前用户不在该群聊中")
	}

	if input.Avatar != nil && member.Role != "owner" {
		return GroupConversationPayload{}, errors.New("只有群主可以修改群头像")
	}
	if input.Name != nil && member.Role != "owner" {
		return GroupConversationPayload{}, errors.New("只有群主可以修改群名称")
	}
	if input.Announcement != nil && member.Role != "owner" {
		return GroupConversationPayload{}, errors.New("只有群主可以修改群公告")
	}

	updates := map[string]any{}
	if input.Avatar != nil {
		avatar := strings.TrimSpace(*input.Avatar)
		if avatar != "" && !strings.HasPrefix(avatar, "/uploads/") {
			return GroupConversationPayload{}, errors.New("群头像必须使用上传后的地址")
		}
		updates["avatar"] = avatar
	}
	if input.Name != nil {
		if name := strings.TrimSpace(*input.Name); name != "" {
			updates["name"] = name
		}
	}
	if input.Announcement != nil {
		updates["announcement"] = strings.TrimSpace(*input.Announcement)
	}
	if len(updates) > 0 {
		updates["updated_at"] = time.Now()
		if err := s.db.Model(&Conversation{}).Where("id = ?", conversationID).Updates(updates).Error; err != nil {
			return GroupConversationPayload{}, err
		}
	}

	memberUpdates := map[string]any{}
	if input.Remark != nil {
		memberUpdates["remark"] = strings.TrimSpace(*input.Remark)
	}
	if input.MyNickname != nil {
		memberUpdates["group_nickname"] = strings.TrimSpace(*input.MyNickname)
	}
	if input.IsMuted != nil {
		memberUpdates["is_muted"] = *input.IsMuted
	}
	if len(memberUpdates) > 0 {
		if err := s.db.Model(&ConversationMember{}).
			Where("conversation_id = ? AND user_id = ?", conversationID, userID).
			Updates(memberUpdates).Error; err != nil {
			return GroupConversationPayload{}, err
		}
	}
	return s.GetGroupConversation(userID, conversationID)
}

func (s *Service) ConversationMemberIDs(userID, conversationID string) ([]string, error) {
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return nil, err
	}

	switch conversation.Type {
	case "private":
		partner, err := s.privatePartner(conversationID, userID)
		if err != nil {
			return nil, err
		}
		return []string{userID, partner.ID}, nil
	case GroupConversationType:
		var members []ConversationMember
		if err := s.db.Where("conversation_id = ?", conversationID).Find(&members).Error; err != nil {
			return nil, err
		}
		ids := make([]string, 0, len(members))
		for _, member := range members {
			ids = append(ids, member.UserID)
		}
		return ids, nil
	default:
		return nil, errors.New("当前会话不支持成员列表")
	}
}

func (s *Service) LeaveGroupConversation(userID, conversationID string) error {
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
	if member.Role == "owner" {
		return errors.New("群主请使用解散群聊功能")
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ? AND conversation_id = ?", userID, conversationID).Delete(&Favorite{}).Error; err != nil {
			return err
		}
		result := tx.Where("conversation_id = ? AND user_id = ?", conversationID, userID).Delete(&ConversationMember{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return errors.New("当前用户不在该群聊中")
		}
		return nil
	})
}

func (s *Service) DismissGroupConversation(userID, conversationID string) error {
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
	if member.Role != "owner" {
		return errors.New("只有群主可以解散群聊")
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("conversation_id = ?", conversationID).Delete(&Favorite{}).Error; err != nil {
			return err
		}
		if err := tx.Where("conversation_id = ?", conversationID).Delete(&Message{}).Error; err != nil {
			return err
		}
		if err := tx.Where("conversation_id = ?", conversationID).Delete(&ConversationMember{}).Error; err != nil {
			return err
		}
		result := tx.Where("id = ?", conversationID).Delete(&Conversation{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return errors.New("群聊不存在")
		}
		return nil
	})
}

func (s *Service) groupDisplayName(conversationID, userID, fallback string) string {
	if conversationID == "" || userID == "" {
		return strings.TrimSpace(fallback)
	}
	member, err := s.memberRecord(userID, conversationID)
	if err == nil && member != nil {
		if nickname := strings.TrimSpace(member.GroupNickname); nickname != "" {
			return nickname
		}
	}
	return strings.TrimSpace(fallback)
}
