package chatstore

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"slices"
	"strings"
	"time"

	"easyChat/internal/auth"
)

func (s *Service) lookupUser(userID string) (auth.User, error) {
	var user auth.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return auth.User{}, err
	}
	return user, nil
}

func StablePrivateConversationID(leftUserID, rightUserID string) string {
	pair := []string{strings.TrimSpace(leftUserID), strings.TrimSpace(rightUserID)}
	slices.Sort(pair)
	return fmt.Sprintf("private:%s:%s", pair[0], pair[1])
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
