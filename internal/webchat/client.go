package webchat

import (
	"encoding/json"
	"log"
	"strings"
	"time"

	"easyChat/internal/auth"
	"easyChat/internal/chatstore"
	"easyChat/internal/social"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = pongWait * 9 / 10
	maxMessageSize = 2 * 1024 * 1024
)

type Client struct {
	hub      *Hub
	store    *chatstore.Service
	social   *social.Service
	conn     *websocket.Conn
	send     chan []byte
	UserID   string
	Username string
	Nickname string
	Avatar   string
}

func NewClient(hub *Hub, store *chatstore.Service, socialService *social.Service, conn *websocket.Conn, user auth.PublicUser) *Client {
	return &Client{
		hub:      hub,
		store:    store,
		social:   socialService,
		conn:     conn,
		send:     make(chan []byte, 64),
		UserID:   strings.TrimSpace(user.ID),
		Username: strings.TrimSpace(user.Username),
		Nickname: strings.TrimSpace(user.Nickname),
		Avatar:   strings.TrimSpace(user.Avatar),
	}
}

func payloadQuoteToStore(quote *Quote) *chatstore.QuotePayload {
	if quote == nil {
		return nil
	}
	return &chatstore.QuotePayload{
		ID:          quote.ID,
		Username:    quote.Username,
		Content:     quote.Content,
		MessageType: quote.MessageType,
		Time:        quote.Time,
	}
}

func payloadQuoteToWire(quote *chatstore.QuotePayload) *Quote {
	if quote == nil {
		return nil
	}
	return &Quote{
		ID:          quote.ID,
		Username:    quote.Username,
		Content:     quote.Content,
		MessageType: quote.MessageType,
		Time:        quote.Time,
	}
}

func payloadToWire(message chatstore.MessagePayload) Message {
	wire := Message{
		ID:             message.ID,
		ConversationID: message.ConversationID,
		MessageScope:   message.MessageScope,
		Type:           message.Type,
		MessageType:    message.MessageType,
		SenderID:       message.SenderID,
		SenderName:     message.SenderName,
		OperatorID:     message.SenderID,
		TargetUserID:   message.TargetUserID,
		TargetName:     message.TargetName,
		Content:        message.Content,
		CreatedAt:      message.CreatedAt,
		OnlineCount:    message.OnlineCount,
		Avatar:         message.Avatar,
		Quote:          payloadQuoteToWire(message.Quote),
		Revoked:        message.Revoked,
	}
	if message.Type == MessageTypeRevoke {
		wire.MessageID = message.ID
		wire.OperatorID = message.SenderID
		wire.RevokedAt = message.CreatedAt
	}
	return wire
}

func (c *Client) Start() {
	go c.writePump()
	c.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.hub.Unregister(c)
		_ = c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	currentUser := auth.PublicUser{
		ID:       c.UserID,
		Username: c.Username,
		Nickname: c.Nickname,
		Avatar:   c.Avatar,
	}

	for {
		_, raw, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("websocket read failed: %v", err)
			}
			return
		}

		var input ClientInput
		if err := json.Unmarshal(raw, &input); err != nil {
			log.Printf("websocket json parse failed: %v", err)
			c.sendError("消息格式错误")
			continue
		}

		switch strings.TrimSpace(input.Type) {
		case MessageTypeChat:
			validated, err := ValidateInput(input)
			if err != nil {
				c.sendError(err.Error())
				continue
			}
			if validated.MessageScope == ScopePrivate {
				targetUserID, err := privateTargetUserID(validated.ConversationID, c.UserID)
				if err != nil {
					c.sendError(err.Error())
					continue
				}
				if err := c.social.CanSendPrivateMessage(c.UserID, targetUserID); err != nil {
					c.sendError(err.Error())
					continue
				}
			}

			message, err := c.store.SaveMessage(currentUser, chatstore.PersistMessageInput{
				ID:             validated.ID,
				ConversationID: validated.ConversationID,
				MessageScope:   validated.MessageScope,
				MessageType:    validated.MessageType,
				TargetUserID:   validated.TargetUserID,
				TargetName:     validated.TargetName,
				Content:        validated.Content,
				Quote:          payloadQuoteToStore(validated.Quote),
			})
			if err != nil {
				c.sendError(err.Error())
				continue
			}

			wireMessage := payloadToWire(message)
			if wireMessage.MessageScope == ScopePrivate {
				c.hub.BroadcastPrivate(wireMessage, c.UserID, wireMessage.TargetUserID)
				continue
			}
			c.hub.Broadcast(wireMessage)
		case MessageTypeRevoke:
			result, err := c.store.RevokeMessage(
				currentUser,
				strings.TrimSpace(input.ID),
				strings.TrimSpace(input.ConversationID),
			)
			if err != nil {
				c.sendError(err.Error())
				continue
			}
			wireMessage := payloadToWire(result.Message)
			if wireMessage.MessageScope == ScopePrivate && result.TargetUserID != "" {
				c.hub.BroadcastPrivate(wireMessage, c.UserID, result.TargetUserID)
				continue
			}
			c.hub.Broadcast(wireMessage)
		default:
			c.sendError("不支持的消息类型")
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			writer, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			if _, err := writer.Write(message); err != nil {
				_ = writer.Close()
				return
			}
			if err := writer.Close(); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) sendError(content string) {
	payload, err := MarshalMessage(NewErrorMessage(content, 0))
	if err != nil {
		return
	}

	select {
	case c.send <- payload:
	default:
	}
}

func privateTargetUserID(conversationID, currentUserID string) (string, error) {
	parts := strings.Split(strings.TrimSpace(conversationID), ":")
	if len(parts) != 3 || parts[0] != ScopePrivate {
		return "", nil
	}
	if parts[1] == currentUserID {
		return parts[2], nil
	}
	if parts[2] == currentUserID {
		return parts[1], nil
	}
	return "", nil
}
