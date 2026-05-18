package webchat

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"sync/atomic"
	"time"
	"unicode/utf8"
)

const (
	MessageTypeChat   = "chat"
	MessageTypeSystem = "system"
	MessageTypeUsers  = "users"
	MessageTypeError  = "error"
	MessageTypeRevoke = "revoke"

	ScopePublic  = "public"
	ScopePrivate = "private"
	ScopeSystem  = "system"

	ChatMessageText  = "text"
	ChatMessageImage = "image"

	MaxAvatarBytes = 256 * 1024
)

var messageSeq uint64

type Quote struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	Content     string `json:"content"`
	MessageType string `json:"messageType"`
	Time        string `json:"time"`
}

type Message struct {
	ID             string `json:"id"`
	MessageID      string `json:"messageId,omitempty"`
	ConversationID string `json:"conversationId"`
	MessageScope   string `json:"messageScope"`
	Type           string `json:"type"`
	MessageType    string `json:"messageType"`
	SenderID       string `json:"senderId"`
	SenderName     string `json:"senderName"`
	OperatorID     string `json:"operatorId,omitempty"`
	TargetUserID   string `json:"targetUserId,omitempty"`
	TargetName     string `json:"targetName,omitempty"`
	Content        string `json:"content"`
	CreatedAt      string `json:"createdAt"`
	RevokedAt      string `json:"revokedAt,omitempty"`
	OnlineCount    int    `json:"onlineCount"`
	Avatar         string `json:"avatar"`
	Quote          *Quote `json:"quote,omitempty"`
	Revoked        bool   `json:"revoked,omitempty"`
}

type ClientInput struct {
	ID             string `json:"id"`
	ConversationID string `json:"conversationId"`
	MessageScope   string `json:"messageScope"`
	Type           string `json:"type"`
	MessageType    string `json:"messageType"`
	TargetUserID   string `json:"targetUserId"`
	TargetName     string `json:"targetName"`
	Content        string `json:"content"`
	Avatar         string `json:"avatar"`
	Quote          *Quote `json:"quote"`
}

type ValidatedInput struct {
	ID             string
	ConversationID string
	MessageScope   string
	MessageType    string
	TargetUserID   string
	TargetName     string
	Content        string
	Quote          *Quote
}

func NowString() string {
	return time.Now().Format("2006-01-02 15:04:05")
}

func NewMessageID() string {
	seq := atomic.AddUint64(&messageSeq, 1)
	return fmt.Sprintf("msg-%d-%d", time.Now().UnixMilli(), seq)
}

func NormalizeMessageID(id string) string {
	id = strings.TrimSpace(id)
	if id == "" {
		return NewMessageID()
	}
	return id
}

func normalizeQuote(quote *Quote) *Quote {
	if quote == nil {
		return nil
	}

	id := strings.TrimSpace(quote.ID)
	if id == "" {
		return nil
	}

	content := strings.TrimSpace(quote.Content)
	if utf8.RuneCountInString(content) > 80 {
		content = string([]rune(content)[:80])
	}

	messageType := strings.TrimSpace(quote.MessageType)
	if messageType != ChatMessageImage {
		messageType = ChatMessageText
	}

	return &Quote{
		ID:          id,
		Username:    strings.TrimSpace(quote.Username),
		Content:     content,
		MessageType: messageType,
		Time:        strings.TrimSpace(quote.Time),
	}
}

func NewRevokeMessage(id, conversationID, messageScope, senderID, senderName, targetUserID string, onlineCount int) Message {
	now := NowString()
	return Message{
		ID:             strings.TrimSpace(id),
		MessageID:      strings.TrimSpace(id),
		ConversationID: strings.TrimSpace(conversationID),
		MessageScope:   messageScope,
		Type:           MessageTypeRevoke,
		MessageType:    ChatMessageText,
		SenderID:       strings.TrimSpace(senderID),
		SenderName:     strings.TrimSpace(senderName),
		OperatorID:     strings.TrimSpace(senderID),
		TargetUserID:   strings.TrimSpace(targetUserID),
		CreatedAt:      now,
		RevokedAt:      now,
		OnlineCount:    onlineCount,
	}
}

func NewPublicSystemMessage(content string, onlineCount int) Message {
	return Message{
		ID:             NewMessageID(),
		ConversationID: "public",
		MessageScope:   ScopePublic,
		Type:           MessageTypeSystem,
		MessageType:    ChatMessageText,
		Content:        content,
		CreatedAt:      NowString(),
		OnlineCount:    onlineCount,
	}
}

func NewUsersMessage(onlineCount int) Message {
	return Message{
		ID:             NewMessageID(),
		ConversationID: "system",
		MessageScope:   ScopeSystem,
		Type:           MessageTypeUsers,
		MessageType:    ChatMessageText,
		Content:        fmt.Sprintf("在线 %d 人", onlineCount),
		CreatedAt:      NowString(),
		OnlineCount:    onlineCount,
	}
}

func NewErrorMessage(content string, onlineCount int) Message {
	return Message{
		ID:             NewMessageID(),
		ConversationID: "system",
		MessageScope:   ScopeSystem,
		Type:           MessageTypeError,
		MessageType:    ChatMessageText,
		Content:        content,
		CreatedAt:      NowString(),
		OnlineCount:    onlineCount,
	}
}

func MarshalMessage(message Message) ([]byte, error) {
	return json.Marshal(message)
}

func ValidateInput(input ClientInput) (*ValidatedInput, error) {
	id := NormalizeMessageID(input.ID)
	conversationID := strings.TrimSpace(input.ConversationID)
	messageScope := strings.TrimSpace(input.MessageScope)
	targetUserID := strings.TrimSpace(input.TargetUserID)
	targetName := strings.TrimSpace(input.TargetName)

	if messageScope != ScopePrivate {
		messageScope = ScopePublic
	}

	if conversationID == "" {
		if messageScope == ScopePrivate {
			return nil, fmt.Errorf("缺少会话 ID")
		}
		conversationID = "public"
	}

	if messageScope == ScopePrivate && targetUserID == "" {
		return nil, fmt.Errorf("缺少目标用户")
	}

	if _, err := validateAvatarDataURL(strings.TrimSpace(input.Avatar), true); err != nil {
		return nil, err
	}

	switch strings.TrimSpace(input.MessageType) {
	case ChatMessageText:
		content, err := ValidateContent(input.Content)
		if err != nil {
			return nil, err
		}
		return &ValidatedInput{
			ID:             id,
			ConversationID: conversationID,
			MessageScope:   messageScope,
			MessageType:    ChatMessageText,
			TargetUserID:   targetUserID,
			TargetName:     targetName,
			Content:        content,
			Quote:          normalizeQuote(input.Quote),
		}, nil
	case ChatMessageImage:
		content, err := validateImageURL(strings.TrimSpace(input.Content))
		if err != nil {
			return nil, err
		}
		return &ValidatedInput{
			ID:             id,
			ConversationID: conversationID,
			MessageScope:   messageScope,
			MessageType:    ChatMessageImage,
			TargetUserID:   targetUserID,
			TargetName:     targetName,
			Content:        content,
			Quote:          normalizeQuote(input.Quote),
		}, nil
	default:
		return nil, fmt.Errorf("不支持的消息类型")
	}
}

func ValidateContent(content string) (string, error) {
	trimmed := strings.TrimSpace(content)
	if trimmed == "" {
		return "", fmt.Errorf("消息不能为空")
	}
	if count := utf8.RuneCountInString(trimmed); count < 1 || count > 500 {
		return "", fmt.Errorf("消息最多 500 个字符")
	}
	return trimmed, nil
}

func validateImageURL(value string) (string, error) {
	if value == "" {
		return "", fmt.Errorf("图片不能为空")
	}
	if len(value) > 2048 {
		return "", fmt.Errorf("图片内容无效")
	}
	if !strings.HasPrefix(value, "/uploads/") {
		return "", fmt.Errorf("图片未上传")
	}
	return value, nil
}

func validateAvatarDataURL(dataURL string, allowEmpty bool) (string, error) {
	if dataURL == "" && allowEmpty {
		return "", nil
	}
	if dataURL == "" {
		return "", fmt.Errorf("头像不能为空")
	}
	const prefix = "data:image/"
	if !strings.HasPrefix(dataURL, prefix) {
		return "", fmt.Errorf("头像格式不正确")
	}
	parts := strings.SplitN(dataURL, ",", 2)
	if len(parts) != 2 {
		return "", fmt.Errorf("头像格式不正确")
	}
	decoded, err := base64.StdEncoding.DecodeString(parts[1])
	if err != nil {
		return "", fmt.Errorf("头像数据无效")
	}
	if len(decoded) > MaxAvatarBytes {
		return "", fmt.Errorf("头像不能超过 256KB")
	}
	return dataURL, nil
}
