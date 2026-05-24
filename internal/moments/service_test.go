package moments

import (
	"path/filepath"
	"testing"

	"easyChat/internal/auth"
	"easyChat/internal/social"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func newTestService(t *testing.T) *Service {
	t.Helper()
	dbPath := filepath.Join(t.TempDir(), "moments.db")
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		t.Fatalf("open database failed: %v", err)
	}
	if err := db.AutoMigrate(&auth.User{}, &social.Friendship{}, &social.FriendRequest{}, &Moment{}, &MomentLike{}, &MomentComment{}); err != nil {
		t.Fatalf("migrate database failed: %v", err)
	}

	// Social needs auth models to have been registered too
	if err := db.AutoMigrate(&auth.User{}); err != nil {
		t.Fatalf("migrate auth failed: %v", err)
	}

	socialSvc, err := social.NewService(db)
	if err != nil {
		t.Fatalf("social.NewService failed: %v", err)
	}
	svc := NewService(db, socialSvc)

	t.Cleanup(func() {
		sqlDB, err := db.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})
	return svc
}

// ---------- helpers ----------

func createUser(t *testing.T, db *gorm.DB, id, username, nickname string) {
	t.Helper()
	user := auth.User{
		ID:                  id,
		Username:            username,
		Nickname:            nickname,
		PasswordHash:        "hash",
		AllowSearch:         true,
		AllowFriendRequest:  true,
		RequireFriendVerify: false,
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user %s failed: %v", id, err)
	}
}

func makeFriends(t *testing.T, svc *Service, userID, friendID string) {
	t.Helper()
	for _, item := range []social.Friendship{
		{ID: userID + "-" + friendID, UserID: userID, FriendID: friendID, Permission: "chat"},
		{ID: friendID + "-" + userID, UserID: friendID, FriendID: userID, Permission: "chat"},
	} {
		if err := svc.db.Create(&item).Error; err != nil {
			t.Fatalf("create friendship %+v: %v", item, err)
		}
	}
}

// ---------- tests ----------

func TestCreatePostWithContent(t *testing.T) {
	svc := newTestService(t)
	createUser(t, svc.db, "u-alice", "alice", "Alice")

	post, err := svc.CreatePost("u-alice", CreateMomentInput{Content: "Hello Moments!"})
	if err != nil {
		t.Fatalf("CreatePost failed: %v", err)
	}
	if post.Content != "Hello Moments!" {
		t.Fatalf("expected content 'Hello Moments!', got %q", post.Content)
	}
	if post.AuthorID != "u-alice" {
		t.Fatalf("expected author u-alice, got %q", post.AuthorID)
	}
	if !post.CanDelete {
		t.Fatal("expected canDelete true for own post")
	}
}

func TestCreatePostEmptyContent(t *testing.T) {
	svc := newTestService(t)
	createUser(t, svc.db, "u-alice", "alice", "Alice")

	_, err := svc.CreatePost("u-alice", CreateMomentInput{Content: ""})
	if err == nil {
		t.Fatal("expected error for empty content")
	}
}

func TestFeedIncludesOwnPosts(t *testing.T) {
	svc := newTestService(t)
	createUser(t, svc.db, "u-alice", "alice", "Alice")

	svc.CreatePost("u-alice", CreateMomentInput{Content: "Post 1"})
	svc.CreatePost("u-alice", CreateMomentInput{Content: "Post 2"})

	feed, err := svc.GetFeed("u-alice")
	if err != nil {
		t.Fatalf("GetFeed failed: %v", err)
	}
	if len(feed) != 2 {
		t.Fatalf("expected 2 own posts, got %d", len(feed))
	}
	if feed[0].CreatedAt < feed[1].CreatedAt {
		t.Fatal("expected newest-first order")
	}
}

func TestFeedShowsFriendPosts(t *testing.T) {
	svc := newTestService(t)
	createUser(t, svc.db, "u-alice", "alice", "Alice")
	createUser(t, svc.db, "u-bob", "bob", "Bob")

	makeFriends(t, svc, "u-alice", "u-bob")

	svc.CreatePost("u-alice", CreateMomentInput{Content: "Alice post"})
	svc.CreatePost("u-bob", CreateMomentInput{Content: "Bob post"})

	feed, err := svc.GetFeed("u-alice")
	if err != nil {
		t.Fatalf("GetFeed failed: %v", err)
	}
	if len(feed) != 2 {
		t.Fatalf("expected 2 posts (self + friend), got %d", len(feed))
	}
}

func TestFeedHidesNonFriendPosts(t *testing.T) {
	svc := newTestService(t)
	createUser(t, svc.db, "u-alice", "alice", "Alice")
	createUser(t, svc.db, "u-bob", "bob", "Bob")
	createUser(t, svc.db, "u-charlie", "charlie", "Charlie")

	makeFriends(t, svc, "u-alice", "u-bob")

	svc.CreatePost("u-bob", CreateMomentInput{Content: "Bob post"})
	svc.CreatePost("u-charlie", CreateMomentInput{Content: "Charlie post"})

	feed, err := svc.GetFeed("u-alice")
	if err != nil {
		t.Fatalf("GetFeed failed: %v", err)
	}
	// Alice is friend with Bob, but not Charlie
	if len(feed) != 1 {
		t.Fatalf("expected 1 post (Bob, friend), got %d", len(feed))
	}
	if feed[0].AuthorID != "u-bob" {
		t.Fatal("expected only Bob's post in feed")
	}
}

func TestFeedRespectsBlock(t *testing.T) {
	svc := newTestService(t)
	createUser(t, svc.db, "u-alice", "alice", "Alice")
	createUser(t, svc.db, "u-bob", "bob", "Bob")

	makeFriends(t, svc, "u-alice", "u-bob")

	svc.CreatePost("u-bob", CreateMomentInput{Content: "Bob post"})

	// Alice blocks Bob
	for _, f := range getFriends(t, svc, "u-alice") {
		if f.FriendID == "u-bob" {
			svc.social.BlockFriend("u-alice", "u-bob")
			break
		}
	}

	feed, err := svc.GetFeed("u-alice")
	if err != nil {
		t.Fatalf("GetFeed failed: %v", err)
	}
	if len(feed) != 0 {
		t.Fatalf("expected 0 posts (Bob blocked), got %d", len(feed))
	}
}

func TestLikeAndUnlikePost(t *testing.T) {
	svc := newTestService(t)
	createUser(t, svc.db, "u-alice", "alice", "Alice")
	createUser(t, svc.db, "u-bob", "bob", "Bob")
	makeFriends(t, svc, "u-alice", "u-bob")

	post, _ := svc.CreatePost("u-alice", CreateMomentInput{Content: "Nice day!"})

	if err := svc.LikePost("u-bob", post.ID); err != nil {
		t.Fatalf("LikePost failed: %v", err)
	}

	feed, _ := svc.GetFeed("u-bob")
	if len(feed) != 1 {
		t.Fatalf("expected 1 post in feed, got %d", len(feed))
	}
	if feed[0].LikeCount != 1 {
		t.Fatalf("expected likeCount=1, got %d", feed[0].LikeCount)
	}
	if !feed[0].LikedByMe {
		t.Fatal("expected LikedByMe=true")
	}

	// Unlike
	if err := svc.UnlikePost("u-bob", post.ID); err != nil {
		t.Fatalf("UnlikePost failed: %v", err)
	}
	feed, _ = svc.GetFeed("u-bob")
	if feed[0].LikeCount != 0 {
		t.Fatalf("expected likeCount=0 after unlike, got %d", feed[0].LikeCount)
	}
	if feed[0].LikedByMe {
		t.Fatal("expected LikedByMe=false after unlike")
	}
}

func TestLikeNonFriendPost(t *testing.T) {
	svc := newTestService(t)
	createUser(t, svc.db, "u-alice", "alice", "Alice")
	createUser(t, svc.db, "u-bob", "bob", "Bob")

	post, _ := svc.CreatePost("u-alice", CreateMomentInput{Content: "Private"})

	err := svc.LikePost("u-bob", post.ID)
	if err == nil {
		t.Fatal("expected error when liking non-friend's post")
	}
}

func TestAddAndDeleteComment(t *testing.T) {
	svc := newTestService(t)
	createUser(t, svc.db, "u-alice", "alice", "Alice")
	createUser(t, svc.db, "u-bob", "bob", "Bob")
	makeFriends(t, svc, "u-alice", "u-bob")

	post, _ := svc.CreatePost("u-alice", CreateMomentInput{Content: "Hello"})

	comment, err := svc.AddComment("u-bob", post.ID, AddCommentInput{Content: "Nice!"})
	if err != nil {
		t.Fatalf("AddComment failed: %v", err)
	}
	if comment.Content != "Nice!" {
		t.Fatalf("expected comment content 'Nice!', got %q", comment.Content)
	}

	feed, _ := svc.GetFeed("u-alice")
	if len(feed) != 1 || len(feed[0].Comments) != 1 {
		t.Fatalf("expected 1 comment, got %d", len(feed[0].Comments))
	}

	// Delete comment
	if err := svc.DeleteComment("u-bob", comment.ID); err != nil {
		t.Fatalf("DeleteComment failed: %v", err)
	}
	feed, _ = svc.GetFeed("u-alice")
	if len(feed[0].Comments) != 0 {
		t.Fatal("expected 0 comments after delete")
	}
}

func TestDeletePostOnlyByAuthor(t *testing.T) {
	svc := newTestService(t)
	createUser(t, svc.db, "u-alice", "alice", "Alice")
	createUser(t, svc.db, "u-bob", "bob", "Bob")
	makeFriends(t, svc, "u-alice", "u-bob")

	post, _ := svc.CreatePost("u-alice", CreateMomentInput{Content: "My post"})

	// Non-author cannot delete
	err := svc.DeletePost("u-bob", post.ID)
	if err == nil {
		t.Fatal("expected error when non-author deletes post")
	}

	// Author can delete
	if err := svc.DeletePost("u-alice", post.ID); err != nil {
		t.Fatalf("DeletePost by author failed: %v", err)
	}

	feed, _ := svc.GetFeed("u-alice")
	if len(feed) != 0 {
		t.Fatal("expected 0 posts after delete")
	}
}

func TestDeletePostCascadesLikesAndComments(t *testing.T) {
	svc := newTestService(t)
	createUser(t, svc.db, "u-alice", "alice", "Alice")
	createUser(t, svc.db, "u-bob", "bob", "Bob")
	makeFriends(t, svc, "u-alice", "u-bob")

	post, _ := svc.CreatePost("u-alice", CreateMomentInput{Content: "Cascade test"})
	svc.LikePost("u-bob", post.ID)
	svc.AddComment("u-bob", post.ID, AddCommentInput{Content: "Nice!"})

	svc.DeletePost("u-alice", post.ID)

	// Verify likes and comments were deleted
	var likes []MomentLike
	svc.db.Where("moment_id = ?", post.ID).Find(&likes)
	if len(likes) != 0 {
		t.Fatalf("expected 0 likes after cascade delete, got %d", len(likes))
	}

	var comments []MomentComment
	svc.db.Where("moment_id = ?", post.ID).Find(&comments)
	if len(comments) != 0 {
		t.Fatalf("expected 0 comments after cascade delete, got %d", len(comments))
	}
}

func TestAddCommentEmptyContent(t *testing.T) {
	svc := newTestService(t)
	createUser(t, svc.db, "u-alice", "alice", "Alice")

	post, _ := svc.CreatePost("u-alice", CreateMomentInput{Content: "Hello"})
	_, err := svc.AddComment("u-alice", post.ID, AddCommentInput{Content: ""})
	if err == nil {
		t.Fatal("expected error for empty comment")
	}
}

// ---------- test helpers ----------

func getFriends(t *testing.T, svc *Service, userID string) []social.FriendItem {
	t.Helper()
	items, err := svc.social.ListFriends(userID)
	if err != nil {
		t.Fatalf("ListFriends failed: %v", err)
	}
	return items
}
