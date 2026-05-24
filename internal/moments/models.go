package moments

import (
	"time"
)

// Moment 朋友圈动态
type Moment struct {
	ID        string `gorm:"primaryKey"`
	AuthorID  string `gorm:"index;size:64;not null"`
	Content   string `gorm:"type:text;not null"`
	Images    string `gorm:"type:text"` // JSON array of image URLs
	CreatedAt time.Time
	UpdatedAt time.Time
}

// MomentLike 点赞记录
type MomentLike struct {
	ID        string `gorm:"primaryKey"`
	MomentID  string `gorm:"uniqueIndex:idx_moment_like;size:64;not null"`
	UserID    string `gorm:"uniqueIndex:idx_moment_like;size:64;not null"`
	CreatedAt time.Time
}

// MomentComment 评论
type MomentComment struct {
	ID        string `gorm:"primaryKey"`
	MomentID  string `gorm:"index;size:64;not null"`
	AuthorID  string `gorm:"index;size:64;not null"`
	Content   string `gorm:"type:text;not null"`
	CreatedAt time.Time
}

// ---------- API payloads ----------

type MomentItem struct {
	ID        string        `json:"id"`
	AuthorID  string        `json:"authorId"`
	Author    AuthorInfo    `json:"author"`
	Content   string        `json:"content"`
	Images    []string      `json:"images"`
	LikeCount int           `json:"likeCount"`
	LikedByMe bool          `json:"likedByMe"`
	Comments  []CommentItem `json:"comments"`
	CanDelete bool          `json:"canDelete"`
	CreatedAt string        `json:"createdAt"`
}

type CommentItem struct {
	ID        string     `json:"id"`
	AuthorID  string     `json:"authorId"`
	Author    AuthorInfo `json:"author"`
	Content   string     `json:"content"`
	CanDelete bool       `json:"canDelete"`
	CreatedAt string     `json:"createdAt"`
}

type AuthorInfo struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Nickname string `json:"nickname"`
	Avatar   string `json:"avatar,omitempty"`
}

type CreateMomentInput struct {
	Content string   `json:"content"`
	Images  []string `json:"images"`
}

type AddCommentInput struct {
	Content string `json:"content"`
}
