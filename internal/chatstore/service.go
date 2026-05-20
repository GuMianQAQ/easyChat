package chatstore

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"mime/multipart"
	"os"
	"path"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"easyChat/internal/auth"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	SystemConversationID  = "system"
	GroupConversationType = "group"
	MaxUploadBytes        = 2 * 1024 * 1024
)

type Conversation struct {
	ID           string `gorm:"primaryKey"`
	Type         string `gorm:"index;size:16;not null"`
	Name         string `gorm:"size:64;not null"`
	Avatar       string `gorm:"type:text"`
	Announcement string `gorm:"type:text"`
	CreatedBy    string `gorm:"index;size:64"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type ConversationMember struct {
	ID             string `gorm:"primaryKey"`
	ConversationID string `gorm:"index:idx_member_conversation_user,unique;size:64;not null"`
	UserID         string `gorm:"index:idx_member_conversation_user,unique;size:64;not null"`
	Role           string `gorm:"size:16;not null"`
	GroupNickname  string `gorm:"size:64"`
	Remark         string `gorm:"size:64"`
	JoinedAt       time.Time
	IsPinned       bool `gorm:"default:false"`
	IsMuted        bool `gorm:"default:false"`
	HiddenAt       *time.Time
	ClearedAt      *time.Time
	LastReadAt     *time.Time
}

type Message struct {
	ID             string    `gorm:"primaryKey"`
	ConversationID string    `gorm:"index;size:64;not null"`
	SenderID       string    `gorm:"index;size:64;not null"`
	SenderName     string    `gorm:"size:64;not null"`
	SenderAvatar   string    `gorm:"type:text"`
	MessageType    string    `gorm:"size:16;not null"`
	Content        string    `gorm:"type:text;not null"`
	QuoteID        *string   `gorm:"index"`
	Revoked        bool      `gorm:"default:false"`
	CreatedAt      time.Time `gorm:"index"`
}

type Favorite struct {
	ID               string `gorm:"primaryKey"`
	UserID           string `gorm:"index:idx_favorite_user_message,unique;size:64;not null"`
	MessageID        string `gorm:"index:idx_favorite_user_message,unique;size:64;not null"`
	ConversationID   string `gorm:"index;size:64;not null"`
	ConversationName string `gorm:"size:128"`
	MessageType      string `gorm:"size:16;not null"`
	Content          string `gorm:"type:text;not null"`
	QuoteContent     string `gorm:"type:text"`
	QuoteMessageType string `gorm:"size:16"`
	SenderID         string `gorm:"size:64;not null"`
	SenderName       string `gorm:"size:64;not null"`
	SenderAvatar     string `gorm:"type:text"`
	MessageCreatedAt time.Time
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type UploadedFile struct {
	ID        string `gorm:"primaryKey"`
	UserID    string `gorm:"index;size:64;not null"`
	FileName  string `gorm:"size:255;not null"`
	FileURL   string `gorm:"type:text;not null"`
	FileSize  int64  `gorm:"not null"`
	MimeType  string `gorm:"size:128;not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type FilePayload struct {
	ID               string `json:"id"`
	UserID           string `json:"userId"`
	FileName         string `json:"fileName"`
	FileURL          string `json:"fileUrl"`
	FileSize         int64  `json:"fileSize"`
	MimeType         string `json:"mimeType"`
	FileKind         string `json:"fileKind"`
	MessageCreatedAt string `json:"messageCreatedAt"`
	CreatedAt        string `json:"createdAt"`
}

type QuotePayload struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	Content     string `json:"content"`
	MessageType string `json:"messageType"`
	Time        string `json:"time"`
}

type MessagePayload struct {
	ID             string        `json:"id"`
	ConversationID string        `json:"conversationId"`
	MessageScope   string        `json:"messageScope"`
	Type           string        `json:"type"`
	MessageType    string        `json:"messageType"`
	SenderID       string        `json:"senderId"`
	SenderName     string        `json:"senderName"`
	TargetUserID   string        `json:"targetUserId,omitempty"`
	TargetName     string        `json:"targetName,omitempty"`
	Content        string        `json:"content"`
	CreatedAt      string        `json:"createdAt"`
	OnlineCount    int           `json:"onlineCount"`
	Avatar         string        `json:"avatar"`
	Quote          *QuotePayload `json:"quote,omitempty"`
	Revoked        bool          `json:"revoked,omitempty"`
}

type ConversationSummary struct {
	ID              string `json:"id"`
	Type            string `json:"type"`
	Name            string `json:"name"`
	Avatar          string `json:"avatar"`
	Announcement    string `json:"announcement,omitempty"`
	MemberCount     int    `json:"memberCount,omitempty"`
	LastMessage     string `json:"lastMessage"`
	LastMessageType string `json:"lastMessageType"`
	LastMessageTime string `json:"lastMessageTime"`
	UnreadCount     int    `json:"unreadCount"`
	Pinned          bool   `json:"pinned"`
	Muted           bool   `json:"muted"`
	TargetUserID    string `json:"targetUserId,omitempty"`
	TargetUsername  string `json:"targetUsername,omitempty"`
	TargetNickname  string `json:"targetNickname,omitempty"`
	TargetAvatar    string `json:"targetAvatar,omitempty"`
	TargetName      string `json:"targetName,omitempty"`
}

type GroupMemberPayload struct {
	UserID        string `json:"userId"`
	Username      string `json:"username"`
	Nickname      string `json:"nickname"`
	Avatar        string `json:"avatar"`
	Role          string `json:"role"`
	GroupNickname string `json:"groupNickname"`
}

type GroupConversationPayload struct {
	ID           string               `json:"id"`
	Type         string               `json:"type"`
	Name         string               `json:"name"`
	Avatar       string               `json:"avatar"`
	Announcement string               `json:"announcement"`
	MyNickname   string               `json:"myNickname"`
	IsMuted      bool                 `json:"isMuted"`
	MemberCount  int                  `json:"memberCount"`
	Members      []GroupMemberPayload `json:"members"`
}

type CreateGroupConversationInput struct {
	Name      string   `json:"name"`
	MemberIDs []string `json:"memberIds"`
}

type UpdateGroupConversationRequest struct {
	Name         *string `json:"name,omitempty"`
	Announcement *string `json:"announcement,omitempty"`
	MyNickname   *string `json:"myNickname,omitempty"`
	IsMuted      *bool   `json:"isMuted,omitempty"`
}

type FavoritePayload struct {
	ID               string `json:"id"`
	MessageID        string `json:"messageId"`
	ConversationID   string `json:"conversationId"`
	ConversationName string `json:"conversationName"`
	MessageType      string `json:"messageType"`
	Content          string `json:"content"`
	QuoteContent     string `json:"quoteContent"`
	QuoteMessageType string `json:"quoteMessageType"`
	SenderID         string `json:"senderId"`
	SenderName       string `json:"senderName"`
	SenderAvatar     string `json:"senderAvatar"`
	MessageCreatedAt string `json:"messageCreatedAt"`
	CreatedAt        string `json:"createdAt"`
}

type MessagePage struct {
	Items    []MessagePayload `json:"items"`
	Page     int              `json:"page"`
	PageSize int              `json:"pageSize"`
	HasMore  bool             `json:"hasMore"`
}

type PersistMessageInput struct {
	ID             string
	ConversationID string
	MessageScope   string
	MessageType    string
	TargetUserID   string
	TargetName     string
	Content        string
	Quote          *QuotePayload
}

type RevokeResult struct {
	Message      MessagePayload
	TargetUserID string
}

type Service struct {
	db         *gorm.DB
	uploadsDir string
}

func NewService(dbPath, uploadsDir string) (*Service, error) {
	if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
		return nil, err
	}
	if err := os.MkdirAll(uploadsDir, 0o755); err != nil {
		return nil, err
	}

	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	if err := db.AutoMigrate(&auth.User{}, &Conversation{}, &ConversationMember{}, &Message{}, &Favorite{}, &UploadedFile{}); err != nil {
		return nil, err
	}

	service := &Service{db: db, uploadsDir: uploadsDir}
	if err := service.cleanupLegacyPublicConversation(); err != nil {
		return nil, err
	}
	if err := service.ensureBaseConversations(); err != nil {
		return nil, err
	}
	return service, nil
}

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
		return ConversationSummary{}, errors.New("缺少用户信息")
	}
	if currentUserID == targetUserID {
		return ConversationSummary{}, errors.New("不能和自己创建私聊")
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
				ID:             newID("member"),
				ConversationID: conversationID,
				UserID:         currentUserID,
				Role:           "member",
				JoinedAt:       now,
			},
			{
				ID:             newID("member"),
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
		return ConversationSummary{}, errors.New("缺少用户信息")
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
		return ConversationSummary{}, errors.New("请至少选择一个好友")
	}
	if name == "" {
		name = "群聊"
	}

	now := time.Now()
	conversationID := newID("group")
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
			ID:             newID("member"),
			ConversationID: conversationID,
			UserID:         creatorID,
			Role:           "owner",
			JoinedAt:       now,
		})
		for _, memberID := range unique {
			members = append(members, ConversationMember{
				ID:             newID("member"),
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

func (s *Service) GetGroupConversation(userID, conversationID string) (GroupConversationPayload, error) {
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return GroupConversationPayload{}, err
	}
	if conversation.Type != GroupConversationType {
		return GroupConversationPayload{}, errors.New("不是群聊")
	}
	member, err := s.memberRecord(userID, conversationID)
	if err != nil {
		return GroupConversationPayload{}, err
	}
	if member == nil {
		return GroupConversationPayload{}, errors.New("会话成员不存在")
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
		ID:           conversation.ID,
		Type:         conversation.Type,
		Name:         conversation.Name,
		Avatar:       conversation.Avatar,
		Announcement: conversation.Announcement,
		MyNickname:   member.GroupNickname,
		IsMuted:      member.IsMuted,
		MemberCount:  len(items),
		Members:      items,
	}, nil
}

func (s *Service) UpdateGroupConversation(userID, conversationID string, input UpdateGroupConversationRequest) (GroupConversationPayload, error) {
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return GroupConversationPayload{}, err
	}
	if conversation.Type != GroupConversationType {
		return GroupConversationPayload{}, errors.New("不是群聊")
	}
	member, err := s.memberRecord(userID, conversationID)
	if err != nil {
		return GroupConversationPayload{}, err
	}
	if member == nil {
		return GroupConversationPayload{}, errors.New("会话成员不存在")
	}

	if (input.Name != nil || input.Announcement != nil) && member.Role != "owner" {
		return GroupConversationPayload{}, errors.New("鍙湁缇ゅ繀闇€涓荤鍙互淇敼缇ょ粍淇℃伅")
	}

	updates := map[string]any{}
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
		return nil, errors.New("不支持的会话类型")
	}
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
		SenderName:     user.Nickname,
		SenderAvatar:   user.Avatar,
		MessageType:    input.MessageType,
		Content:        input.Content,
		QuoteID:        quoteID,
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

func (s *Service) RevokeMessage(user auth.PublicUser, messageID, conversationID string) (RevokeResult, error) {
	if strings.TrimSpace(messageID) == "" {
		return RevokeResult{}, errors.New("缺少消息 ID")
	}
	conversation, err := s.getConversationForUser(user.ID, conversationID)
	if err != nil {
		return RevokeResult{}, err
	}

	var record Message
	if err := s.db.Where("id = ? AND conversation_id = ?", messageID, conversationID).First(&record).Error; err != nil {
		return RevokeResult{}, errors.New("消息不存在")
	}
	if record.SenderID != user.ID {
		return RevokeResult{}, errors.New("不能撤回别人的消息")
	}
	if record.Revoked {
		return RevokeResult{}, errors.New("消息已撤回")
	}
	if time.Since(record.CreatedAt) > 2*time.Minute {
		return RevokeResult{}, errors.New("超过可撤回时间")
	}
	if err := s.db.Model(&record).Update("revoked", true).Error; err != nil {
		return RevokeResult{}, err
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
			SenderName:     user.Nickname,
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
		ID:               newID("fav"),
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

func (s *Service) StoreUpload(file *multipart.FileHeader) (string, error) {
	if file == nil {
		return "", errors.New("缺少图片")
	}
	if file.Size > MaxUploadBytes {
		return "", errors.New("图片超过 2MB")
	}
	if !strings.HasPrefix(file.Header.Get("Content-Type"), "image/") {
		return "", errors.New("仅支持图片")
	}

	extension := strings.ToLower(filepath.Ext(file.Filename))
	if extension == "" {
		extension = ".png"
	}
	targetPath := filepath.Join(s.uploadsDir, newID("upload")+extension)

	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	dst, err := os.Create(targetPath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	if _, err := dst.ReadFrom(src); err != nil {
		return "", err
	}
	return "/uploads/" + filepath.Base(targetPath), nil
}

func (s *Service) StoreGenericUpload(user auth.PublicUser, file *multipart.FileHeader) (FilePayload, error) {
	if file == nil {
		return FilePayload{}, errors.New("请上传文件")
	}
	if file.Size > 10*1024*1024 {
		return FilePayload{}, errors.New("文件超过 10MB")
	}

	extension := strings.ToLower(filepath.Ext(file.Filename))
	if extension == "" {
		extension = ".bin"
	}
	targetPath := filepath.Join(s.uploadsDir, "files", newID("file")+extension)
	if err := os.MkdirAll(filepath.Dir(targetPath), 0o755); err != nil {
		return FilePayload{}, err
	}

	src, err := file.Open()
	if err != nil {
		return FilePayload{}, err
	}
	defer src.Close()

	dst, err := os.Create(targetPath)
	if err != nil {
		return FilePayload{}, err
	}
	defer dst.Close()

	if _, err := dst.ReadFrom(src); err != nil {
		return FilePayload{}, err
	}

	now := time.Now()
	record := UploadedFile{
		ID:        newID("file"),
		UserID:    user.ID,
		FileName:  file.Filename,
		FileURL:   "/" + filepath.ToSlash(filepath.Join("uploads", "files", filepath.Base(targetPath))),
		FileSize:  file.Size,
		MimeType:  file.Header.Get("Content-Type"),
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := s.db.Create(&record).Error; err != nil {
		return FilePayload{}, err
	}
	return filePayload(record), nil
}

func (s *Service) ListFiles(userID, kind, keyword string) ([]FilePayload, error) {
	kind = strings.TrimSpace(kind)
	keyword = strings.TrimSpace(keyword)

	query := s.db.Where("user_id = ?", userID)
	if keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where("file_name LIKE ?", like)
	}

	var records []UploadedFile
	if err := query.Order("created_at desc").Find(&records).Error; err != nil {
		return nil, err
	}

	items := make([]FilePayload, 0, len(records))
	for _, record := range records {
		payload := filePayload(record)
		if kind != "" && kind != "all" && payload.FileKind != kind {
			continue
		}
		items = append(items, payload)
	}
	return items, nil
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
		return MessagePage{}, errors.New("消息不存在")
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
	if err := query.Order("created_at asc, id asc").Find(&records).Error; err != nil {
		return MessagePage{}, err
	}

	index := -1
	for i, record := range records {
		if record.ID == target.ID {
			index = i
			break
		}
	}
	if index < 0 {
		return MessagePage{}, errors.New("消息不存在")
	}

	half := limit / 2
	start := index - half
	if start < 0 {
		start = 0
	}
	end := start + limit
	if end > len(records) {
		end = len(records)
		start = end - limit
		if start < 0 {
			start = 0
		}
	}

	window := records[start:end]
	items, err := s.buildMessages(userID, window)
	if err != nil {
		return MessagePage{}, err
	}
	return MessagePage{
		Items:    items,
		Page:     1,
		PageSize: limit,
		HasMore:  start > 0 || end < len(records),
	}, nil
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
		return Conversation{}, errors.New("会话类型不匹配")
	}
	if conversation.Type != "private" && conversation.Type != GroupConversationType && conversation.Type != "system" {
		return Conversation{}, errors.New("不支持的会话类型")
	}
	return conversation, nil
}

func filePayload(record UploadedFile) FilePayload {
	kind := fileKind(record.FileName, record.MimeType)
	createdAt := formatTime(record.CreatedAt)
	return FilePayload{
		ID:               record.ID,
		UserID:           record.UserID,
		FileName:         record.FileName,
		FileURL:          record.FileURL,
		FileSize:         record.FileSize,
		MimeType:         record.MimeType,
		FileKind:         kind,
		MessageCreatedAt: createdAt,
		CreatedAt:        createdAt,
	}
}

func fileKind(fileName, mimeType string) string {
	lowerName := strings.ToLower(fileName)
	lowerType := strings.ToLower(mimeType)
	if strings.HasPrefix(lowerType, "image/") || strings.HasSuffix(lowerName, ".png") || strings.HasSuffix(lowerName, ".jpg") || strings.HasSuffix(lowerName, ".jpeg") || strings.HasSuffix(lowerName, ".gif") || strings.HasSuffix(lowerName, ".webp") {
		return "image"
	}
	if strings.HasSuffix(lowerName, ".zip") || strings.HasSuffix(lowerName, ".rar") || strings.HasSuffix(lowerName, ".7z") || strings.HasSuffix(lowerName, ".tar") || strings.HasSuffix(lowerName, ".gz") {
		return "archive"
	}
	if strings.HasSuffix(lowerName, ".doc") || strings.HasSuffix(lowerName, ".docx") || strings.HasSuffix(lowerName, ".xls") || strings.HasSuffix(lowerName, ".xlsx") || strings.HasSuffix(lowerName, ".pdf") || strings.HasSuffix(lowerName, ".txt") || strings.HasSuffix(lowerName, ".md") {
		return "document"
	}
	return "other"
}

func (s *Service) getConversationForUser(userID, conversationID string) (Conversation, error) {
	if strings.TrimSpace(conversationID) == "" {
		return Conversation{}, errors.New("缺少会话")
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
	}

	if conversation.Type == "private" {
		target, err := s.privatePartner(record.ConversationID, currentUserID)
		if err == nil {
			message.TargetUserID = target.ID
			message.TargetName = target.Nickname
		}
	} else if conversation.Type == GroupConversationType && record.SenderID == currentUserID {
		if member, err := s.memberRecord(currentUserID, record.ConversationID); err == nil && member != nil && strings.TrimSpace(member.GroupNickname) != "" {
			message.SenderName = strings.TrimSpace(member.GroupNickname)
		}
	}
	return message
}

func (s *Service) buildConversationSummary(currentUserID string, conversation Conversation, member *ConversationMember) (ConversationSummary, error) {
	summary := ConversationSummary{
		ID:              conversation.ID,
		Type:            conversation.Type,
		Name:            conversation.Name,
		Avatar:          conversation.Avatar,
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
			lastMessage = fmt.Sprintf("%s：%s", record.SenderName, lastMessage)
		}
		summary.LastMessage = lastMessage
		summary.LastMessageType = record.MessageType
		summary.LastMessageTime = formatTime(record.CreatedAt)
	}
	return summary, nil
}

func (s *Service) privatePartner(conversationID, currentUserID string) (auth.User, error) {
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

func (s *Service) lookupUser(userID string) (auth.User, error) {
	var user auth.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return auth.User{}, err
	}
	return user, nil
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
		return nil, errors.New("会话成员不存在")
	}

	now := time.Now()
	record := ConversationMember{
		ID:             newID("member"),
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

func StablePrivateConversationID(leftUserID, rightUserID string) string {
	pair := []string{strings.TrimSpace(leftUserID), strings.TrimSpace(rightUserID)}
	slices.Sort(pair)
	return fmt.Sprintf("private:%s:%s", pair[0], pair[1])
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
			return "[鏂囦欢]"
		}
		return fmt.Sprintf("[鏂囦欢] %s", fileName)
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

func formatTime(value time.Time) string {
	return value.Format("2006-01-02 15:04:05")
}

func normalizeID(id string) string {
	id = strings.TrimSpace(id)
	if id == "" {
		return newID("msg")
	}
	return id
}

func newID(prefix string) string {
	var bytes [16]byte
	if _, err := rand.Read(bytes[:]); err == nil {
		return prefix + "-" + hex.EncodeToString(bytes[:])
	}
	return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
}
