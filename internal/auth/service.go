package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/glebarez/sqlite"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const tokenTTL = 24 * time.Hour

var usernamePattern = regexp.MustCompile(`^[A-Za-z0-9_]{3,20}$`)

type User struct {
	ID                  string `gorm:"primaryKey"`
	Username            string `gorm:"uniqueIndex;size:32;not null"`
	PasswordHash        string `gorm:"size:128;not null"`
	Nickname            string `gorm:"size:64;not null"`
	Avatar              string `gorm:"type:text"`
	Gender              string `gorm:"size:16;not null;default:unknown"`
	Region              string `gorm:"size:64"`
	Signature           string `gorm:"size:120"`
	AllowSearch         bool   `gorm:"not null;default:true"`
	AllowFriendRequest  bool   `gorm:"not null;default:true"`
	RequireFriendVerify bool   `gorm:"not null;default:true"`
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

type PublicUser struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	Nickname  string `json:"nickname"`
	Avatar    string `json:"avatar,omitempty"`
	Gender    string `json:"gender"`
	Region    string `json:"region,omitempty"`
	Signature string `json:"signature,omitempty"`
}

type AuthResponse struct {
	Token string     `json:"token"`
	User  PublicUser `json:"user"`
}

type RegisterRequest struct {
	Username        string `json:"username"`
	Password        string `json:"password"`
	ConfirmPassword string `json:"confirmPassword"`
	Nickname        string `json:"nickname"`
	Avatar          string `json:"avatar"`
	CaptchaID       string `json:"captchaId"`
	CaptchaCode     string `json:"captchaCode"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type UpdateProfileRequest struct {
	Nickname  *string `json:"nickname"`
	Avatar    *string `json:"avatar"`
	Gender    *string `json:"gender"`
	Region    *string `json:"region"`
	Signature *string `json:"signature"`
}

type ChangePasswordRequest struct {
	OldPassword     string `json:"oldPassword"`
	NewPassword     string `json:"newPassword"`
	ConfirmPassword string `json:"confirmPassword"`
}

type Service struct {
	db       *gorm.DB
	captchas *CaptchaStore
	secret   []byte
}

func NewService(dbPath string) (*Service, error) {
	if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
		return nil, err
	}

	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	if err := db.AutoMigrate(&User{}); err != nil {
		return nil, err
	}

	secret := strings.TrimSpace(os.Getenv("EASYCHAT_JWT_SECRET"))
	if secret == "" {
		secret = "easychat-local-development-secret"
	}

	return &Service{
		db:       db,
		captchas: NewCaptchaStore(),
		secret:   []byte(secret),
	}, nil
}

func (s *Service) Captcha() (CaptchaResponse, error) {
	return s.captchas.Create()
}

func (s *Service) Register(req RegisterRequest) (AuthResponse, error) {
	username, err := normalizeUsername(req.Username)
	if err != nil {
		return AuthResponse{}, err
	}
	if err := validatePassword(req.Password); err != nil {
		return AuthResponse{}, err
	}
	if confirmPassword := strings.TrimSpace(req.ConfirmPassword); confirmPassword != "" && req.Password != confirmPassword {
		return AuthResponse{}, errors.New("两次输入的密码不一致")
	}
	nickname, err := normalizeNickname(req.Nickname)
	if err != nil {
		return AuthResponse{}, err
	}
	if strings.TrimSpace(req.CaptchaID) == "" || strings.TrimSpace(req.CaptchaCode) == "" {
		return AuthResponse{}, errors.New("璇疯緭鍏ラ獙璇佺爜")
	}
	if !s.captchas.Verify(req.CaptchaID, req.CaptchaCode) {
		return AuthResponse{}, errors.New("验证码错误")
	}

	var count int64
	if err := s.db.Model(&User{}).Where("username = ?", username).Count(&count).Error; err != nil {
		return AuthResponse{}, err
	}
	if count > 0 {
		return AuthResponse{}, errors.New("账号已存在")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return AuthResponse{}, err
	}

	user := User{
		ID:                  newID("usr"),
		Username:            username,
		PasswordHash:        string(hash),
		Nickname:            nickname,
		Avatar:              strings.TrimSpace(req.Avatar),
		Gender:              "unknown",
		Region:              "",
		Signature:           "",
		AllowSearch:         true,
		AllowFriendRequest:  true,
		RequireFriendVerify: true,
	}
	if err := s.db.Create(&user).Error; err != nil {
		return AuthResponse{}, err
	}

	return s.authResponse(user)
}

func (s *Service) Login(req LoginRequest) (AuthResponse, error) {
	username := strings.TrimSpace(req.Username)
	if username == "" {
		return AuthResponse{}, errors.New("请输入账号")
	}
	if req.Password == "" {
		return AuthResponse{}, errors.New("请输入密码")
	}

	var user User
	if err := s.db.Where("username = ?", username).First(&user).Error; err != nil {
		return AuthResponse{}, errors.New("账号或密码错误")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return AuthResponse{}, errors.New("账号或密码错误")
	}

	return s.authResponse(user)
}

func (s *Service) UserFromToken(token string) (PublicUser, error) {
	claims, err := s.verifyToken(strings.TrimSpace(token))
	if err != nil {
		return PublicUser{}, err
	}

	var user User
	if err := s.db.First(&user, "id = ?", claims.UserID).Error; err != nil {
		return PublicUser{}, errors.New("登录已过期，请重新登录")
	}
	return publicUser(user), nil
}

func (s *Service) UpdateProfile(token string, req UpdateProfileRequest) (PublicUser, error) {
	claims, err := s.verifyToken(strings.TrimSpace(token))
	if err != nil {
		return PublicUser{}, err
	}

	var user User
	if err := s.db.First(&user, "id = ?", claims.UserID).Error; err != nil {
		return PublicUser{}, errors.New("登录已过期，请重新登录")
	}

	if req.Nickname != nil {
		nickname, err := normalizeNickname(*req.Nickname)
		if err != nil {
			return PublicUser{}, err
		}
		user.Nickname = nickname
	}
	if req.Avatar != nil {
		user.Avatar = strings.TrimSpace(*req.Avatar)
	}
	if req.Gender != nil {
		gender, err := normalizeGender(*req.Gender)
		if err != nil {
			return PublicUser{}, err
		}
		user.Gender = gender
	}
	if req.Region != nil {
		region, err := normalizeRegion(*req.Region)
		if err != nil {
			return PublicUser{}, err
		}
		user.Region = region
	}
	if req.Signature != nil {
		signature, err := normalizeSignature(*req.Signature)
		if err != nil {
			return PublicUser{}, err
		}
		user.Signature = signature
	}

	if err := s.db.Save(&user).Error; err != nil {
		return PublicUser{}, err
	}
	return publicUser(user), nil
}

func (s *Service) ChangePassword(token string, req ChangePasswordRequest) error {
	claims, err := s.verifyToken(strings.TrimSpace(token))
	if err != nil {
		return err
	}

	oldPassword := strings.TrimSpace(req.OldPassword)
	newPassword := strings.TrimSpace(req.NewPassword)
	confirmPassword := strings.TrimSpace(req.ConfirmPassword)
	if oldPassword == "" {
		return errors.New("请输入旧密码")
	}
	if newPassword == "" {
		return errors.New("请输入新密码")
	}
	if confirmPassword == "" {
		return errors.New("请输入确认密码")
	}
	if newPassword != confirmPassword {
		return errors.New("两次输入的新密码不一致")
	}
	if utf8.RuneCountInString(newPassword) < 6 || utf8.RuneCountInString(newPassword) > 32 {
		return errors.New("密码长度需为 6-32 位")
	}
	if oldPassword == newPassword {
		return errors.New("新密码不能和旧密码一样")
	}

	var user User
	if err := s.db.First(&user, "id = ?", claims.UserID).Error; err != nil {
		return errors.New("登录已过期，请重新登录")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		return errors.New("旧密码错误")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	user.PasswordHash = string(hash)
	if err := s.db.Save(&user).Error; err != nil {
		return err
	}
	return nil
}

func (s *Service) Close() error {
	sqlDB, err := s.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

func (s *Service) authResponse(user User) (AuthResponse, error) {
	token, err := s.createToken(user.ID)
	if err != nil {
		return AuthResponse{}, err
	}
	return AuthResponse{Token: token, User: publicUser(user)}, nil
}

func publicUser(user User) PublicUser {
	return PublicUser{
		ID:        user.ID,
		Username:  user.Username,
		Nickname:  user.Nickname,
		Avatar:    user.Avatar,
		Gender:    safeGender(user.Gender),
		Region:    user.Region,
		Signature: user.Signature,
	}
}

type tokenClaims struct {
	UserID string `json:"userId"`
	Exp    int64  `json:"exp"`
}

func (s *Service) createToken(userID string) (string, error) {
	header, err := json.Marshal(map[string]string{"alg": "HS256", "typ": "JWT"})
	if err != nil {
		return "", err
	}
	body, err := json.Marshal(tokenClaims{UserID: userID, Exp: time.Now().Add(tokenTTL).Unix()})
	if err != nil {
		return "", err
	}

	encodedHeader := base64.RawURLEncoding.EncodeToString(header)
	encodedBody := base64.RawURLEncoding.EncodeToString(body)
	unsigned := encodedHeader + "." + encodedBody
	signature := sign(unsigned, s.secret)
	return unsigned + "." + signature, nil
}

func (s *Service) verifyToken(token string) (tokenClaims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return tokenClaims{}, errors.New("登录已过期，请重新登录")
	}

	expected := sign(parts[0]+"."+parts[1], s.secret)
	if !hmac.Equal([]byte(expected), []byte(parts[2])) {
		return tokenClaims{}, errors.New("登录已过期，请重新登录")
	}

	raw, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return tokenClaims{}, errors.New("登录已过期，请重新登录")
	}

	var claims tokenClaims
	if err := json.Unmarshal(raw, &claims); err != nil {
		return tokenClaims{}, errors.New("登录已过期，请重新登录")
	}
	if claims.UserID == "" || claims.Exp < time.Now().Unix() {
		return tokenClaims{}, errors.New("登录已过期，请重新登录")
	}
	return claims, nil
}

func sign(value string, secret []byte) string {
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write([]byte(value))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func normalizeUsername(username string) (string, error) {
	trimmed := strings.TrimSpace(username)
	if trimmed == "" {
		return "", errors.New("请输入账号")
	}
	if !usernamePattern.MatchString(trimmed) {
		return "", errors.New("账号需为 3-20 位字母、数字或下划线")
	}
	return trimmed, nil
}

func validatePassword(password string) error {
	if password == "" {
		return errors.New("请输入密码")
	}
	if utf8.RuneCountInString(password) < 6 {
		return errors.New("密码至少 6 位")
	}
	return nil
}

func normalizeNickname(nickname string) (string, error) {
	trimmed := strings.TrimSpace(nickname)
	if trimmed == "" {
		return "", errors.New("鏄电О涓嶈兘涓虹┖")
	}
	if count := utf8.RuneCountInString(trimmed); count < 1 || count > 20 {
		return "", errors.New("昵称最多 20 个字符")
	}
	return trimmed, nil
}

func normalizeGender(gender string) (string, error) {
	switch strings.TrimSpace(gender) {
	case "", "unknown":
		return "unknown", nil
	case "male", "female":
		return strings.TrimSpace(gender), nil
	default:
		return "", errors.New("鎬у埆鍙傛暟鏃犳晥")
	}
}

func safeGender(gender string) string {
	switch gender {
	case "male", "female":
		return gender
	default:
		return "unknown"
	}
}

func normalizeRegion(region string) (string, error) {
	trimmed := strings.TrimSpace(region)
	if utf8.RuneCountInString(trimmed) > 40 {
		return "", errors.New("地区最多 40 个字符")
	}
	return trimmed, nil
}

func normalizeSignature(signature string) (string, error) {
	trimmed := strings.TrimSpace(signature)
	if utf8.RuneCountInString(trimmed) > 100 {
		return "", errors.New("个性签名最多 100 个字符")
	}
	return trimmed, nil
}

func newID(prefix string) string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
	}
	return fmt.Sprintf("%s-%x", prefix, buf)
}
