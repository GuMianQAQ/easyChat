package moments

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"easyChat/internal/auth"
	"easyChat/internal/social"

	"gorm.io/gorm"
)

type Service struct {
	db     *gorm.DB
	social *social.Service
}

func NewService(db *gorm.DB, social *social.Service) *Service {
	return &Service{db: db, social: social}
}

func (s *Service) CreatePost(userID string, input CreateMomentInput) (MomentItem, error) {
	userID = strings.TrimSpace(userID)
	content := strings.TrimSpace(input.Content)
	if content == "" {
		return MomentItem{}, errors.New("内容不能为空")
	}
	if utf8.RuneCountInString(content) > 5000 {
		return MomentItem{}, errors.New("内容太长")
	}

	images := input.Images
	if images == nil {
		images = []string{}
	}
	imagesJSON, err := json.Marshal(images)
	if err != nil {
		return MomentItem{}, err
	}

	post := Moment{
		ID:       newID("mom"),
		AuthorID: userID,
		Content:  content,
		Images:   string(imagesJSON),
	}
	if err := s.db.Create(&post).Error; err != nil {
		return MomentItem{}, err
	}

	items, err := s.buildMomentItems([]Moment{post}, userID)
	if err != nil {
		return MomentItem{}, err
	}
	if len(items) == 0 {
		return MomentItem{}, errors.New("动态创建失败")
	}
	return items[0], nil
}

func (s *Service) GetFeed(userID string) ([]MomentItem, error) {
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return nil, errors.New("缺少用户信息")
	}

	friends, err := s.social.ListFriends(userID)
	if err != nil {
		return nil, err
	}

	visibleIDs := make([]string, 0, len(friends)+1)
	visibleIDs = append(visibleIDs, userID)
	for _, friend := range friends {
		if !friend.IsBlocked && !friend.BlockedByPeer {
			visibleIDs = append(visibleIDs, friend.FriendID)
		}
	}
	if len(visibleIDs) == 0 {
		return []MomentItem{}, nil
	}

	var posts []Moment
	if err := s.db.Where("author_id IN ?", visibleIDs).Order("created_at desc").Find(&posts).Error; err != nil {
		return nil, err
	}
	return s.buildMomentItems(posts, userID)
}

func (s *Service) GetProfileFeed(viewerID, targetID string) ([]MomentItem, error) {
	viewerID = strings.TrimSpace(viewerID)
	targetID = strings.TrimSpace(targetID)
	if viewerID == "" || targetID == "" {
		return nil, errors.New("缺少用户信息")
	}
	if viewerID == targetID {
		return s.GetFeed(viewerID)
	}

	ok, err := s.isVisibleFriend(viewerID, targetID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, errors.New("无权查看该朋友圈")
	}

	var posts []Moment
	if err := s.db.Where("author_id = ?", targetID).Order("created_at desc").Find(&posts).Error; err != nil {
		return nil, err
	}
	return s.buildMomentItems(posts, viewerID)
}

func (s *Service) DeletePost(userID, momentID string) error {
	userID = strings.TrimSpace(userID)
	momentID = strings.TrimSpace(momentID)

	var post Moment
	if err := s.db.Where("id = ?", momentID).First(&post).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("动态不存在")
		}
		return err
	}
	if post.AuthorID != userID {
		return errors.New("只能删除自己的动态")
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&post).Error; err != nil {
			return err
		}
		if err := tx.Where("moment_id = ?", momentID).Delete(&MomentLike{}).Error; err != nil {
			return err
		}
		if err := tx.Where("moment_id = ?", momentID).Delete(&MomentComment{}).Error; err != nil {
			return err
		}
		return nil
	})
}

func (s *Service) LikePost(userID, momentID string) error {
	userID = strings.TrimSpace(userID)
	momentID = strings.TrimSpace(momentID)

	if err := s.ensurePostVisible(userID, momentID); err != nil {
		return err
	}

	like := MomentLike{
		ID:       newID("mlk"),
		MomentID: momentID,
		UserID:   userID,
	}
	return s.db.Create(&like).Error
}

func (s *Service) UnlikePost(userID, momentID string) error {
	userID = strings.TrimSpace(userID)
	momentID = strings.TrimSpace(momentID)
	return s.db.Where("moment_id = ? AND user_id = ?", momentID, userID).Delete(&MomentLike{}).Error
}

func (s *Service) AddComment(userID, momentID string, input AddCommentInput) (CommentItem, error) {
	userID = strings.TrimSpace(userID)
	momentID = strings.TrimSpace(momentID)
	content := strings.TrimSpace(input.Content)
	if content == "" {
		return CommentItem{}, errors.New("评论内容不能为空")
	}
	if utf8.RuneCountInString(content) > 1000 {
		return CommentItem{}, errors.New("评论太长")
	}

	if err := s.ensurePostVisible(userID, momentID); err != nil {
		return CommentItem{}, err
	}

	comment := MomentComment{
		ID:       newID("mcm"),
		MomentID: momentID,
		AuthorID: userID,
		Content:  content,
	}
	if err := s.db.Create(&comment).Error; err != nil {
		return CommentItem{}, err
	}

	authors, err := s.lookupAuthors([]string{comment.AuthorID})
	if err != nil {
		return CommentItem{}, err
	}
	return buildCommentItem(comment, userID, authors[comment.AuthorID])
}

func (s *Service) DeleteComment(userID, commentID string) error {
	userID = strings.TrimSpace(userID)
	commentID = strings.TrimSpace(commentID)

	var comment MomentComment
	if err := s.db.Where("id = ?", commentID).First(&comment).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("评论不存在")
		}
		return err
	}

	var post Moment
	if err := s.db.Where("id = ?", comment.MomentID).First(&post).Error; err != nil {
		return err
	}
	if comment.AuthorID != userID && post.AuthorID != userID {
		return errors.New("无权删除此评论")
	}

	return s.db.Delete(&comment).Error
}

func (s *Service) ensurePostVisible(userID, momentID string) error {
	var post Moment
	if err := s.db.Where("id = ?", momentID).First(&post).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("动态不存在")
		}
		return err
	}
	if post.AuthorID == userID {
		return nil
	}

	ok, err := s.isVisibleFriend(userID, post.AuthorID)
	if err != nil {
		return err
	}
	if !ok {
		return errors.New("无权查看此动态")
	}
	return nil
}

func (s *Service) isVisibleFriend(viewerID, authorID string) (bool, error) {
	isFriend, err := s.social.IsFriend(viewerID, authorID)
	if err != nil {
		return false, err
	}
	if !isFriend {
		return false, nil
	}

	blocked, err := s.isBlockedBy(viewerID, authorID)
	if err != nil {
		return false, err
	}
	if blocked {
		return false, nil
	}

	blocked, err = s.isBlockedBy(authorID, viewerID)
	if err != nil {
		return false, nil
	}
	if blocked {
		return false, nil
	}

	return true, nil
}

func (s *Service) isBlockedBy(userID, targetID string) (bool, error) {
	var friendship social.Friendship
	err := s.db.Where("user_id = ? AND friend_id = ?", userID, targetID).First(&friendship).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return friendship.IsBlocked, nil
}

func (s *Service) buildMomentItems(posts []Moment, viewerID string) ([]MomentItem, error) {
	if len(posts) == 0 {
		return []MomentItem{}, nil
	}

	postIDs := make([]string, 0, len(posts))
	authorIDs := make([]string, 0, len(posts))
	for _, post := range posts {
		postIDs = append(postIDs, post.ID)
		authorIDs = append(authorIDs, post.AuthorID)
	}

	var comments []MomentComment
	if err := s.db.Where("moment_id IN ?", postIDs).Order("created_at asc").Find(&comments).Error; err != nil {
		return nil, err
	}

	commentAuthors := make([]string, 0, len(comments))
	for _, comment := range comments {
		commentAuthors = append(commentAuthors, comment.AuthorID)
	}

	authors, err := s.lookupAuthors(append(authorIDs, commentAuthors...))
	if err != nil {
		return nil, err
	}

	var likes []MomentLike
	if err := s.db.Where("moment_id IN ?", postIDs).Find(&likes).Error; err != nil {
		return nil, err
	}

	likeCounts := make(map[string]int, len(posts))
	likedByViewer := make(map[string]bool, len(posts))
	for _, like := range likes {
		likeCounts[like.MomentID]++
		if like.UserID == viewerID {
			likedByViewer[like.MomentID] = true
		}
	}

	commentItemsByMoment := make(map[string][]CommentItem, len(posts))
	for _, comment := range comments {
		author, ok := authors[comment.AuthorID]
		if !ok {
			continue
		}
		item, err := buildCommentItem(comment, viewerID, author)
		if err != nil {
			continue
		}
		commentItemsByMoment[comment.MomentID] = append(commentItemsByMoment[comment.MomentID], item)
	}

	items := make([]MomentItem, 0, len(posts))
	for _, post := range posts {
		author, ok := authors[post.AuthorID]
		if !ok {
			continue
		}
		images, err := decodeImages(post.Images)
		if err != nil {
			return nil, err
		}
		items = append(items, MomentItem{
			ID:        post.ID,
			AuthorID:  post.AuthorID,
			Author:    author,
			Content:   post.Content,
			Images:    images,
			LikeCount: likeCounts[post.ID],
			LikedByMe: likedByViewer[post.ID],
			Comments:  commentItemsByMoment[post.ID],
			CanDelete: post.AuthorID == viewerID,
			CreatedAt: post.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	return items, nil
}

func (s *Service) lookupAuthors(userIDs []string) (map[string]AuthorInfo, error) {
	uniqueIDs := make([]string, 0, len(userIDs))
	seen := make(map[string]struct{}, len(userIDs))
	for _, userID := range userIDs {
		if _, ok := seen[userID]; ok || userID == "" {
			continue
		}
		seen[userID] = struct{}{}
		uniqueIDs = append(uniqueIDs, userID)
	}
	if len(uniqueIDs) == 0 {
		return map[string]AuthorInfo{}, nil
	}

	var users []auth.User
	if err := s.db.Where("id IN ?", uniqueIDs).Find(&users).Error; err != nil {
		return nil, err
	}

	authors := make(map[string]AuthorInfo, len(users))
	for _, user := range users {
		authors[user.ID] = AuthorInfo{
			ID:       user.ID,
			Username: user.Username,
			Nickname: user.Nickname,
			Avatar:   user.Avatar,
		}
	}
	return authors, nil
}

func buildCommentItem(comment MomentComment, viewerID string, author AuthorInfo) (CommentItem, error) {
	if author.ID == "" {
		return CommentItem{}, errors.New("评论作者不存在")
	}
	return CommentItem{
		ID:        comment.ID,
		AuthorID:  comment.AuthorID,
		Author:    author,
		Content:   comment.Content,
		CanDelete: comment.AuthorID == viewerID,
		CreatedAt: comment.CreatedAt.Format("2006-01-02 15:04:05"),
	}, nil
}

func decodeImages(raw string) ([]string, error) {
	if raw == "" {
		return []string{}, nil
	}

	var images []string
	if err := json.Unmarshal([]byte(raw), &images); err != nil {
		return nil, err
	}
	if images == nil {
		return []string{}, nil
	}
	return images, nil
}

func newID(prefix string) string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
	}
	return fmt.Sprintf("%s-%x", prefix, buf)
}
