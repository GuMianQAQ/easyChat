package social

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"easyChat/internal/auth"
	apperrors "easyChat/internal/errors"
	"easyChat/internal/uid"

	"gorm.io/gorm"
)

const (
	RequestPending  = "pending"
	RequestAccepted = "accepted"
	RequestRejected = "rejected"
	systemFriendID  = "ai-assistant"
)

type Friendship struct {
	ID          string `gorm:"primaryKey"`
	UserID      string `gorm:"uniqueIndex:idx_friendship_user_friend;size:64;not null"`
	FriendID    string `gorm:"uniqueIndex:idx_friendship_user_friend;size:64;not null"`
	Remark      string `gorm:"size:64"`
	Tags        string `gorm:"type:text"`
	Phone       string `gorm:"size:32"`
	Description string `gorm:"type:text"`
	Images      string `gorm:"type:text"`
	IsStarred   bool   `gorm:"not null;default:false"`
	IsBlocked   bool   `gorm:"not null;default:false"`
	Permission  string `gorm:"size:16;not null;default:chat"`
	BlockedAt   *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type FriendRequest struct {
	ID         string `gorm:"primaryKey"`
	FromUserID string `gorm:"index;size:64;not null"`
	ToUserID   string `gorm:"index;size:64;not null"`
	Message    string `gorm:"size:255"`
	Status     string `gorm:"index;size:16;not null"`
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type PrivacySettings struct {
	AllowSearch         bool `json:"allowSearch"`
	AllowFriendRequest  bool `json:"allowFriendRequest"`
	RequireFriendVerify bool `json:"requireFriendVerify"`
}

type UserSearchResult struct {
	ID                 string `json:"id"`
	Username           string `json:"username"`
	Nickname           string `json:"nickname"`
	Avatar             string `json:"avatar"`
	Gender             string `json:"gender,omitempty"`
	Region             string `json:"region,omitempty"`
	Signature          string `json:"signature,omitempty"`
	MomentCover        string `json:"momentCover,omitempty"`
	IsSelf             bool   `json:"isSelf"`
	IsFriend           bool   `json:"isFriend"`
	RequestStatus      string `json:"requestStatus"`
	RequestID          string `json:"requestId,omitempty"`
	AllowFriendRequest bool   `json:"allowFriendRequest"`
}

type FriendRequestPayload struct {
	ID           string           `json:"id"`
	RequestID    string           `json:"requestId"`
	Direction    string           `json:"direction"`
	FromUserID   string           `json:"fromUserId,omitempty"`
	FromUsername string           `json:"fromUsername,omitempty"`
	FromNickname string           `json:"fromNickname,omitempty"`
	FromAvatar   string           `json:"fromAvatar,omitempty"`
	Message      string           `json:"message"`
	Status       string           `json:"status"`
	CreatedAt    string           `json:"createdAt"`
	User         UserSearchResult `json:"user"`
}

type FriendItem struct {
	ID            string         `json:"id"`
	FriendID      string         `json:"friendId"`
	Username      string         `json:"username"`
	Nickname      string         `json:"nickname"`
	Avatar        string         `json:"avatar"`
	Gender        string         `json:"gender"`
	Region        string         `json:"region"`
	Signature     string         `json:"signature"`
	Remark        string         `json:"remark"`
	Tags          []string       `json:"tags"`
	Phone         string         `json:"phone"`
	Description   string         `json:"description"`
	Images        []ContactImage `json:"images"`
	IsStarred     bool           `json:"isStarred"`
	IsBlocked     bool           `json:"isBlocked"`
	BlockedAt     string         `json:"blockedAt"`
	BlockedByPeer bool           `json:"blockedByPeer"`
	Permission    string         `json:"permission"`
	CreatedAt     string         `json:"createdAt"`
}

type UpdateFriendRequest struct {
	Remark      string         `json:"remark"`
	Tags        []string       `json:"tags"`
	Phone       string         `json:"phone"`
	Description string         `json:"description"`
	Images      []ContactImage `json:"images"`
	IsStarred   bool           `json:"isStarred"`
	Permission  string         `json:"permission"`
}

type ContactImage struct {
	URL      string `json:"url"`
	Favorite bool   `json:"favorite"`
}

type SendFriendRequestInput struct {
	ToUserID string `json:"toUserId"`
	Message  string `json:"message"`
}

type SendFriendRequestResult struct {
	Status string           `json:"status"`
	User   UserSearchResult `json:"user"`
}

type requestState struct {
	Status    string
	RequestID string
}

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) (*Service, error) {
	return &Service{db: db}, nil
}

func (s *Service) GetPrivacy(userID string) (PrivacySettings, error) {
	user, err := s.lookupUser(strings.TrimSpace(userID))
	if err != nil {
		return PrivacySettings{}, err
	}
	return PrivacySettings{
		AllowSearch:         user.AllowSearch,
		AllowFriendRequest:  user.AllowFriendRequest,
		RequireFriendVerify: user.RequireFriendVerify,
	}, nil
}

func (s *Service) UpdatePrivacy(userID string, settings PrivacySettings) (PrivacySettings, error) {
	user, err := s.lookupUser(strings.TrimSpace(userID))
	if err != nil {
		return PrivacySettings{}, err
	}
	user.AllowSearch = settings.AllowSearch
	user.AllowFriendRequest = settings.AllowFriendRequest
	user.RequireFriendVerify = settings.RequireFriendVerify
	if err := s.db.Save(&user).Error; err != nil {
		return PrivacySettings{}, err
	}
	return s.GetPrivacy(userID)
}

func (s *Service) SearchUser(requesterID, username string) (*UserSearchResult, error) {
	requesterID = strings.TrimSpace(requesterID)
	username = strings.TrimSpace(username)
	if username == "" {
		return nil, apperrors.ErrInputCompleteAccount
	}

	escaped := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(username)
	like := "%" + escaped + "%"
	var user auth.User
	if err := s.db.Where("username LIKE ? OR nickname LIKE ?", like, like).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	if user.ID != requesterID && !user.AllowSearch {
		return nil, nil
	}

	result, err := s.buildUserResult(requesterID, user)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (s *Service) GetProfile(requesterID, targetID string) (UserSearchResult, error) {
	user, err := s.lookupUser(strings.TrimSpace(targetID))
	if err != nil {
		return UserSearchResult{}, err
	}
	return s.buildUserResult(strings.TrimSpace(requesterID), user)
}

func (s *Service) SendFriendRequest(fromUserID string, input SendFriendRequestInput) (SendFriendRequestResult, error) {
	fromUser, err := s.lookupUser(strings.TrimSpace(fromUserID))
	if err != nil {
		return SendFriendRequestResult{}, err
	}
	toUser, err := s.lookupUser(strings.TrimSpace(input.ToUserID))
	if err != nil {
		return SendFriendRequestResult{}, apperrors.ErrUserNotFound
	}
	if fromUser.ID == toUser.ID {
		return SendFriendRequestResult{}, apperrors.ErrCannotAddSelf
	}
	if err := s.ensureNotBlocked(fromUser.ID, toUser.ID); err != nil {
		return SendFriendRequestResult{}, err
	}

	if _, ok, err := s.findFriendship(fromUser.ID, toUser.ID); err != nil {
		return SendFriendRequestResult{}, err
	} else if ok {
		result, buildErr := s.buildUserResult(fromUser.ID, toUser)
		if buildErr != nil {
			return SendFriendRequestResult{}, buildErr
		}
		return SendFriendRequestResult{Status: RequestAccepted, User: result}, apperrors.ErrAlreadyFriend
	}

	if !toUser.AllowFriendRequest {
		return SendFriendRequestResult{}, apperrors.ErrNotAcceptingRequests
	}

	if !toUser.RequireFriendVerify {
		if err := s.createFriendshipPair(fromUser, toUser); err != nil {
			return SendFriendRequestResult{}, err
		}
		result, buildErr := s.buildUserResult(fromUser.ID, toUser)
		if buildErr != nil {
			return SendFriendRequestResult{}, buildErr
		}
		return SendFriendRequestResult{Status: RequestAccepted, User: result}, nil
	}

	var existing FriendRequest
	err = s.db.Where(
		"from_user_id = ? AND to_user_id = ? AND status = ?",
		fromUser.ID,
		toUser.ID,
		RequestPending,
	).First(&existing).Error
	if err == nil {
		result, buildErr := s.buildUserResult(fromUser.ID, toUser)
		if buildErr != nil {
			return SendFriendRequestResult{}, buildErr
		}
		return SendFriendRequestResult{Status: RequestPending, User: result}, nil
	}
	if err != nil && err != gorm.ErrRecordNotFound {
		return SendFriendRequestResult{}, err
	}

	message := strings.TrimSpace(input.Message)
	if len([]rune(message)) > 100 {
		message = string([]rune(message)[:100])
	}

	request := FriendRequest{
		ID:         uid.New("req"),
		FromUserID: fromUser.ID,
		ToUserID:   toUser.ID,
		Message:    message,
		Status:     RequestPending,
	}
	if err := s.db.Create(&request).Error; err != nil {
		return SendFriendRequestResult{}, err
	}

	result, buildErr := s.buildUserResult(fromUser.ID, toUser)
	if buildErr != nil {
		return SendFriendRequestResult{}, buildErr
	}
	return SendFriendRequestResult{Status: RequestPending, User: result}, nil
}

func (s *Service) ListFriendRequests(userID string) ([]FriendRequestPayload, error) {
	var requests []FriendRequest
	if err := s.db.Where(
		"(to_user_id = ? AND status = ?) OR from_user_id = ?",
		userID,
		RequestPending,
		userID,
	).Order("created_at desc").Find(&requests).Error; err != nil {
		return nil, err
	}

	otherIDs := make([]string, 0, len(requests))
	for _, request := range requests {
		if request.ToUserID == userID {
			otherIDs = append(otherIDs, request.FromUserID)
		} else {
			otherIDs = append(otherIDs, request.ToUserID)
		}
	}

	var users []auth.User
	if err := s.db.Where("id IN ?", otherIDs).Find(&users).Error; err != nil {
		return nil, err
	}

	userMap := make(map[string]auth.User, len(users))
	for _, user := range users {
		userMap[user.ID] = user
	}

	friendships, err := s.findFriendships(userID, otherIDs)
	if err != nil {
		return nil, err
	}

	items := make([]FriendRequestPayload, 0, len(requests))
	for _, request := range requests {
		direction := "sent"
		otherID := request.ToUserID
		if request.ToUserID == userID {
			direction = "received"
			otherID = request.FromUserID
		}

		other, ok := userMap[otherID]
		if !ok {
			continue
		}

		isFriend := false
		if _, ok := friendships[otherID]; ok {
			isFriend = true
		}

		profile := UserSearchResult{
			ID:       other.ID,
			Username: other.Username,
			Nickname: other.Nickname,
			Avatar:   other.Avatar,
			IsFriend: isFriend,
		}

		payload := FriendRequestPayload{
			ID:        request.ID,
			RequestID: request.ID,
			Direction: direction,
			Message:   request.Message,
			Status:    request.Status,
			CreatedAt: formatTime(request.CreatedAt),
			User:      profile,
		}
		if direction == "received" {
			payload.FromUserID = request.FromUserID
			payload.FromUsername = other.Username
			payload.FromNickname = other.Nickname
			payload.FromAvatar = other.Avatar
		}
		items = append(items, payload)
	}
	return items, nil
}

func (s *Service) AcceptFriendRequest(userID, requestID string) (FriendItem, error) {
	var request FriendRequest
	if err := s.db.Where("id = ?", strings.TrimSpace(requestID)).First(&request).Error; err != nil {
		return FriendItem{}, apperrors.ErrFriendRequestNotFound
	}
	if request.ToUserID != strings.TrimSpace(userID) {
		return FriendItem{}, apperrors.ErrNoPermissionHandleRequest
	}
	if request.Status != RequestPending {
		return FriendItem{}, apperrors.ErrFriendRequestAlreadyHandled
	}

	fromUser, err := s.lookupUser(request.FromUserID)
	if err != nil {
		return FriendItem{}, err
	}
	toUser, err := s.lookupUser(request.ToUserID)
	if err != nil {
		return FriendItem{}, err
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&request).Updates(map[string]any{"status": RequestAccepted}).Error; err != nil {
			return err
		}
		return createFriendshipPairTx(tx, fromUser, toUser)
	}); err != nil {
		return FriendItem{}, err
	}

	return s.friendItemFor(userID, fromUser.ID)
}

func (s *Service) RejectFriendRequest(userID, requestID string) error {
	var request FriendRequest
	if err := s.db.Where("id = ?", strings.TrimSpace(requestID)).First(&request).Error; err != nil {
		return apperrors.ErrFriendRequestNotFound
	}
	if request.ToUserID != strings.TrimSpace(userID) {
		return apperrors.ErrNoPermissionHandleRequest
	}
	if request.Status != RequestPending {
		return apperrors.ErrFriendRequestAlreadyHandled
	}
	return s.db.Model(&request).Updates(map[string]any{"status": RequestRejected}).Error
}

func (s *Service) ListFriends(userID string) ([]FriendItem, error) {
	var friendships []Friendship
	if err := s.db.
		Where("user_id = ?", strings.TrimSpace(userID)).
		Order(fmt.Sprintf("CASE WHEN friend_id = '%s' THEN 0 ELSE 1 END, created_at asc", systemFriendID)).
		Find(&friendships).Error; err != nil {
		return nil, err
	}

	friendIDs := make([]string, 0, len(friendships))
	for _, friendship := range friendships {
		friendIDs = append(friendIDs, friendship.FriendID)
	}

	var users []auth.User
	if err := s.db.Where("id IN ?", friendIDs).Find(&users).Error; err != nil {
		return nil, err
	}

	userMap := make(map[string]auth.User, len(users))
	for _, user := range users {
		userMap[user.ID] = user
	}

	reverseFriendships, err := s.findFriendshipsReverse(friendIDs, strings.TrimSpace(userID))
	if err != nil {
		return nil, err
	}

	items := make([]FriendItem, 0, len(friendships))
	for _, friendship := range friendships {
		friend, ok := userMap[friendship.FriendID]
		if !ok {
			continue
		}

		reverse := reverseFriendships[friendship.FriendID]

		item := FriendItem{
			ID:            friendship.ID,
			FriendID:      friend.ID,
			Username:      friend.Username,
			Nickname:      friend.Nickname,
			Avatar:        friend.Avatar,
			Gender:        normalizeGender(friend.Gender),
			Region:        friend.Region,
			Signature:     friend.Signature,
			Remark:        friendship.Remark,
			Tags:          splitTags(friendship.Tags),
			Phone:         friendship.Phone,
			Description:   friendship.Description,
			Images:        splitImages(friendship.Images),
			IsStarred:     friendship.IsStarred,
			IsBlocked:     friendship.IsBlocked,
			BlockedAt:     formatNullableTime(friendship.BlockedAt),
			BlockedByPeer: reverse.IsBlocked,
			Permission:    friendship.Permission,
			CreatedAt:     formatTime(friendship.CreatedAt),
		}
		items = append(items, item)
	}
	return items, nil
}

func (s *Service) EnsureSystemFriendInTx(tx *gorm.DB, userID string) error {
	return s.ensureSystemFriendTx(tx, strings.TrimSpace(userID))
}

func (s *Service) UpdateFriend(userID, friendID string, input UpdateFriendRequest) (FriendItem, error) {
	friendship, ok, err := s.findFriendship(strings.TrimSpace(userID), strings.TrimSpace(friendID))
	if err != nil {
		return FriendItem{}, err
	}
	if !ok {
		return FriendItem{}, apperrors.ErrNotFound
	}

	friendship.Remark = strings.TrimSpace(input.Remark)
	friendship.Tags = joinTags(input.Tags)
	friendship.Phone = strings.TrimSpace(input.Phone)
	friendship.Description = strings.TrimSpace(input.Description)
	friendship.Images = joinImages(input.Images)
	friendship.IsStarred = input.IsStarred
	if strings.TrimSpace(input.Permission) == "" {
		friendship.Permission = "chat"
	} else {
		friendship.Permission = strings.TrimSpace(input.Permission)
	}
	if err := s.db.Save(&friendship).Error; err != nil {
		return FriendItem{}, err
	}
	return s.friendItem(friendship)
}

func (s *Service) DeleteFriend(userID, friendID string) error {
	userID = strings.TrimSpace(userID)
	friendID = strings.TrimSpace(friendID)
	if userID == "" || friendID == "" {
		return apperrors.ErrMissingRequiredParam
	}
	if userID == friendID {
		return apperrors.ErrBadRequest
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ? AND friend_id = ?", userID, friendID).Delete(&Friendship{}).Error; err != nil {
			return err
		}
		if err := tx.Where("user_id = ? AND friend_id = ?", friendID, userID).Delete(&Friendship{}).Error; err != nil {
			return err
		}
		return nil
	})
}

func (s *Service) BlockFriend(userID, friendID string) (FriendItem, error) {
	userID = strings.TrimSpace(userID)
	friendID = strings.TrimSpace(friendID)
	if userID == "" || friendID == "" {
		return FriendItem{}, apperrors.ErrMissingRequiredParam
	}
	if userID == friendID {
		return FriendItem{}, apperrors.ErrBadRequest
	}

	friendship, ok, err := s.findFriendship(userID, friendID)
	if err != nil {
		return FriendItem{}, err
	}
	if !ok {
		return FriendItem{}, apperrors.ErrNotFound
	}

	now := time.Now()
	friendship.IsBlocked = true
	friendship.BlockedAt = &now
	if err := s.db.Save(&friendship).Error; err != nil {
		return FriendItem{}, err
	}
	return s.friendItem(friendship)
}

func (s *Service) UnblockFriend(userID, friendID string) (FriendItem, error) {
	userID = strings.TrimSpace(userID)
	friendID = strings.TrimSpace(friendID)
	if userID == "" || friendID == "" {
		return FriendItem{}, apperrors.ErrMissingRequiredParam
	}

	friendship, ok, err := s.findFriendship(userID, friendID)
	if err != nil {
		return FriendItem{}, err
	}
	if !ok {
		return FriendItem{}, apperrors.ErrNotFound
	}

	friendship.IsBlocked = false
	friendship.BlockedAt = nil
	if err := s.db.Save(&friendship).Error; err != nil {
		return FriendItem{}, err
	}
	return s.friendItem(friendship)
}

func (s *Service) IsFriend(userID, friendID string) (bool, error) {
	_, ok, err := s.findFriendship(strings.TrimSpace(userID), strings.TrimSpace(friendID))
	return ok, err
}

func (s *Service) CanStartPrivateConversation(userID, friendID string) error {
	return s.validatePrivateMessaging(strings.TrimSpace(userID), strings.TrimSpace(friendID))
}

func (s *Service) CanSendPrivateMessage(userID, friendID string) error {
	return s.validatePrivateMessaging(strings.TrimSpace(userID), strings.TrimSpace(friendID))
}

func (s *Service) ListBlockedFriends(userID string) ([]FriendItem, error) {
	var friendships []Friendship
	if err := s.db.
		Where("user_id = ? AND is_blocked = ?", strings.TrimSpace(userID), true).
		Order("blocked_at desc").
		Find(&friendships).Error; err != nil {
		return nil, err
	}

	items := make([]FriendItem, 0, len(friendships))
	for _, friendship := range friendships {
		item, err := s.friendItem(friendship)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (s *Service) buildUserResult(requesterID string, user auth.User) (UserSearchResult, error) {
	isSelf := requesterID == user.ID
	isFriend, err := s.IsFriend(requesterID, user.ID)
	if err != nil {
		return UserSearchResult{}, err
	}
	state, err := s.requestStatus(requesterID, user.ID, isFriend)
	if err != nil {
		return UserSearchResult{}, err
	}

	return UserSearchResult{
		ID:                 user.ID,
		Username:           user.Username,
		Nickname:           user.Nickname,
		Avatar:             user.Avatar,
		Gender:             normalizeGender(user.Gender),
		Region:             user.Region,
		Signature:          user.Signature,
		MomentCover:        user.MomentCover,
		IsSelf:             isSelf,
		IsFriend:           isFriend,
		RequestStatus:      state.Status,
		RequestID:          state.RequestID,
		AllowFriendRequest: !isSelf && user.AllowFriendRequest,
	}, nil
}

func (s *Service) requestStatus(requesterID, targetID string, isFriend bool) (requestState, error) {
	if requesterID == "" || targetID == "" || requesterID == targetID {
		return requestState{Status: "none"}, nil
	}
	if isFriend {
		return requestState{Status: RequestAccepted}, nil
	}

	var sent FriendRequest
	if err := s.db.Where(
		"from_user_id = ? AND to_user_id = ? AND status = ?",
		requesterID,
		targetID,
		RequestPending,
	).First(&sent).Error; err == nil {
		return requestState{Status: RequestPending, RequestID: sent.ID}, nil
	} else if err != nil && err != gorm.ErrRecordNotFound {
		return requestState{Status: "none"}, err
	}

	var received FriendRequest
	if err := s.db.Where(
		"from_user_id = ? AND to_user_id = ? AND status = ?",
		targetID,
		requesterID,
		RequestPending,
	).First(&received).Error; err == nil {
		return requestState{Status: "received", RequestID: received.ID}, nil
	} else if err != nil && err != gorm.ErrRecordNotFound {
		return requestState{Status: "none"}, err
	}

	return requestState{Status: "none"}, nil
}

func (s *Service) createFriendshipPair(left, right auth.User) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		return createFriendshipPairTx(tx, left, right)
	})
}

func (s *Service) ensureSystemFriendTx(tx *gorm.DB, userID string) error {
	if userID == "" || userID == systemFriendID {
		return nil
	}

	var user auth.User
	if err := tx.Select("id").First(&user, "id = ?", userID).Error; err != nil {
		return err
	}

	var systemUser auth.User
	if err := tx.Select("id").First(&systemUser, "id = ?", systemFriendID).Error; err != nil {
		return err
	}

	return createFriendshipPairTx(tx, user, systemUser)
}

func createFriendshipPairTx(tx *gorm.DB, left, right auth.User) error {
	for _, item := range []Friendship{
		{
			ID:         uid.New("frd"),
			UserID:     left.ID,
			FriendID:   right.ID,
			Permission: "chat",
		},
		{
			ID:         uid.New("frd"),
			UserID:     right.ID,
			FriendID:   left.ID,
			Permission: "chat",
		},
	} {
		if err := tx.Where("user_id = ? AND friend_id = ?", item.UserID, item.FriendID).FirstOrCreate(&item).Error; err != nil {
			return err
		}
	}
	return nil
}

func (s *Service) findFriendship(userID, friendID string) (Friendship, bool, error) {
	var friendship Friendship
	err := s.db.Where("user_id = ? AND friend_id = ?", userID, friendID).First(&friendship).Error
	if err == gorm.ErrRecordNotFound {
		return Friendship{}, false, nil
	}
	if err != nil {
		return Friendship{}, false, err
	}
	return friendship, true, nil
}

func (s *Service) findFriendships(userID string, friendIDs []string) (map[string]Friendship, error) {
	var friendships []Friendship
	if err := s.db.Where("user_id = ? AND friend_id IN ?", userID, friendIDs).Find(&friendships).Error; err != nil {
		return nil, err
	}

	result := make(map[string]Friendship, len(friendships))
	for _, friendship := range friendships {
		result[friendship.FriendID] = friendship
	}
	return result, nil
}

func (s *Service) findFriendshipsReverse(friendIDs []string, userID string) (map[string]Friendship, error) {
	var friendships []Friendship
	if err := s.db.Where("user_id IN ? AND friend_id = ?", friendIDs, userID).Find(&friendships).Error; err != nil {
		return nil, err
	}

	result := make(map[string]Friendship, len(friendships))
	for _, friendship := range friendships {
		result[friendship.UserID] = friendship
	}
	return result, nil
}

func (s *Service) friendItemFor(userID, friendID string) (FriendItem, error) {
	friendship, ok, err := s.findFriendship(strings.TrimSpace(userID), strings.TrimSpace(friendID))
	if err != nil {
		return FriendItem{}, err
	}
	if !ok {
		return FriendItem{}, apperrors.ErrNotFound
	}
	return s.friendItem(friendship)
}

func (s *Service) friendItem(friendship Friendship) (FriendItem, error) {
	friend, err := s.lookupUser(friendship.FriendID)
	if err != nil {
		return FriendItem{}, err
	}
	reverse, _, err := s.findFriendship(friendship.FriendID, friendship.UserID)
	if err != nil {
		return FriendItem{}, err
	}
	return FriendItem{
		ID:            friendship.ID,
		FriendID:      friend.ID,
		Username:      friend.Username,
		Nickname:      friend.Nickname,
		Avatar:        friend.Avatar,
		Gender:        normalizeGender(friend.Gender),
		Region:        friend.Region,
		Signature:     friend.Signature,
		Remark:        friendship.Remark,
		Tags:          splitTags(friendship.Tags),
		Phone:         friendship.Phone,
		Description:   friendship.Description,
		Images:        splitImages(friendship.Images),
		IsStarred:     friendship.IsStarred,
		IsBlocked:     friendship.IsBlocked,
		BlockedAt:     formatNullableTime(friendship.BlockedAt),
		BlockedByPeer: reverse.IsBlocked,
		Permission:    friendship.Permission,
		CreatedAt:     formatTime(friendship.CreatedAt),
	}, nil
}

func (s *Service) ensureNotBlocked(userID, friendID string) error {
	forward, forwardOK, err := s.findFriendship(userID, friendID)
	if err != nil {
		return err
	}
	if forwardOK && forward.IsBlocked {
		return apperrors.ErrFriendBlocked
	}

	reverse, reverseOK, err := s.findFriendship(friendID, userID)
	if err != nil {
		return err
	}
	if reverseOK && reverse.IsBlocked {
		return apperrors.ErrUserNotAcceptingMessages
	}
	return nil
}

func (s *Service) validatePrivateMessaging(userID, friendID string) error {
	if userID == "" || friendID == "" {
		return apperrors.ErrMissingRequiredParam
	}
	if userID == friendID {
		return apperrors.ErrBadRequest
	}

	forward, forwardOK, err := s.findFriendship(userID, friendID)
	if err != nil {
		return err
	}
	reverse, reverseOK, err := s.findFriendship(friendID, userID)
	if err != nil {
		return err
	}
	if !forwardOK || !reverseOK {
		return apperrors.ErrNotFriend
	}
	if forward.IsBlocked {
		return apperrors.ErrFriendBlocked
	}
	if reverse.IsBlocked {
		return apperrors.ErrUserNotAcceptingMessages
	}
	return nil
}

func normalizeGender(value string) string {
	return auth.SafeGender(value)
}

func (s *Service) lookupUser(userID string) (auth.User, error) {
	return auth.LookupUser(s.db, userID)
}

func splitTags(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	tags := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			tags = append(tags, part)
		}
	}
	return tags
}

func joinTags(tags []string) string {
	parts := make([]string, 0, len(tags))
	for _, tag := range tags {
		tag = strings.TrimSpace(tag)
		if tag != "" {
			parts = append(parts, tag)
		}
	}
	return strings.Join(parts, ",")
}

func splitImages(value string) []ContactImage {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	var images []ContactImage
	if err := json.Unmarshal([]byte(value), &images); err != nil {
		return nil
	}
	cleaned := make([]ContactImage, 0, len(images))
	for _, image := range images {
		if strings.TrimSpace(image.URL) != "" {
			cleaned = append(cleaned, ContactImage{
				URL:      strings.TrimSpace(image.URL),
				Favorite: image.Favorite,
			})
		}
	}
	return cleaned
}

func joinImages(images []ContactImage) string {
	cleaned := make([]ContactImage, 0, len(images))
	for _, image := range images {
		if strings.TrimSpace(image.URL) != "" {
			cleaned = append(cleaned, ContactImage{
				URL:      strings.TrimSpace(image.URL),
				Favorite: image.Favorite,
			})
		}
	}
	if len(cleaned) == 0 {
		return "[]"
	}
	data, err := json.Marshal(cleaned)
	if err != nil {
		return "[]"
	}
	return string(data)
}

func formatTime(value time.Time) string {
	return auth.FormatTime(value)
}

func formatNullableTime(value *time.Time) string {
	if value == nil {
		return ""
	}
	return formatTime(*value)
}


