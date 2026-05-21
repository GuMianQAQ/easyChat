package database

import (
	"os"
	"path/filepath"

	"easyChat/internal/auth"
	"easyChat/internal/chatstore"
	"easyChat/internal/social"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func Open(dbPath string) (*gorm.DB, error) {
	if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
		return nil, err
	}

	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err == nil {
		sqlDB.SetMaxOpenConns(1)
		sqlDB.SetMaxIdleConns(1)
		sqlDB.SetConnMaxLifetime(0)
		sqlDB.SetConnMaxIdleTime(0)
	}

	return db, nil
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&auth.User{},
		&social.Friendship{},
		&social.FriendRequest{},
		&chatstore.Conversation{},
		&chatstore.ConversationMember{},
		&chatstore.Message{},
		&chatstore.Favorite{},
		&chatstore.UploadedFile{},
	)
}
