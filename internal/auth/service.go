package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	apperrors "easyChat/internal/errors"
	"easyChat/internal/uid"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const (
	errPasswordsMismatch      = "两次输入的密码不一致"
	errCaptchaRequired        = "请输入验证码"
	errCaptchaInvalid         = "验证码错误"
	errAccountExists          = "账号已存在"
	errUsernameRequired       = "请输入账号"
	errPasswordRequired       = "请输入密码"
	errCredentialsInvalid     = "账号或密码错误"
	errAuthExpired            = "登录已过期，请重新登录"
	errOldPasswordRequired    = "请输入旧密码"
	errNewPasswordRequired    = "请输入新密码"
	errConfirmPasswordMissing = "请输入确认密码"
	errNewPasswordMismatch    = "两次输入的新密码不一致"
	errPasswordLengthRange    = "密码长度需为 6-32 位"
	errPasswordSameAsOld      = "新密码不能和旧密码一样"
	errOldPasswordInvalid     = "旧密码错误"
	errUsernameFormat         = "账号需为 3-20 位字母、数字或下划线"
	errPasswordTooShort       = "密码至少 6 位"
	errNicknameRequired       = "昵称不能为空"
	errNicknameTooLong        = "昵称最多 20 个字符"
	errGenderInvalid          = "性别参数无效"
	errRegionTooLong          = "地区最多 40 个字符"
	errSignatureTooLong       = "个性签名最多 100 个字符"
)

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
	MomentCover         string `gorm:"type:text"`
	AllowSearch         bool   `gorm:"not null;default:true"`
	AllowFriendRequest  bool   `gorm:"not null;default:true"`
	RequireFriendVerify bool   `gorm:"not null;default:true"`
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

type PublicUser struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	Nickname    string `json:"nickname"`
	Avatar      string `json:"avatar,omitempty"`
	Gender      string `json:"gender"`
	Region      string `json:"region,omitempty"`
	Signature   string `json:"signature,omitempty"`
	MomentCover string `json:"momentCover,omitempty"`
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
	Nickname    *string `json:"nickname"`
	Avatar      *string `json:"avatar"`
	Gender      *string `json:"gender"`
	Region      *string `json:"region"`
	Signature   *string `json:"signature"`
	MomentCover *string `json:"momentCover"`
}

type ChangePasswordRequest struct {
	OldPassword     string `json:"oldPassword"`
	NewPassword     string `json:"newPassword"`
	ConfirmPassword string `json:"confirmPassword"`
}

type Service struct {
	db            *gorm.DB
	captchas      *CaptchaStore
	config        Config
	afterRegister func(tx *gorm.DB, user User) error
}

func NewService(db *gorm.DB, cfg Config) (*Service, error) {
	return &Service{
		db:       db,
		captchas: NewCaptchaStore(),
		config:   cfg,
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
		return AuthResponse{}, apperrors.ErrBadRequest
	}
	nickname, err := normalizeNickname(req.Nickname)
	if err != nil {
		return AuthResponse{}, err
	}
	if strings.TrimSpace(req.CaptchaID) == "" || strings.TrimSpace(req.CaptchaCode) == "" {
		return AuthResponse{}, apperrors.ErrBadRequest
	}
	if !s.captchas.Verify(req.CaptchaID, req.CaptchaCode) {
		return AuthResponse{}, apperrors.ErrBadRequest
	}

	var count int64
	if err := s.db.Model(&User{}).Where("username = ?", username).Count(&count).Error; err != nil {
		return AuthResponse{}, err
	}
	if count > 0 {
		return AuthResponse{}, apperrors.ErrBadRequest
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return AuthResponse{}, err
	}

	var user User
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		user = User{
			ID:                  uid.New("usr"),
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
		if err := tx.Create(&user).Error; err != nil {
			return err
		}
		if s.afterRegister != nil {
			if err := s.afterRegister(tx, user); err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		return AuthResponse{}, err
	}

	return s.authResponse(user)
}

func (s *Service) SetAfterRegister(fn func(tx *gorm.DB, user User) error) {
	s.afterRegister = fn
}

func (s *Service) Login(req LoginRequest) (AuthResponse, error) {
	username := strings.TrimSpace(req.Username)
	if username == "" {
		return AuthResponse{}, apperrors.ErrBadRequest
	}
	if req.Password == "" {
		return AuthResponse{}, apperrors.ErrBadRequest
	}

	var user User
	if err := s.db.Where("username = ?", username).First(&user).Error; err != nil {
		return AuthResponse{}, apperrors.ErrBadRequest
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return AuthResponse{}, apperrors.ErrBadRequest
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
		return PublicUser{}, apperrors.ErrAuthExpired
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
		return PublicUser{}, apperrors.ErrAuthExpired
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
	if req.MomentCover != nil {
		user.MomentCover = strings.TrimSpace(*req.MomentCover)
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
		return apperrors.ErrBadRequest
	}
	if newPassword == "" {
		return apperrors.ErrBadRequest
	}
	if confirmPassword == "" {
		return apperrors.ErrBadRequest
	}
	if newPassword != confirmPassword {
		return apperrors.ErrBadRequest
	}
	if utf8.RuneCountInString(newPassword) < 6 || utf8.RuneCountInString(newPassword) > 32 {
		return apperrors.ErrBadRequest
	}
	if oldPassword == newPassword {
		return apperrors.ErrBadRequest
	}

	var user User
	if err := s.db.First(&user, "id = ?", claims.UserID).Error; err != nil {
		return apperrors.ErrAuthExpired
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		return apperrors.ErrBadRequest
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

func (s *Service) UpdateProfileByID(userID string, req UpdateProfileRequest) (PublicUser, error) {
	var user User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return PublicUser{}, apperrors.ErrAuthExpired
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
	if req.MomentCover != nil {
		user.MomentCover = strings.TrimSpace(*req.MomentCover)
	}

	if err := s.db.Save(&user).Error; err != nil {
		return PublicUser{}, err
	}
	return publicUser(user), nil
}

func (s *Service) ChangePasswordByID(userID string, req ChangePasswordRequest) error {
	oldPassword := strings.TrimSpace(req.OldPassword)
	newPassword := strings.TrimSpace(req.NewPassword)
	confirmPassword := strings.TrimSpace(req.ConfirmPassword)
	if oldPassword == "" {
		return apperrors.ErrBadRequest
	}
	if newPassword == "" {
		return apperrors.ErrBadRequest
	}
	if confirmPassword == "" {
		return apperrors.ErrBadRequest
	}
	if newPassword != confirmPassword {
		return apperrors.ErrBadRequest
	}
	if utf8.RuneCountInString(newPassword) < 6 || utf8.RuneCountInString(newPassword) > 32 {
		return apperrors.ErrBadRequest
	}
	if oldPassword == newPassword {
		return apperrors.ErrBadRequest
	}

	var user User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return apperrors.ErrAuthExpired
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		return apperrors.ErrBadRequest
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

func (s *Service) authResponse(user User) (AuthResponse, error) {
	token, err := s.createToken(user.ID)
	if err != nil {
		return AuthResponse{}, err
	}
	return AuthResponse{
		Token: token,
		User:  publicUser(user),
	}, nil
}

// LookupUser 通过 ID 查询用户（公共函数，供其他包使用）
func LookupUser(db *gorm.DB, userID string) (User, error) {
	var user User
	if err := db.First(&user, "id = ?", userID).Error; err != nil {
		return User{}, err
	}
	return user, nil
}

// FormatTime 格式化时间（公共函数，供其他包使用）
func FormatTime(value time.Time) string {
	return value.Format("2006-01-02 15:04:05")
}

func publicUser(user User) PublicUser {
	return PublicUser{
		ID:          user.ID,
		Username:    user.Username,
		Nickname:    user.Nickname,
		Avatar:      user.Avatar,
		Gender:      safeGender(user.Gender),
		Region:      user.Region,
		Signature:   user.Signature,
		MomentCover: user.MomentCover,
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
	body, err := json.Marshal(tokenClaims{UserID: userID, Exp: time.Now().Add(s.config.JWT.TTL).Unix()})
	if err != nil {
		return "", err
	}

	encodedHeader := base64.RawURLEncoding.EncodeToString(header)
	encodedBody := base64.RawURLEncoding.EncodeToString(body)
	unsigned := encodedHeader + "." + encodedBody
	signature := sign(unsigned, []byte(s.config.JWT.Secret))
	return unsigned + "." + signature, nil
}

func (s *Service) verifyToken(token string) (tokenClaims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return tokenClaims{}, apperrors.ErrAuthExpired
	}

	expected := sign(parts[0]+"."+parts[1], []byte(s.config.JWT.Secret))
	if !hmac.Equal([]byte(expected), []byte(parts[2])) {
		return tokenClaims{}, apperrors.ErrAuthExpired
	}

	raw, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return tokenClaims{}, apperrors.ErrAuthExpired
	}

	var claims tokenClaims
	if err := json.Unmarshal(raw, &claims); err != nil {
		return tokenClaims{}, apperrors.ErrAuthExpired
	}
	if claims.UserID == "" || claims.Exp < time.Now().Unix() {
		return tokenClaims{}, apperrors.ErrAuthExpired
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
		return "", apperrors.ErrBadRequest
	}
	if !usernamePattern.MatchString(trimmed) {
		return "", apperrors.ErrBadRequest
	}
	return trimmed, nil
}

func validatePassword(password string) error {
	if password == "" {
		return apperrors.ErrBadRequest
	}
	if utf8.RuneCountInString(password) < 6 {
		return apperrors.ErrBadRequest
	}
	return nil
}

func normalizeNickname(nickname string) (string, error) {
	trimmed := strings.TrimSpace(nickname)
	if trimmed == "" {
		return "", apperrors.ErrNicknameRequired
	}
	if count := utf8.RuneCountInString(trimmed); count < 1 || count > 20 {
		return "", apperrors.ErrNicknameTooLong
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
		return "", apperrors.ErrGenderInvalid
	}
}

func safeGender(gender string) string {
	return SafeGender(gender)
}

// SafeGender 安全地获取性别值（公共函数，供其他包使用）
func SafeGender(gender string) string {
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
		return "", apperrors.ErrRegionTooLong
	}
	return trimmed, nil
}

func normalizeSignature(signature string) (string, error) {
	trimmed := strings.TrimSpace(signature)
	if utf8.RuneCountInString(trimmed) > 100 {
		return "", apperrors.ErrSignatureTooLong
	}
	return trimmed, nil
}


