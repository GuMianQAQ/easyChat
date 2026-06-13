package webchat

import (
	"encoding/json"
	"log"
	"sync"
)

type dispatchRequest struct {
	message     any
	targetUsers []string
}

type Hub struct {
	clients    map[*Client]bool
	userIndex  map[string]map[*Client]bool
	mu         sync.RWMutex
	register   chan *Client
	unregister chan *Client
	dispatch   chan dispatchRequest
	config     Config
}

func NewHub(cfg Config) *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		userIndex:  make(map[string]map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		dispatch:   make(chan dispatchRequest),
		config:     cfg,
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			if h.userIndex[client.UserID] == nil {
				h.userIndex[client.UserID] = make(map[*Client]bool)
			}
			h.userIndex[client.UserID][client] = true
			h.mu.Unlock()
			log.Printf("web client connected: %s", client.Username)
			h.publishAll(NewUsersMessage())
		case client := <-h.unregister:
			h.removeClient(client, true)
		case request := <-h.dispatch:
			if len(request.targetUsers) == 0 {
				h.publishAll(request.message)
				continue
			}
			h.publishUsers(request.message, request.targetUsers)
		}
	}
}

func (h *Hub) Broadcast(message Message) {
	h.dispatch <- dispatchRequest{message: message}
}

func (h *Hub) BroadcastPrivate(message Message, userIDs ...string) {
	h.dispatch <- dispatchRequest{message: message, targetUsers: userIDs}
}

func (h *Hub) BroadcastTranscriptUpdate(messageID, conversationID, transcript string, memberUserIDs []string) {
	msg := NewTranscriptUpdate(messageID, conversationID, transcript)
	h.dispatch <- dispatchRequest{message: msg, targetUsers: memberUserIDs}
}

func (h *Hub) Register(client *Client) {
	h.register <- client
}

func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

func (h *Hub) publishAll(message any) {
	h.mu.RLock()
	clients := make([]*Client, 0, len(h.clients))
	for client := range h.clients {
		clients = append(clients, client)
	}
	h.mu.RUnlock()

	payload, err := json.Marshal(message)
	if err != nil {
		log.Printf("failed to marshal websocket message: %v", err)
		return
	}

	for _, client := range clients {
		h.writeToClient(client, payload)
	}
}

func (h *Hub) publishUsers(message any, userIDs []string) {
	h.mu.RLock()
	targets := make([]*Client, 0)
	seenUsers := make(map[string]bool)
	seenClients := make(map[*Client]bool)
	for _, userID := range userIDs {
		if seenUsers[userID] {
			continue
		}
		seenUsers[userID] = true
		for client := range h.userIndex[userID] {
			if seenClients[client] {
				continue
			}
			seenClients[client] = true
			targets = append(targets, client)
		}
	}
	h.mu.RUnlock()

	payload, err := json.Marshal(message)
	if err != nil {
		log.Printf("failed to marshal websocket message: %v", err)
		return
	}

	for _, client := range targets {
		h.writeToClient(client, payload)
	}
}

func (h *Hub) writeToClient(client *Client, payload []byte) {
	select {
	case client.send <- payload:
	default:
		h.removeClient(client, true)
		log.Printf("web client removed because send channel blocked: %s", client.Username)
	}
}

func (h *Hub) removeClient(client *Client, closeSend bool) {
	h.mu.Lock()
	if _, ok := h.clients[client]; !ok {
		h.mu.Unlock()
		return
	}
	delete(h.clients, client)
	if indexed, ok := h.userIndex[client.UserID]; ok {
		delete(indexed, client)
		if len(indexed) == 0 {
			delete(h.userIndex, client.UserID)
		}
	}
	h.mu.Unlock()

	if closeSend {
		close(client.send)
	}
	log.Printf("web client disconnected: %s", client.Username)
	h.publishAll(NewUsersMessage())
}
