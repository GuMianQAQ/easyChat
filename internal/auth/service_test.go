package auth

import (
	"path/filepath"
	"testing"
)

func TestRegisterLoginAndProfileFlow(t *testing.T) {
	svc, err := NewService(filepath.Join(t.TempDir(), "chat.db"))
	if err != nil {
		t.Fatalf("create service: %v", err)
	}
	t.Cleanup(func() {
		_ = svc.Close()
	})

	captcha, err := svc.Captcha()
	if err != nil {
		t.Fatalf("create captcha: %v", err)
	}

	svc.captchas.mu.Lock()
	code := svc.captchas.items[captcha.CaptchaID].code
	svc.captchas.mu.Unlock()

	registerResp, err := svc.Register(RegisterRequest{
		Username:    "tester_01",
		Password:    "123456",
		Nickname:    "小明",
		CaptchaID:   captcha.CaptchaID,
		CaptchaCode: code,
	})
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	if registerResp.User.Username != "tester_01" {
		t.Fatalf("unexpected username: %s", registerResp.User.Username)
	}
	if registerResp.Token == "" {
		t.Fatal("expected token")
	}

	loginResp, err := svc.Login(LoginRequest{
		Username: "tester_01",
		Password: "123456",
	})
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	if loginResp.User.Nickname != "小明" {
		t.Fatalf("unexpected nickname: %s", loginResp.User.Nickname)
	}

	user, err := svc.UserFromToken(loginResp.Token)
	if err != nil {
		t.Fatalf("user from token: %v", err)
	}
	if user.ID != loginResp.User.ID {
		t.Fatalf("unexpected user id: %s", user.ID)
	}

	updated, err := svc.UpdateProfile(loginResp.Token, UpdateProfileRequest{
		Nickname:  stringPtr("小红"),
		Avatar:    stringPtr("data:image/webp;base64,abc"),
		Gender:    stringPtr("female"),
		Region:    stringPtr("广东 深圳"),
		Signature: stringPtr("关于我的故事，还是听我的版本好一点"),
	})
	if err != nil {
		t.Fatalf("update profile: %v", err)
	}
	if updated.Nickname != "小红" || updated.Avatar == "" || updated.Gender != "female" || updated.Region == "" || updated.Signature == "" {
		t.Fatalf("unexpected updated user: %+v", updated)
	}
}

func stringPtr(value string) *string {
	return &value
}
