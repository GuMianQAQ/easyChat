package moments

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"easyChat/internal/auth"
	"easyChat/internal/social"

	"crypto/rand"
	"gorm.io/gorm"
)

type Service struct {
	db     *gorm.DB
	social *social.Service
}

func NewService(db *gorm.DB, social *social.Service) *Service {
	return &Service{db: db, social: social}
}

// ---------- post CRUD ----------

func (s *Service) CreatePost(userID string, input CreateMomentInput) (MomentItem, error) {
	userID = strings.TrimSpace(userID)
	content := strings.TrimSpace(input.Content)
	if content == "" {
		return MomentItem{}, errors.New("内容不能为空")
	}
	if len([]rune(content)) > 5000 {
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

	return s.buildMomentItem(post, userID)
}

func (s *Service) GetFeed(userID string) ([]MomentItem, error) {
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return nil, errors.New("缺少用户信息")
	}

	// 获取可见好友列表
	friends, err := s.social.ListFriends(userID)
	if err != nil {
		return nil, err
	}

	visibleIDs := make([]string, 0, len(friends)+1)
	visibleIDs = append(visibleIDs, userID)
	for _, f := range friends {
		if !f.IsBlocked && !f.BlockedByPeer {
			visibleIDs = append(visibleIDs, f.FriendID)
		}
	}

	if len(visibleIDs) == 0 {
		return []MomentItem{}, nil
	}

	var posts []Moment
	if err := s.db.Where("author_id IN ?", visibleIDs).
		Order("created_at desc").
		Find(&posts).Error; err != nil {
		return nil, err
	}

	items := make([]MomentItem, 0, len(posts))
	for _, post := range posts {
		item, err := s.buildMomentItem(post, userID)
		if err != nil {
			continue // skip items that fail to build (e.g. deleted author)
		}
		items = append(items, item)
	}
	return items, nil
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

// ---------- likes ----------

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
	return s.db.Where("moment_id = ? AND user_id = ?", momentID, userID).
		Delete(&MomentLike{}).Error
}

// ---------- comments ----------

func (s *Service) AddComment(userID, momentID string, input AddCommentInput) (CommentItem, error) {
	userID = strings.TrimSpace(userID)
	momentID = strings.TrimSpace(momentID)
	content := strings.TrimSpace(input.Content)
	if content == "" {
		return CommentItem{}, errors.New("评论内容不能为空")
	}
	if len([]rune(content)) > 1000 {
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

	return s.buildCommentItem(comment, userID)
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

	// 只有评论作者或动态作者可以删除评论
	var post Moment
	if err := s.db.Where("id = ?", comment.MomentID).First(&post).Error; err != nil {
		return err
	}
	if comment.AuthorID != userID && post.AuthorID != userID {
		return errors.New("无权删除此评论")
	}

	return s.db.Delete(&comment).Error
}

// ---------- visibility ----------

// ensurePostVisible checks that the user can see the given post.
func (s *Service) ensurePostVisible(userID, momentID string) error {
	var post Moment
	if err := s.db.Where("id = ?", momentID).First(&post).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("动态不存在")
		}
		return err
	}
	if post.AuthorID == userID {
		return nil // own post always visible
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

// isVisibleFriend checks friendship + block status.
func (s *Service) isVisibleFriend(viewerID, authorID string) (bool, error) {
	isFriend, err := s.social.IsFriend(viewerID, authorID)
	if err != nil {
		return false, err
	}
	if !isFriend {
		return false, nil
	}

	// Check viewer blocked author
	ok, err := s.isBlockedBy(viewerID, authorID)
	if err != nil {
		return false, err
	}
	if ok {
		return false, nil
	}

	// Check author blocked viewer
	ok, err = s.isBlockedBy(authorID, viewerID)
	if err != nil {
		return false, nil
	}
	if ok {
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

// ---------- item builders ----------

func (s *Service) buildMomentItem(post Moment, viewerID string) (MomentItem, error) {
	author, err := s.lookupAuthor(post.AuthorID)
	if err != nil {
		return MomentItem{}, err
	}

	var images []string
	if post.Images != "" {
		json.Unmarshal([]byte(post.Images), &images)
	}
	if images == nil {
		images = []string{}
	}

	var likes []MomentLike
	s.db.Where("moment_id = ?", post.ID).Find(&likes)

	var comments []MomentComment
	s.db.Where("moment_id = ?", post.ID).Order("created_at asc").Find(&comments)

	likedByMe := false
	for _, l := range likes {
		if l.UserID == viewerID {
			likedByMe = true
			break
		}
	}

	commentItems := make([]CommentItem, 0, len(comments))
	for _, c := range comments {
		ci, err := s.buildCommentItem(c, viewerID)
		if err != nil {
			continue
		}
		commentItems = append(commentItems, ci)
	}

	return MomentItem{
		ID:        post.ID,
		AuthorID:  post.AuthorID,
		Author:    author,
		Content:   post.Content,
		Images:    images,
		LikeCount: len(likes),
		LikedByMe: likedByMe,
		Comments:  commentItems,
		CanDelete: post.AuthorID == viewerID,
		CreatedAt: post.CreatedAt.Format("2006-01-02 15:04:05"),
	}, nil
}

func (s *Service) buildCommentItem(comment MomentComment, viewerID string) (CommentItem, error) {
	author, err := s.lookupAuthor(comment.AuthorID)
	if err != nil {
		return CommentItem{}, err
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

func (s *Service) lookupAuthor(userID string) (AuthorInfo, error) {
	var user auth.User
	if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil {
		return AuthorInfo{}, err
	}
	return AuthorInfo{
		ID:       user.ID,
		Username: user.Username,
		Nickname: user.Nickname,
		Avatar:   user.Avatar,
	}, nil
}

func newID(prefix string) string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
	}
	return fmt.Sprintf("%s-%x", prefix, buf)
}
