package auth

import (
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"math/big"
	"strings"
	"sync"
	"time"

	"easyChat/internal/uid"
)

const captchaTTL = 5 * time.Minute

type CaptchaResponse struct {
	CaptchaID string `json:"captchaId"`
	Image     string `json:"image"`
}

type captchaItem struct {
	code      string
	expiresAt time.Time
}

type CaptchaStore struct {
	mu    sync.Mutex
	items map[string]captchaItem
}

func NewCaptchaStore() *CaptchaStore {
	return &CaptchaStore{items: make(map[string]captchaItem)}
}

func (s *CaptchaStore) Create() (CaptchaResponse, error) {
	code := randomDigits(4)
	id := uid.New("cap")
	imageData, err := renderCaptcha(code)
	if err != nil {
		return CaptchaResponse{}, err
	}

	s.mu.Lock()
	s.items[id] = captchaItem{code: code, expiresAt: time.Now().Add(captchaTTL)}
	s.pruneLocked()
	s.mu.Unlock()

	return CaptchaResponse{
		CaptchaID: id,
		Image:     "data:image/png;base64," + imageData,
	}, nil
}

func (s *CaptchaStore) Verify(id, code string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	item, ok := s.items[strings.TrimSpace(id)]
	if !ok {
		return false
	}
	delete(s.items, strings.TrimSpace(id))

	if time.Now().After(item.expiresAt) {
		return false
	}
	return item.code == strings.TrimSpace(code)
}

func (s *CaptchaStore) pruneLocked() {
	now := time.Now()
	for id, item := range s.items {
		if now.After(item.expiresAt) {
			delete(s.items, id)
		}
	}
}

func randomDigits(length int) string {
	var builder strings.Builder
	for builder.Len() < length {
		value, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			builder.WriteByte(byte('0' + time.Now().UnixNano()%10))
			continue
		}
		builder.WriteByte(byte('0' + value.Int64()))
	}
	return builder.String()
}

var sevenSegment = map[rune][7]bool{
	'0': {true, true, true, true, true, true, false},
	'1': {false, true, true, false, false, false, false},
	'2': {true, true, false, true, true, false, true},
	'3': {true, true, true, true, false, false, true},
	'4': {false, true, true, false, false, true, true},
	'5': {true, false, true, true, false, true, true},
	'6': {true, false, true, true, true, true, true},
	'7': {true, true, true, false, false, false, false},
	'8': {true, true, true, true, true, true, true},
	'9': {true, true, true, true, false, true, true},
}

func renderCaptcha(code string) (string, error) {
	img := image.NewRGBA(image.Rect(0, 0, 132, 44))
	draw.Draw(img, img.Bounds(), &image.Uniform{C: color.RGBA{245, 241, 250, 255}}, image.Point{}, draw.Src)

	for i := 0; i < 80; i++ {
		x := int(time.Now().UnixNano()+int64(i*17)) % 132
		y := int(time.Now().UnixNano()+int64(i*29)) % 44
		img.Set(x, y, color.RGBA{180, 170, 198, 255})
	}

	for index, digit := range code {
		drawDigit(img, digit, 16+index*28, 8)
	}

	var buffer bytes.Buffer
	if err := png.Encode(&buffer, img); err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(buffer.Bytes()), nil
}

func drawDigit(img *image.RGBA, digit rune, x, y int) {
	segments := sevenSegment[digit]
	segmentColor := color.RGBA{64, 55, 78, 255}
	fillRect := func(rect image.Rectangle) {
		draw.Draw(img, rect, &image.Uniform{C: segmentColor}, image.Point{}, draw.Src)
	}

	if segments[0] {
		fillRect(image.Rect(x+4, y, x+20, y+4))
	}
	if segments[1] {
		fillRect(image.Rect(x+20, y+4, x+24, y+16))
	}
	if segments[2] {
		fillRect(image.Rect(x+20, y+20, x+24, y+32))
	}
	if segments[3] {
		fillRect(image.Rect(x+4, y+32, x+20, y+36))
	}
	if segments[4] {
		fillRect(image.Rect(x, y+20, x+4, y+32))
	}
	if segments[5] {
		fillRect(image.Rect(x, y+4, x+4, y+16))
	}
	if segments[6] {
		fillRect(image.Rect(x+4, y+16, x+20, y+20))
	}
}
