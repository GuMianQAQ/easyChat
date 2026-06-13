package linkpreview

import (
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"easyChat/internal/chatstore"

	"gorm.io/gorm"
)

const (
	cacheDuration = 7 * 24 * time.Hour
	fetchTimeout  = 10 * time.Second
	maxBodySize   = 1024 * 1024 // 1MB
)

var ogTagRegex = regexp.MustCompile(`(?i)<meta\s+[^>]*(?:property|name)="og:(title|description|image)"[^>]*content="([^"]*)"`)

type Service struct {
	db     *gorm.DB
	client *http.Client
}

func NewService(db *gorm.DB) *Service {
	return &Service{
		db: db,
		client: &http.Client{
			Timeout: fetchTimeout,
		},
	}
}

type Preview struct {
	URL         string `json:"url"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Image       string `json:"image"`
	Favicon     string `json:"favicon"`
}

func (s *Service) FetchPreview(rawURL string) (*Preview, error) {
	parsedURL, err := url.Parse(rawURL)
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		return nil, fmt.Errorf("invalid URL")
	}

	if err := validateURL(parsedURL); err != nil {
		return nil, err
	}

	cached, err := s.getFromCache(rawURL)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// cache miss, continue to fetch
		} else {
			return nil, fmt.Errorf("cache error: %w", err)
		}
	} else if cached != nil {
		return cached, nil
	}

	preview, err := s.fetchFromWeb(rawURL, parsedURL)
	if err != nil {
		return nil, err
	}

	if err := s.saveToCache(preview); err != nil {
		// log but don't fail
		fmt.Printf("warning: failed to cache link preview: %v\n", err)
	}

	return preview, nil
}

func validateURL(u *url.URL) error {
	host := u.Hostname()
	if host == "" {
		return fmt.Errorf("invalid URL host")
	}

	ip := net.ParseIP(host)
	if ip == nil {
		// Check if it's a hostname that resolves to private IP
		addrs, err := net.LookupHost(host)
		if err != nil {
			return fmt.Errorf("cannot resolve host")
		}
		for _, addr := range addrs {
			if isPrivateIP(net.ParseIP(addr)) {
				return fmt.Errorf("access to private network not allowed")
			}
		}
		return nil
	}

	if isPrivateIP(ip) {
		return fmt.Errorf("access to private network not allowed")
	}
	return nil
}

func isPrivateIP(ip net.IP) bool {
	if ip == nil {
		return false
	}
	return ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast()
}

func (s *Service) getFromCache(rawURL string) (*Preview, error) {
	var record chatstore.LinkPreview
	err := s.db.Where("url = ? AND expires_at > ?", rawURL, time.Now()).First(&record).Error
	if err != nil {
		return nil, err
	}
	return &Preview{
		URL:         record.URL,
		Title:       record.Title,
		Description: record.Description,
		Image:       record.Image,
		Favicon:     record.Favicon,
	}, nil
}

func (s *Service) saveToCache(preview *Preview) error {
	record := chatstore.LinkPreview{
		URL:         preview.URL,
		Title:       preview.Title,
		Description: preview.Description,
		Image:       preview.Image,
		Favicon:     preview.Favicon,
		CreatedAt:   time.Now(),
		ExpiresAt:   time.Now().Add(cacheDuration),
	}
	return s.db.Save(&record).Error
}

func (s *Service) fetchFromWeb(rawURL string, parsedURL *url.URL) (*Preview, error) {
	req, err := http.NewRequest("GET", rawURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; EasyChat/1.0)")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch failed")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("upstream returned HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxBodySize))
	if err != nil {
		return nil, fmt.Errorf("read body failed")
	}

	preview := &Preview{
		URL: rawURL,
	}

	matches := ogTagRegex.FindAllStringSubmatch(string(body), -1)
	for _, match := range matches {
		if len(match) >= 3 {
			switch strings.ToLower(match[1]) {
			case "title":
				preview.Title = strings.TrimSpace(match[2])
			case "description":
				preview.Description = strings.TrimSpace(match[2])
			case "image":
				preview.Image = strings.TrimSpace(match[2])
			}
		}
	}

	if preview.Favicon == "" {
		preview.Favicon = fmt.Sprintf("%s://%s/favicon.ico", parsedURL.Scheme, parsedURL.Host)
	}

	if preview.Title == "" {
		preview.Title = extractTitle(string(body))
	}

	if preview.Title == "" {
		preview.Title = rawURL
	}

	return preview, nil
}

func extractTitle(html string) string {
	lowerHTML := strings.ToLower(html)
	start := strings.Index(lowerHTML, "<title>")
	if start == -1 {
		return ""
	}
	start += 7
	end := strings.Index(lowerHTML[start:], "</title>")
	if end == -1 {
		return ""
	}
	return strings.TrimSpace(html[start : start+end])
}
