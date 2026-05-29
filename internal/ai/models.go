package ai

import "time"

type AIConversation struct {
	ID             string    `gorm:"primaryKey"`
	ConversationID string    `gorm:"index;size:64;not null"`
	UserID         string    `gorm:"index;size:64;not null"`
	Role           string    `gorm:"size:16;not null"`
	Content        string    `gorm:"type:text;not null"`
	CreatedAt      time.Time `gorm:"index"`
}

type AIEmbedding struct {
	ID             string    `gorm:"primaryKey"`
	ConversationID string    `gorm:"index;size:64;not null"`
	MessageID      string    `gorm:"index;size:64;not null"`
	Content        string    `gorm:"type:text;not null"`
	Embedding      []byte    `gorm:"type:blob"`
	CreatedAt      time.Time
}
