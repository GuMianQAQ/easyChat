package chatstore

import (
	"fmt"
	"slices"
	"strings"
	"time"

	"easyChat/internal/auth"
	"easyChat/internal/uid"
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
		return uid.New("msg")
	}
	return id
}


