package ai

import (
	"log"

	"easyChat/internal/auth"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const (
	SystemUserID   = "ai-assistant"
	SystemUsername = "ai_assistant"
	SystemNickname = "AI 助手"
)

const DefaultAvatar = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNjM2NmYxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDJhMyAzIDAgMCAxIDMgM3YxYTMgMyAwIDAgMS02IDNWNGEzIDMgMCAwIDEgMy0zeiIvPjxwYXRoIGQ9Ik0xOSA5SDVhMiAyIDAgMCAwLTIgMnY0YTIgMiAwIDAgMCAyIDJoMTRhMiAyIDAgMCAwIDItMnYtNGEyIDIgMCAwIDAtMi0yeiIvPjxjaXJjbGUgY3g9IjkiIGN5PSIxMyIgcj0iMSIgZmlsbD0iIzYzNjZmMSIvPjxjaXJjbGUgY3g9IjE1IiBjeT0iMTMiIHI9IjEiIGZpbGw9IiM2MzY2ZjEiLz48L3N2Zz4="

func EnsureSystemUser(db *gorm.DB) error {
	var count int64
	if err := db.Model(&auth.User{}).Where("id = ?", SystemUserID).Count(&count).Error; err != nil {
		return err
	}

	if count > 0 {
		log.Printf("AI system user already exists (id=%s)", SystemUserID)
		return nil
	}

	dummyHash, err := bcrypt.GenerateFromPassword([]byte("ai-system-user-no-login"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user := auth.User{
		ID:           SystemUserID,
		Username:     SystemUsername,
		PasswordHash: string(dummyHash),
		Nickname:     SystemNickname,
		Avatar:       DefaultAvatar,
		Gender:       "unknown",
		Region:       "",
		Signature:    "我是 AI 助手，有什么可以帮你的吗？",
	}

	if err := db.Create(&user).Error; err != nil {
		return err
	}

	log.Printf("Created AI system user (id=%s, username=%s)", SystemUserID, SystemUsername)
	return nil
}

func SystemUser() auth.PublicUser {
	return auth.PublicUser{
		ID:       SystemUserID,
		Username: SystemUsername,
		Nickname: SystemNickname,
		Avatar:   DefaultAvatar,
	}
}
