package chatstore

import (
	"errors"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"easyChat/internal/auth"
)

func (s *Service) StoreUpload(file *multipart.FileHeader) (string, error) {
	if file == nil {
		return "", errors.New("缺少图片")
	}
	if file.Size > MaxUploadBytes {
		return "", errors.New("图片超过 2MB")
	}
	if !strings.HasPrefix(file.Header.Get("Content-Type"), "image/") {
		return "", errors.New("仅支持图片")
	}

	extension := strings.ToLower(filepath.Ext(file.Filename))
	if extension == "" {
		extension = ".png"
	}
	targetPath := filepath.Join(s.uploadsDir, newID("upload")+extension)
	if err := copyUploadedFile(file, targetPath); err != nil {
		return "", err
	}
	return "/uploads/" + filepath.Base(targetPath), nil
}

func (s *Service) StoreGenericUpload(user auth.PublicUser, file *multipart.FileHeader) (FilePayload, error) {
	if file == nil {
		return FilePayload{}, errors.New("请上传文件")
	}
	if file.Size > 10*1024*1024 {
		return FilePayload{}, errors.New("文件超过 10MB")
	}

	extension := strings.ToLower(filepath.Ext(file.Filename))
	if extension == "" {
		extension = ".bin"
	}
	targetPath := filepath.Join(s.uploadsDir, "files", newID("file")+extension)
	if err := os.MkdirAll(filepath.Dir(targetPath), 0o755); err != nil {
		return FilePayload{}, err
	}
	if err := copyUploadedFile(file, targetPath); err != nil {
		return FilePayload{}, err
	}

	now := time.Now()
	record := UploadedFile{
		ID:        newID("file"),
		UserID:    user.ID,
		FileName:  file.Filename,
		FileURL:   "/" + filepath.ToSlash(filepath.Join("uploads", "files", filepath.Base(targetPath))),
		FileSize:  file.Size,
		MimeType:  file.Header.Get("Content-Type"),
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := s.db.Create(&record).Error; err != nil {
		return FilePayload{}, err
	}
	return filePayload(record), nil
}

func (s *Service) ListFiles(userID, kind, keyword string) ([]FilePayload, error) {
	kind = strings.TrimSpace(kind)
	keyword = strings.TrimSpace(keyword)

	query := s.db.Where("user_id = ?", userID)
	if keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where("file_name LIKE ?", like)
	}

	var records []UploadedFile
	if err := query.Order("created_at desc").Find(&records).Error; err != nil {
		return nil, err
	}

	items := make([]FilePayload, 0, len(records))
	for _, record := range records {
		payload := filePayload(record)
		if kind != "" && kind != "all" && payload.FileKind != kind {
			continue
		}
		items = append(items, payload)
	}
	return items, nil
}

func filePayload(record UploadedFile) FilePayload {
	kind := fileKind(record.FileName, record.MimeType)
	createdAt := formatTime(record.CreatedAt)
	return FilePayload{
		ID:               record.ID,
		UserID:           record.UserID,
		FileName:         record.FileName,
		FileURL:          record.FileURL,
		FileSize:         record.FileSize,
		MimeType:         record.MimeType,
		FileKind:         kind,
		MessageCreatedAt: createdAt,
		CreatedAt:        createdAt,
	}
}

func fileKind(fileName, mimeType string) string {
	lowerName := strings.ToLower(fileName)
	lowerType := strings.ToLower(mimeType)
	if strings.HasPrefix(lowerType, "image/") || strings.HasSuffix(lowerName, ".png") || strings.HasSuffix(lowerName, ".jpg") || strings.HasSuffix(lowerName, ".jpeg") || strings.HasSuffix(lowerName, ".gif") || strings.HasSuffix(lowerName, ".webp") {
		return "image"
	}
	if strings.HasSuffix(lowerName, ".zip") || strings.HasSuffix(lowerName, ".rar") || strings.HasSuffix(lowerName, ".7z") || strings.HasSuffix(lowerName, ".tar") || strings.HasSuffix(lowerName, ".gz") {
		return "archive"
	}
	if strings.HasSuffix(lowerName, ".doc") || strings.HasSuffix(lowerName, ".docx") || strings.HasSuffix(lowerName, ".xls") || strings.HasSuffix(lowerName, ".xlsx") || strings.HasSuffix(lowerName, ".pdf") || strings.HasSuffix(lowerName, ".txt") || strings.HasSuffix(lowerName, ".md") {
		return "document"
	}
	return "other"
}

func copyUploadedFile(file *multipart.FileHeader, targetPath string) error {
	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	dst, err := os.Create(targetPath)
	if err != nil {
		return err
	}
	defer dst.Close()

	_, err = io.Copy(dst, src)
	return err
}
