package chatstore

import (
	"encoding/json"
	"errors"
	"strings"
	"time"

	"easyChat/internal/uid"

	"gorm.io/gorm"
)

const groupBotUserID = "ai-assistant"

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
		payload := GroupMemberPayload{
			UserID:        user.ID,
			Username:      user.Username,
			Nickname:      user.Nickname,
			Avatar:        user.Avatar,
			Role:          record.Role,
			GroupNickname: record.GroupNickname,
		}
		if record.MutedUntil != nil {
			mutedUntilStr := formatTime(*record.MutedUntil)
			payload.MutedUntil = &mutedUntilStr
		}
		items = append(items, payload)
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
		BotEnabled:          conversation.BotEnabled,
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

	if input.Avatar != nil {
		if allowed, err := s.CheckPermission(userID, conversationID, "who_can_change_avatar"); err != nil {
			return GroupConversationPayload{}, err
		} else if !allowed {
			return GroupConversationPayload{}, errors.New("只有管理员可以修改群头像")
		}
	}
	if input.Name != nil {
		if allowed, err := s.CheckPermission(userID, conversationID, "who_can_change_name"); err != nil {
			return GroupConversationPayload{}, err
		} else if !allowed {
			return GroupConversationPayload{}, errors.New("只有管理员可以修改群名称")
		}
	}
	if input.Announcement != nil {
		if allowed, err := s.CheckPermission(userID, conversationID, "who_can_change_announcement"); err != nil {
			return GroupConversationPayload{}, err
		} else if !allowed {
			return GroupConversationPayload{}, errors.New("只有管理员可以修改群公告")
		}
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

func (s *Service) IsGroupBotEnabled(userID, conversationID string) (bool, error) {
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return false, err
	}
	if conversation.Type != GroupConversationType {
		return false, errors.New("当前会话不是群聊")
	}
	return conversation.BotEnabled, nil
}

func (s *Service) SetGroupBotEnabled(userID, conversationID string, enabled bool) (GroupConversationPayload, error) {
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
	if member.Role != "owner" {
		return GroupConversationPayload{}, errors.New("只有群主可以设置群机器人")
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&Conversation{}).
			Where("id = ?", conversationID).
			Updates(map[string]any{"bot_enabled": enabled, "updated_at": time.Now()}).Error; err != nil {
			return err
		}

		if enabled {
			record := ConversationMember{
				ID:             uid.New("member"),
				ConversationID: conversationID,
				UserID:         groupBotUserID,
				Role:           "member",
				JoinedAt:       time.Now(),
			}
			return tx.Where("conversation_id = ? AND user_id = ?", conversationID, groupBotUserID).FirstOrCreate(&record).Error
		}

		return tx.Where("conversation_id = ? AND user_id = ?", conversationID, groupBotUserID).Delete(&ConversationMember{}).Error
	})
	if err != nil {
		return GroupConversationPayload{}, err
	}

	return s.GetGroupConversation(userID, conversationID)
}

// CheckPermission checks if a user has permission for a specific action in a group conversation.
func (s *Service) CheckPermission(userID, conversationID, action string) (bool, error) {
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return false, err
	}
	if conversation.Type != GroupConversationType {
		return false, errors.New("当前会话不是群聊")
	}

	member, err := s.memberRecord(userID, conversationID)
	if err != nil {
		return false, err
	}
	if member == nil {
		return false, errors.New("当前用户不在该群聊中")
	}

	if member.Role == "owner" {
		return true, nil
	}

	perms := make(map[string]string)
	if conversation.Permissions != "" {
		if err := json.Unmarshal([]byte(conversation.Permissions), &perms); err != nil {
			json.Unmarshal([]byte(DefaultGroupPermissions), &perms)
		}
	} else {
		json.Unmarshal([]byte(DefaultGroupPermissions), &perms)
	}

	allowedRole, ok := perms[action]
	if !ok {
		allowedRole = "admin"
	}

	switch allowedRole {
	case "all":
		return true, nil
	case "admin":
		return member.Role == "admin", nil
	default:
		return false, nil
	}
}

// SetMemberRole changes a member's role. Only the owner can set roles.
func (s *Service) SetMemberRole(ownerID, conversationID, targetUserID, role string) error {
	if role != "admin" && role != "member" {
		return errors.New("无效的角色")
	}

	conversation, err := s.getConversationForUser(ownerID, conversationID)
	if err != nil {
		return err
	}
	if conversation.Type != GroupConversationType {
		return errors.New("当前会话不是群聊")
	}

	owner, err := s.memberRecord(ownerID, conversationID)
	if err != nil {
		return err
	}
	if owner == nil || owner.Role != "owner" {
		return errors.New("只有群主可以设置管理员")
	}

	if targetUserID == ownerID {
		return errors.New("不能修改自己的角色")
	}

	target, err := s.memberRecord(targetUserID, conversationID)
	if err != nil {
		return err
	}
	if target == nil {
		return errors.New("目标用户不在该群聊中")
	}

	return s.db.Model(&ConversationMember{}).
		Where("conversation_id = ? AND user_id = ?", conversationID, targetUserID).
		Update("role", role).Error
}

// TransferOwner transfers group ownership from the current owner to another member.
func (s *Service) TransferOwner(currentOwnerID, conversationID, newOwnerID string) error {
	conversation, err := s.getConversationForUser(currentOwnerID, conversationID)
	if err != nil {
		return err
	}
	if conversation.Type != GroupConversationType {
		return errors.New("当前会话不是群聊")
	}

	currentOwner, err := s.memberRecord(currentOwnerID, conversationID)
	if err != nil {
		return err
	}
	if currentOwner == nil || currentOwner.Role != "owner" {
		return errors.New("只有群主可以转让群主身份")
	}

	if newOwnerID == currentOwnerID {
		return errors.New("不能转让给自己")
	}

	newOwner, err := s.memberRecord(newOwnerID, conversationID)
	if err != nil {
		return err
	}
	if newOwner == nil {
		return errors.New("目标用户不在该群聊中")
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&ConversationMember{}).
			Where("conversation_id = ? AND user_id = ?", conversationID, currentOwnerID).
			Update("role", "admin").Error; err != nil {
			return err
		}
		if err := tx.Model(&ConversationMember{}).
			Where("conversation_id = ? AND user_id = ?", conversationID, newOwnerID).
			Update("role", "owner").Error; err != nil {
			return err
		}
		return nil
	})
}

// MuteMember mutes a member for a specified duration. Only owner/admin can mute.
func (s *Service) MuteMember(operatorID, conversationID, targetUserID string, duration time.Duration) error {
	conversation, err := s.getConversationForUser(operatorID, conversationID)
	if err != nil {
		return err
	}
	if conversation.Type != GroupConversationType {
		return errors.New("当前会话不是群聊")
	}

	operator, err := s.memberRecord(operatorID, conversationID)
	if err != nil {
		return err
	}
	if operator == nil || (operator.Role != "owner" && operator.Role != "admin") {
		return errors.New("只有管理员可以禁言成员")
	}

	if targetUserID == operatorID {
		return errors.New("不能禁言自己")
	}

	target, err := s.memberRecord(targetUserID, conversationID)
	if err != nil {
		return err
	}
	if target == nil {
		return errors.New("目标用户不在该群聊中")
	}
	if target.Role == "owner" {
		return errors.New("不能禁言群主")
	}
	if target.Role == "admin" && operator.Role != "owner" {
		return errors.New("管理员不能禁言其他管理员")
	}

	mutedUntil := time.Now().Add(duration)
	return s.db.Model(&ConversationMember{}).
		Where("conversation_id = ? AND user_id = ?", conversationID, targetUserID).
		Update("muted_until", mutedUntil).Error
}

// UnmuteMember removes a member's mute. Only owner/admin can unmute.
func (s *Service) UnmuteMember(operatorID, conversationID, targetUserID string) error {
	conversation, err := s.getConversationForUser(operatorID, conversationID)
	if err != nil {
		return err
	}
	if conversation.Type != GroupConversationType {
		return errors.New("当前会话不是群聊")
	}

	operator, err := s.memberRecord(operatorID, conversationID)
	if err != nil {
		return err
	}
	if operator == nil || (operator.Role != "owner" && operator.Role != "admin") {
		return errors.New("只有管理员可以解除禁言")
	}

	target, err := s.memberRecord(targetUserID, conversationID)
	if err != nil {
		return err
	}
	if target == nil {
		return errors.New("目标用户不在该群聊中")
	}

	pastTime := time.Now().Add(-time.Hour)
	return s.db.Model(&ConversationMember{}).
		Where("conversation_id = ? AND user_id = ?", conversationID, targetUserID).
		Update("muted_until", pastTime).Error
}

// IsMemberMuted checks if a member is currently muted in a group conversation.
func (s *Service) IsMemberMuted(userID, conversationID string) (bool, error) {
	member, err := s.memberRecord(userID, conversationID)
	if err != nil {
		return false, err
	}
	if member == nil {
		return false, errors.New("当前用户不在该群聊中")
	}

	if member.MutedUntil != nil && member.MutedUntil.After(time.Now()) {
		return true, nil
	}

	if member.Role == "member" {
		var conversation Conversation
		if err := s.db.Where("id = ?", conversationID).First(&conversation).Error; err != nil {
			return false, err
		}
		perms := make(map[string]any)
		if conversation.Permissions != "" {
			if err := json.Unmarshal([]byte(conversation.Permissions), &perms); err == nil {
				if muteAll, ok := perms["mute_all"].(bool); ok && muteAll {
					return true, nil
				}
			}
		}
	}

	return false, nil
}

// GetGroupPermissions returns the permissions JSON for a group conversation.
func (s *Service) GetGroupPermissions(userID, conversationID string) (map[string]any, error) {
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return nil, err
	}
	if conversation.Type != GroupConversationType {
		return nil, errors.New("当前会话不是群聊")
	}

	perms := make(map[string]any)
	if conversation.Permissions != "" {
		if err := json.Unmarshal([]byte(conversation.Permissions), &perms); err != nil {
			json.Unmarshal([]byte(DefaultGroupPermissions), &perms)
		}
	} else {
		json.Unmarshal([]byte(DefaultGroupPermissions), &perms)
	}
	return perms, nil
}

// UpdateGroupPermissions updates the permissions JSON for a group conversation. Only owner can update.
func (s *Service) UpdateGroupPermissions(ownerID, conversationID string, perms map[string]any) error {
	conversation, err := s.getConversationForUser(ownerID, conversationID)
	if err != nil {
		return err
	}
	if conversation.Type != GroupConversationType {
		return errors.New("当前会话不是群聊")
	}

	member, err := s.memberRecord(ownerID, conversationID)
	if err != nil {
		return err
	}
	if member == nil || member.Role != "owner" {
		return errors.New("只有群主可以修改权限设置")
	}

	data, err := json.Marshal(perms)
	if err != nil {
		return err
	}

	return s.db.Model(&Conversation{}).
		Where("id = ?", conversationID).
		Updates(map[string]any{"permissions": string(data), "updated_at": time.Now()}).Error
}
