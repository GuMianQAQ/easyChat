package chatstore

import (
	"encoding/json"
	"strings"
	"time"

	"easyChat/internal/auth"
	apperrors "easyChat/internal/errors"
	"easyChat/internal/uid"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const groupBotUserID = "ai-assistant"

func (s *Service) GetGroupConversation(userID, conversationID string) (GroupConversationPayload, error) {
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return GroupConversationPayload{}, err
	}
	if conversation.Type != GroupConversationType {
		return GroupConversationPayload{}, apperrors.ErrNotGroupConversation
	}
	member, err := s.memberRecord(userID, conversationID)
	if err != nil {
		return GroupConversationPayload{}, err
	}
	if member == nil {
		return GroupConversationPayload{}, apperrors.ErrUserNotInGroup
	}

	var records []ConversationMember
	if err := s.db.Where("conversation_id = ?", conversationID).Order("joined_at asc").Find(&records).Error; err != nil {
		return GroupConversationPayload{}, err
	}

	userIDs := make([]string, 0, len(records))
	for _, record := range records {
		userIDs = append(userIDs, record.UserID)
	}

	var users []auth.User
	if err := s.db.Where("id IN ?", userIDs).Find(&users).Error; err != nil {
		return GroupConversationPayload{}, err
	}

	userMap := make(map[string]auth.User, len(users))
	for _, user := range users {
		userMap[user.ID] = user
	}

	items := make([]GroupMemberPayload, 0, len(records))
	for _, record := range records {
		user, ok := userMap[record.UserID]
		if !ok {
			continue
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
		return GroupConversationPayload{}, apperrors.ErrNotGroupConversation
	}
	member, err := s.memberRecord(userID, conversationID)
	if err != nil {
		return GroupConversationPayload{}, err
	}
	if member == nil {
		return GroupConversationPayload{}, apperrors.ErrUserNotInGroup
	}

	if input.Avatar != nil {
		if allowed, err := s.CheckPermission(userID, conversationID, "who_can_change_avatar"); err != nil {
			return GroupConversationPayload{}, err
		} else if !allowed {
			return GroupConversationPayload{}, apperrors.ErrOnlyAdminCanChangeAvatar
		}
	}
	if input.Name != nil {
		if allowed, err := s.CheckPermission(userID, conversationID, "who_can_change_name"); err != nil {
			return GroupConversationPayload{}, err
		} else if !allowed {
			return GroupConversationPayload{}, apperrors.ErrOnlyAdminCanChangeName
		}
	}
	if input.Announcement != nil {
		if allowed, err := s.CheckPermission(userID, conversationID, "who_can_change_announcement"); err != nil {
			return GroupConversationPayload{}, err
		} else if !allowed {
			return GroupConversationPayload{}, apperrors.ErrOnlyAdminCanChangeAnnouncement
		}
	}

	updates := map[string]any{}
	if input.Avatar != nil {
		avatar := strings.TrimSpace(*input.Avatar)
		if avatar != "" && !strings.HasPrefix(avatar, "/uploads/") {
			return GroupConversationPayload{}, apperrors.ErrAvatarMustUseUploadURL
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
		return nil, apperrors.ErrBadRequest
	}
}

// GetConversationMemberIDs 返回指定会话的所有成员 ID，不需要当前用户权限校验。
func (s *Service) GetConversationMemberIDs(conversationID string) ([]string, error) {
	var members []ConversationMember
	if err := s.db.Where("conversation_id = ?", conversationID).Find(&members).Error; err != nil {
		return nil, err
	}
	ids := make([]string, 0, len(members))
	for _, m := range members {
		ids = append(ids, m.UserID)
	}
	return ids, nil
}

func (s *Service) LeaveGroupConversation(userID, conversationID string) error {
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return err
	}
	if conversation.Type != GroupConversationType {
		return apperrors.ErrNotGroupConversation
	}

	member, err := s.memberRecord(userID, conversationID)
	if err != nil {
		return err
	}
	if member == nil {
		return apperrors.ErrUserNotInGroup
	}
	if member.Role == "owner" {
		return apperrors.ErrUseDismissForOwner
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
			return apperrors.ErrUserNotInGroup
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
		return apperrors.ErrNotGroupConversation
	}

	member, err := s.memberRecord(userID, conversationID)
	if err != nil {
		return err
	}
	if member == nil {
		return apperrors.ErrUserNotInGroup
	}
	if member.Role != "owner" {
		return apperrors.ErrDismissGroupOwnerOnly
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
			return apperrors.ErrGroupNotFound
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
		return false, apperrors.ErrNotGroupConversation
	}
	return conversation.BotEnabled, nil
}

func (s *Service) SetGroupBotEnabled(userID, conversationID string, enabled bool) (GroupConversationPayload, error) {
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return GroupConversationPayload{}, err
	}
	if conversation.Type != GroupConversationType {
		return GroupConversationPayload{}, apperrors.ErrNotGroupConversation
	}
	member, err := s.memberRecord(userID, conversationID)
	if err != nil {
		return GroupConversationPayload{}, err
	}
	if member == nil {
		return GroupConversationPayload{}, apperrors.ErrUserNotInGroup
	}
	if member.Role != "owner" {
		return GroupConversationPayload{}, apperrors.ErrOnlyOwnerCanSetBot
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
		return false, apperrors.ErrNotGroupConversation
	}

	member, err := s.memberRecord(userID, conversationID)
	if err != nil {
		return false, err
	}
	if member == nil {
		return false, apperrors.ErrUserNotInGroup
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
		return apperrors.ErrInvalidRole
	}

	conversation, err := s.getConversationForUser(ownerID, conversationID)
	if err != nil {
		return err
	}
	if conversation.Type != GroupConversationType {
		return apperrors.ErrNotGroupConversation
	}

	owner, err := s.memberRecord(ownerID, conversationID)
	if err != nil {
		return err
	}
	if owner == nil || owner.Role != "owner" {
		return apperrors.ErrOnlyOwnerCanSetAdmin
	}

	if targetUserID == ownerID {
		return apperrors.ErrCannotModifySelfRole
	}

	target, err := s.memberRecord(targetUserID, conversationID)
	if err != nil {
		return err
	}
	if target == nil {
		return apperrors.ErrUserNotInGroup
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
		return apperrors.ErrNotGroupConversation
	}

	currentOwner, err := s.memberRecord(currentOwnerID, conversationID)
	if err != nil {
		return err
	}
	if currentOwner == nil || currentOwner.Role != "owner" {
		return apperrors.ErrOnlyOwnerCanTransfer
	}

	if newOwnerID == currentOwnerID {
		return apperrors.ErrCannotTransferToSelf
	}

	newOwner, err := s.memberRecord(newOwnerID, conversationID)
	if err != nil {
		return err
	}
	if newOwner == nil {
		return apperrors.ErrUserNotInGroup
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
		return apperrors.ErrNotGroupConversation
	}

	operator, err := s.memberRecord(operatorID, conversationID)
	if err != nil {
		return err
	}
	if operator == nil || (operator.Role != "owner" && operator.Role != "admin") {
		return apperrors.ErrOnlyAdminCanMute
	}

	if targetUserID == operatorID {
		return apperrors.ErrCannotMuteSelf
	}

	target, err := s.memberRecord(targetUserID, conversationID)
	if err != nil {
		return err
	}
	if target == nil {
		return apperrors.ErrUserNotInGroup
	}
	if target.Role == "owner" {
		return apperrors.ErrCannotMuteOwner
	}
	if target.Role == "admin" && operator.Role != "owner" {
		return apperrors.ErrAdminCannotMuteAdmin
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
		return apperrors.ErrNotGroupConversation
	}

	operator, err := s.memberRecord(operatorID, conversationID)
	if err != nil {
		return err
	}
	if operator == nil || (operator.Role != "owner" && operator.Role != "admin") {
		return apperrors.ErrOnlyAdminCanUnmute
	}

	target, err := s.memberRecord(targetUserID, conversationID)
	if err != nil {
		return err
	}
	if target == nil {
		return apperrors.ErrUserNotInGroup
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
		return false, apperrors.ErrUserNotInGroup
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
		return nil, apperrors.ErrNotGroupConversation
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
		return apperrors.ErrNotGroupConversation
	}

	member, err := s.memberRecord(ownerID, conversationID)
	if err != nil {
		return err
	}
	if member == nil || member.Role != "owner" {
		return apperrors.ErrOnlyOwnerCanModifyPerm
	}

	data, err := json.Marshal(perms)
	if err != nil {
		return err
	}

	return s.db.Model(&Conversation{}).
		Where("id = ?", conversationID).
		Updates(map[string]any{"permissions": string(data), "updated_at": time.Now()}).Error
}

// AddGroupMembers adds members to a group conversation. The inviter must be a group member.
// The invited users must be friends of the inviter.
func (s *Service) AddGroupMembers(inviterID, conversationID string, userIDs []string) ([]string, error) {
	inviterID = strings.TrimSpace(inviterID)
	conversationID = strings.TrimSpace(conversationID)

	if inviterID == "" || conversationID == "" {
		return nil, apperrors.ErrMissingRequiredParam
	}

	// Verify inviter is a group member
	inviterMember, err := s.memberRecord(inviterID, conversationID)
	if err != nil {
		return nil, err
	}
	if inviterMember == nil {
		return nil, apperrors.ErrNotInGroupConversation
	}

	// Get conversation
	var conversation Conversation
	if err := s.db.Where("id = ?", conversationID).First(&conversation).Error; err != nil {
		return nil, apperrors.ErrGroupNotFound
	}
	if conversation.Type != GroupConversationType {
		return nil, apperrors.ErrNotGroupConversation
	}

	// Filter and validate user IDs
	unique := make([]string, 0, len(userIDs))
	seen := map[string]struct{}{inviterID: {}}
	for _, userID := range userIDs {
		userID = strings.TrimSpace(userID)
		if userID == "" {
			continue
		}
		if _, ok := seen[userID]; ok {
			continue
		}
		seen[userID] = struct{}{}
		unique = append(unique, userID)
	}

	if len(unique) == 0 {
		return nil, apperrors.ErrSelectFriendsToInvite
	}

	// Add members in transaction
	now := time.Now()
	var addedNames []string
	err = s.db.Transaction(func(tx *gorm.DB) error {
		for _, userID := range unique {
			// Check if already a member
			var count int64
			if err := tx.Model(&ConversationMember{}).
				Where("conversation_id = ? AND user_id = ?", conversationID, userID).
				Count(&count).Error; err != nil {
				return err
			}
			if count > 0 {
				continue // Already a member, skip
			}

			// Look up user
			user, err := s.lookupUser(userID)
			if err != nil {
				continue // Skip invalid users
			}

			// Add member
			member := ConversationMember{
				ID:             uid.New("member"),
				ConversationID: conversationID,
				UserID:         userID,
				Role:           "member",
				JoinedAt:       now,
			}
			if err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "conversation_id"}, {Name: "user_id"}},
				DoNothing: true,
			}).Create(&member).Error; err != nil {
				return err
			}
			addedNames = append(addedNames, user.Nickname)
		}
		return nil
	})

	return addedNames, err
}
