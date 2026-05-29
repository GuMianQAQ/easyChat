package chatstore

import (
	"log"
	"os"
	"time"

	"gorm.io/gorm"
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
	BotEnabled   bool   `gorm:"not null;default:false"`
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
	CreatedBy       string `json:"createdBy,omitempty"`
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
	ID                  string               `json:"id"`
	Type                string               `json:"type"`
	Name                string               `json:"name"`
	Avatar              string               `json:"avatar"`
	Announcement        string               `json:"announcement"`
	Remark              string               `json:"remark"`
	MyNickname          string               `json:"myNickname"`
	MyRole              string               `json:"myRole"`
	CanEditGroupProfile bool                 `json:"canEditGroupProfile"`
	BotEnabled          bool                 `json:"botEnabled"`
	IsMuted             bool                 `json:"isMuted"`
	MemberCount         int                  `json:"memberCount"`
	Members             []GroupMemberPayload `json:"members"`
}

type CreateGroupConversationInput struct {
	Name      string   `json:"name"`
	MemberIDs []string `json:"memberIds"`
}

type UpdateGroupConversationRequest struct {
	Avatar       *string `json:"avatar,omitempty"`
	Name         *string `json:"name,omitempty"`
	Announcement *string `json:"announcement,omitempty"`
	Remark       *string `json:"remark,omitempty"`
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

func NewService(db *gorm.DB, uploadsDir string) (*Service, error) {
	if err := os.MkdirAll(uploadsDir, 0o755); err != nil {
		return nil, err
	}

	service := &Service{db: db, uploadsDir: uploadsDir}
	if err := service.cleanupLegacyPublicConversation(); err != nil {
		return nil, err
	}
	if err := service.cleanupAIFromPrivateConversations(); err != nil {
		log.Printf("warning: failed to cleanup AI from private conversations: %v", err)
	}
	if err := service.ensureBaseConversations(); err != nil {
		return nil, err
	}
	return service, nil
}
