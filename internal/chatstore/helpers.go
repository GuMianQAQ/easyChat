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
	return auth.LookupUser(s.db, userID)
}

func StablePrivateConversationID(leftUserID, rightUserID string) string {
	pair := []string{strings.TrimSpace(leftUserID), strings.TrimSpace(rightUserID)}
	slices.Sort(pair)
	return fmt.Sprintf("private:%s:%s", pair[0], pair[1])
}

func formatTime(value time.Time) string {
	return auth.FormatTime(value)
}

func normalizeID(id string) string {
	id = strings.TrimSpace(id)
	if id == "" {
		return uid.New("msg")
	}
	return id
}


