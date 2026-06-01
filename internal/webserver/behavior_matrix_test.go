package webserver

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"easyChat/internal/auth"
	"easyChat/internal/chatstore"
	"easyChat/internal/database"
	"easyChat/internal/social"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type apiTestEnv struct {
	server *Server
	router *gin.Engine
	db     *gorm.DB
}

func newAPITestEnv(t *testing.T) *apiTestEnv {
	t.Helper()

	gin.SetMode(gin.TestMode)

	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "webserver.db")), &gorm.Config{})
	if err != nil {
		t.Fatalf("open database: %v", err)
	}
	if err := database.AutoMigrate(db); err != nil {
		t.Fatalf("migrate database: %v", err)
	}

	authService, err := auth.NewService(db, auth.Config{
		JWT: auth.JWTConfig{
			Secret: "test-secret",
			TTL:    24 * time.Hour,
		},
	})
	if err != nil {
		t.Fatalf("create auth service: %v", err)
	}
	store, err := chatstore.NewService(db, filepath.Join(t.TempDir(), "uploads"), chatstore.Config{
		MaxImageBytes: 2 * 1024 * 1024,
		MaxFileBytes:  10 * 1024 * 1024,
	})
	if err != nil {
		t.Fatalf("create store service: %v", err)
	}
	socialService, err := social.NewService(db)
	if err != nil {
		t.Fatalf("create social service: %v", err)
	}

	server := &Server{
		Auth:            authService,
		Store:           store,
		Social:          socialService,
		frontendDistDir: t.TempDir(),
		uploadsDir:      filepath.Join(t.TempDir(), "uploads"),
	}
	router := gin.New()
	server.registerAPIRoutes(router)

	t.Cleanup(func() {
		sqlDB, err := db.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	return &apiTestEnv{
		server: server,
		router: router,
		db:     db,
	}
}

func (env *apiTestEnv) createUser(t *testing.T, id, username, password, nickname string) (auth.User, string) {
	t.Helper()

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("generate password hash: %v", err)
	}
	user := auth.User{
		ID:                  id,
		Username:            username,
		PasswordHash:        string(hash),
		Nickname:            nickname,
		AllowSearch:         true,
		AllowFriendRequest:  true,
		RequireFriendVerify: true,
	}
	if err := env.db.Create(&user).Error; err != nil {
		t.Fatalf("create user %s: %v", id, err)
	}

	resp, err := env.server.Auth.Login(auth.LoginRequest{
		Username: username,
		Password: password,
	})
	if err != nil {
		t.Fatalf("login user %s: %v", id, err)
	}
	return user, resp.Token
}

func (env *apiTestEnv) createFriendship(t *testing.T, left, right auth.User) {
	t.Helper()
	for _, item := range []social.Friendship{
		{ID: fmt.Sprintf("frd-%s-%s", left.ID, right.ID), UserID: left.ID, FriendID: right.ID, Permission: "chat"},
		{ID: fmt.Sprintf("frd-%s-%s", right.ID, left.ID), UserID: right.ID, FriendID: left.ID, Permission: "chat"},
	} {
		if err := env.db.Create(&item).Error; err != nil {
			t.Fatalf("create friendship %+v: %v", item, err)
		}
	}
}

func (env *apiTestEnv) request(t *testing.T, method, path, token string, body any) *httptest.ResponseRecorder {
	t.Helper()

	var payload []byte
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal request body: %v", err)
		}
		payload = data
	}

	req := httptest.NewRequest(method, path, bytes.NewReader(payload))
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	recorder := httptest.NewRecorder()
	env.router.ServeHTTP(recorder, req)
	return recorder
}

func TestAcceptFriendRequestEnsuresPrivateConversation(t *testing.T) {
	env := newAPITestEnv(t)
	alice, aliceToken := env.createUser(t, "u-alice", "alice_01", "pass123", "Alice")
	bob, bobToken := env.createUser(t, "u-bob", "bob_01", "pass123", "Bob")

	send := env.request(t, http.MethodPost, "/api/friend-requests", aliceToken, map[string]any{
		"toUserId": bob.ID,
		"message":  "hi",
	})
	if send.Code != http.StatusOK {
		t.Fatalf("expected send request 200, got %d body=%s", send.Code, send.Body.String())
	}

	var request social.FriendRequest
	if err := env.db.Where("from_user_id = ? AND to_user_id = ?", alice.ID, bob.ID).First(&request).Error; err != nil {
		t.Fatalf("load friend request: %v", err)
	}

	accept := env.request(t, http.MethodPost, "/api/friend-requests/"+request.ID+"/accept", bobToken, nil)
	if accept.Code != http.StatusOK {
		t.Fatalf("expected accept request 200, got %d body=%s", accept.Code, accept.Body.String())
	}

	if ok, err := env.server.Social.IsFriend(alice.ID, bob.ID); err != nil {
		t.Fatalf("friendship lookup alice->bob: %v", err)
	} else if !ok {
		t.Fatal("expected alice to befriend bob after acceptance")
	}
	if ok, err := env.server.Social.IsFriend(bob.ID, alice.ID); err != nil {
		t.Fatalf("friendship lookup bob->alice: %v", err)
	} else if !ok {
		t.Fatal("expected bob to befriend alice after acceptance")
	}

	conversationID := chatstore.StablePrivateConversationID(alice.ID, bob.ID)
	aliceConversations, err := env.server.Store.ListConversations(alice.ID)
	if err != nil {
		t.Fatalf("list alice conversations: %v", err)
	}
	bobConversations, err := env.server.Store.ListConversations(bob.ID)
	if err != nil {
		t.Fatalf("list bob conversations: %v", err)
	}

	if !containsConversation(aliceConversations, conversationID) || !containsConversation(bobConversations, conversationID) {
		t.Fatalf("expected private conversation %s to exist for both users", conversationID)
	}
}

func TestCreateGroupConversationRejectsNonFriendMembers(t *testing.T) {
	env := newAPITestEnv(t)
	owner, ownerToken := env.createUser(t, "u-owner", "owner_01", "pass123", "Owner")
	friend, _ := env.createUser(t, "u-friend", "friend_01", "pass123", "Friend")
	stranger, _ := env.createUser(t, "u-stranger", "stranger_01", "pass123", "Stranger")

	env.createFriendship(t, owner, friend)

	denied := env.request(t, http.MethodPost, "/api/conversations/group", ownerToken, map[string]any{
		"name":      "Team",
		"memberIds": []string{friend.ID, stranger.ID},
	})
	if denied.Code != http.StatusForbidden {
		t.Fatalf("expected non-friend invite to return 403, got %d body=%s", denied.Code, denied.Body.String())
	}

	allowed := env.request(t, http.MethodPost, "/api/conversations/group", ownerToken, map[string]any{
		"name":      "Team",
		"memberIds": []string{friend.ID},
	})
	if allowed.Code != http.StatusOK {
		t.Fatalf("expected friend-only invite to succeed, got %d body=%s", allowed.Code, allowed.Body.String())
	}
}

func TestProtectedRoutesRequireValidAuthentication(t *testing.T) {
	env := newAPITestEnv(t)
	_, token := env.createUser(t, "u-auth", "auth_01", "pass123", "Auth User")

	tests := []struct {
		method string
		path   string
	}{
		{method: http.MethodGet, path: "/api/auth/me"},
		{method: http.MethodGet, path: "/api/conversations"},
		{method: http.MethodGet, path: "/api/friend-requests"},
	}

	for _, tc := range tests {
		withoutToken := env.request(t, tc.method, tc.path, "", nil)
		if withoutToken.Code != http.StatusUnauthorized {
			t.Fatalf("%s %s without token: expected 401, got %d", tc.method, tc.path, withoutToken.Code)
		}

		withInvalidToken := env.request(t, tc.method, tc.path, "invalid-token", nil)
		if withInvalidToken.Code != http.StatusUnauthorized {
			t.Fatalf("%s %s with invalid token: expected 401, got %d", tc.method, tc.path, withInvalidToken.Code)
		}

		withValidToken := env.request(t, tc.method, tc.path, token, nil)
		if withValidToken.Code != http.StatusOK {
			t.Fatalf("%s %s with valid token: expected 200, got %d body=%s", tc.method, tc.path, withValidToken.Code, withValidToken.Body.String())
		}
	}
}

func TestPasswordChangeRoutePreservesReloginSemantics(t *testing.T) {
	env := newAPITestEnv(t)
	_, token := env.createUser(t, "u-password", "password_01", "oldpass1", "Password User")

	change := env.request(t, http.MethodPut, "/api/users/me/password", token, map[string]any{
		"oldPassword":     "oldpass1",
		"newPassword":     "newpass2",
		"confirmPassword": "newpass2",
	})
	if change.Code != http.StatusOK {
		t.Fatalf("expected password change 200, got %d body=%s", change.Code, change.Body.String())
	}

	if _, err := env.server.Auth.Login(auth.LoginRequest{
		Username: "password_01",
		Password: "oldpass1",
	}); err == nil {
		t.Fatal("expected old password login to fail after password change")
	}

	if _, err := env.server.Auth.Login(auth.LoginRequest{
		Username: "password_01",
		Password: "newpass2",
	}); err != nil {
		t.Fatalf("expected new password login to succeed: %v", err)
	}
}

func containsConversation(items []chatstore.ConversationSummary, conversationID string) bool {
	for _, item := range items {
		if item.ID == conversationID {
			return true
		}
	}
	return false
}
