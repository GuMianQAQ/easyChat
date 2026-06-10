package chatstore

import (
	"time"

	"easyChat/internal/auth"
	apperrors "easyChat/internal/errors"
	"easyChat/internal/uid"

	"gorm.io/gorm"
)

// AlbumPayload represents an album in API responses.
type AlbumPayload struct {
	ID             string `json:"id"`
	ConversationID string `json:"conversationId"`
	Name           string `json:"name"`
	Description    string `json:"description"`
	CoverURL       string `json:"coverUrl"`
	PhotoCount     int    `json:"photoCount"`
	CreatedBy      string `json:"createdBy"`
	CreatedByName  string `json:"createdByName"`
	CreatedAt      string `json:"createdAt"`
	UpdatedAt      string `json:"updatedAt"`
}

// AlbumPhotoPayload represents a photo in an album in API responses.
type AlbumPhotoPayload struct {
	ID             string `json:"id"`
	AlbumID        string `json:"albumId"`
	FileURL        string `json:"fileUrl"`
	FileName       string `json:"fileName"`
	FileSize       int64  `json:"fileSize"`
	MimeType       string `json:"mimeType"`
	UploadedBy     string `json:"uploadedBy"`
	UploadedByName string `json:"uploadedByName"`
	CreatedAt      string `json:"createdAt"`
}

// CreateAlbum creates a new album in a group conversation.
func (s *Service) CreateAlbum(userID, conversationID, name, description string) (AlbumPayload, error) {
	// Validate input
	if name == "" {
		return AlbumPayload{}, apperrors.ErrBadRequest
	}
	if len(name) > 128 {
		return AlbumPayload{}, apperrors.ErrBadRequest
	}

	// Check if user is in the group
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return AlbumPayload{}, err
	}
	if conversation.Type != GroupConversationType {
		return AlbumPayload{}, apperrors.ErrNotGroupConversation
	}

	member, err := s.memberRecord(userID, conversationID)
	if err != nil {
		return AlbumPayload{}, err
	}
	if member == nil {
		return AlbumPayload{}, apperrors.ErrUserNotInGroup
	}

	// Create album
	now := time.Now()
	album := Album{
		ID:             uid.New("album"),
		ConversationID: conversationID,
		Name:           name,
		Description:    description,
		CoverURL:       "",
		PhotoCount:     0,
		CreatedBy:      userID,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := s.db.Create(&album).Error; err != nil {
		return AlbumPayload{}, err
	}

	// Get creator name
	var creator auth.User
	if err := s.db.Where("id = ?", userID).First(&creator).Error; err != nil {
		return AlbumPayload{}, err
	}

	return AlbumPayload{
		ID:             album.ID,
		ConversationID: album.ConversationID,
		Name:           album.Name,
		Description:    album.Description,
		CoverURL:       album.CoverURL,
		PhotoCount:     album.PhotoCount,
		CreatedBy:      album.CreatedBy,
		CreatedByName:  creator.Nickname,
		CreatedAt:      formatTime(album.CreatedAt),
		UpdatedAt:      formatTime(album.UpdatedAt),
	}, nil
}

// GetAlbums returns all albums in a group conversation with pagination.
func (s *Service) GetAlbums(userID, conversationID string, page, pageSize int) ([]AlbumPayload, int, error) {
	// Check if user is in the group
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return nil, 0, err
	}
	if conversation.Type != GroupConversationType {
		return nil, 0, apperrors.ErrNotGroupConversation
	}

	member, err := s.memberRecord(userID, conversationID)
	if err != nil {
		return nil, 0, err
	}
	if member == nil {
		return nil, 0, apperrors.ErrUserNotInGroup
	}

	// Validate pagination
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 20
	}

	// Count total albums
	var total int64
	if err := s.db.Model(&Album{}).Where("conversation_id = ?", conversationID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get albums
	var albums []Album
	if err := s.db.Where("conversation_id = ?", conversationID).
		Order("created_at desc").
		Offset((page - 1) * pageSize).Limit(pageSize).
		Find(&albums).Error; err != nil {
		return nil, 0, err
	}

	// Get creator IDs
	creatorIDs := make([]string, 0, len(albums))
	for _, album := range albums {
		creatorIDs = append(creatorIDs, album.CreatedBy)
	}

	// Get creators
	var creators []auth.User
	if len(creatorIDs) > 0 {
		if err := s.db.Where("id IN ?", creatorIDs).Find(&creators).Error; err != nil {
			return nil, 0, err
		}
	}

	creatorMap := make(map[string]auth.User, len(creators))
	for _, creator := range creators {
		creatorMap[creator.ID] = creator
	}

	// Build response
	items := make([]AlbumPayload, 0, len(albums))
	for _, album := range albums {
		creator := creatorMap[album.CreatedBy]
		items = append(items, AlbumPayload{
			ID:             album.ID,
			ConversationID: album.ConversationID,
			Name:           album.Name,
			Description:    album.Description,
			CoverURL:       album.CoverURL,
			PhotoCount:     album.PhotoCount,
			CreatedBy:      album.CreatedBy,
			CreatedByName:  creator.Nickname,
			CreatedAt:      formatTime(album.CreatedAt),
			UpdatedAt:      formatTime(album.UpdatedAt),
		})
	}

	return items, int(total), nil
}

// GetAlbum returns a specific album by ID.
func (s *Service) GetAlbum(userID, albumID string) (AlbumPayload, error) {
	// Get album
	var album Album
	if err := s.db.Where("id = ?", albumID).First(&album).Error; err != nil {
		return AlbumPayload{}, apperrors.ErrNotFound
	}

	// Check if user is in the group
	conversation, err := s.getConversationForUser(userID, album.ConversationID)
	if err != nil {
		return AlbumPayload{}, err
	}
	if conversation.Type != GroupConversationType {
		return AlbumPayload{}, apperrors.ErrNotGroupConversation
	}

	member, err := s.memberRecord(userID, album.ConversationID)
	if err != nil {
		return AlbumPayload{}, err
	}
	if member == nil {
		return AlbumPayload{}, apperrors.ErrUserNotInGroup
	}

	// Get creator
	var creator auth.User
	if err := s.db.Where("id = ?", album.CreatedBy).First(&creator).Error; err != nil {
		return AlbumPayload{}, err
	}

	return AlbumPayload{
		ID:             album.ID,
		ConversationID: album.ConversationID,
		Name:           album.Name,
		Description:    album.Description,
		CoverURL:       album.CoverURL,
		PhotoCount:     album.PhotoCount,
		CreatedBy:      album.CreatedBy,
		CreatedByName:  creator.Nickname,
		CreatedAt:      formatTime(album.CreatedAt),
		UpdatedAt:      formatTime(album.UpdatedAt),
	}, nil
}

// UpdateAlbum updates an album's name and description.
func (s *Service) UpdateAlbum(userID, albumID, name, description string) (AlbumPayload, error) {
	// Validate input
	if name == "" {
		return AlbumPayload{}, apperrors.ErrBadRequest
	}
	if len(name) > 128 {
		return AlbumPayload{}, apperrors.ErrBadRequest
	}

	// Get album
	var album Album
	if err := s.db.Where("id = ?", albumID).First(&album).Error; err != nil {
		return AlbumPayload{}, apperrors.ErrNotFound
	}

	// Check if user is in the group
	conversation, err := s.getConversationForUser(userID, album.ConversationID)
	if err != nil {
		return AlbumPayload{}, err
	}
	if conversation.Type != GroupConversationType {
		return AlbumPayload{}, apperrors.ErrNotGroupConversation
	}

	member, err := s.memberRecord(userID, album.ConversationID)
	if err != nil {
		return AlbumPayload{}, err
	}
	if member == nil {
		return AlbumPayload{}, apperrors.ErrUserNotInGroup
	}

	// Check permission: only album creator or group admin can update
	if album.CreatedBy != userID && member.Role == "member" {
		return AlbumPayload{}, apperrors.ErrForbidden
	}

	// Update album
	album.Name = name
	album.Description = description
	album.UpdatedAt = time.Now()

	if err := s.db.Save(&album).Error; err != nil {
		return AlbumPayload{}, err
	}

	// Get creator
	var creator auth.User
	if err := s.db.Where("id = ?", album.CreatedBy).First(&creator).Error; err != nil {
		return AlbumPayload{}, err
	}

	return AlbumPayload{
		ID:             album.ID,
		ConversationID: album.ConversationID,
		Name:           album.Name,
		Description:    album.Description,
		CoverURL:       album.CoverURL,
		PhotoCount:     album.PhotoCount,
		CreatedBy:      album.CreatedBy,
		CreatedByName:  creator.Nickname,
		CreatedAt:      formatTime(album.CreatedAt),
		UpdatedAt:      formatTime(album.UpdatedAt),
	}, nil
}

// DeleteAlbum deletes an album and all its photos.
func (s *Service) DeleteAlbum(userID, albumID string) error {
	// Get album
	var album Album
	if err := s.db.Where("id = ?", albumID).First(&album).Error; err != nil {
		return apperrors.ErrNotFound
	}

	// Check if user is in the group
	conversation, err := s.getConversationForUser(userID, album.ConversationID)
	if err != nil {
		return err
	}
	if conversation.Type != GroupConversationType {
		return apperrors.ErrNotGroupConversation
	}

	member, err := s.memberRecord(userID, album.ConversationID)
	if err != nil {
		return err
	}
	if member == nil {
		return apperrors.ErrUserNotInGroup
	}

	// Check permission: only album creator or group admin can delete
	if album.CreatedBy != userID && member.Role == "member" {
		return apperrors.ErrForbidden
	}

	// Delete album and all photos in a transaction
	return s.db.Transaction(func(tx *gorm.DB) error {
		// Delete all photos in the album
		if err := tx.Where("album_id = ?", albumID).Delete(&AlbumPhoto{}).Error; err != nil {
			return err
		}

		// Delete the album
		if err := tx.Delete(&album).Error; err != nil {
			return err
		}

		return nil
	})
}

// UploadAlbumPhoto uploads a photo to an album.
func (s *Service) UploadAlbumPhoto(userID, albumID, fileURL, fileName string, fileSize int64, mimeType string) (AlbumPhotoPayload, error) {
	// Get album
	var album Album
	if err := s.db.Where("id = ?", albumID).First(&album).Error; err != nil {
		return AlbumPhotoPayload{}, apperrors.ErrNotFound
	}

	// Check if user is in the group
	conversation, err := s.getConversationForUser(userID, album.ConversationID)
	if err != nil {
		return AlbumPhotoPayload{}, err
	}
	if conversation.Type != GroupConversationType {
		return AlbumPhotoPayload{}, apperrors.ErrNotGroupConversation
	}

	member, err := s.memberRecord(userID, album.ConversationID)
	if err != nil {
		return AlbumPhotoPayload{}, err
	}
	if member == nil {
		return AlbumPhotoPayload{}, apperrors.ErrUserNotInGroup
	}

	// Create photo
	now := time.Now()
	photo := AlbumPhoto{
		ID:         uid.New("photo"),
		AlbumID:    albumID,
		FileURL:    fileURL,
		FileName:   fileName,
		FileSize:   fileSize,
		MimeType:   mimeType,
		UploadedBy: userID,
		CreatedAt:  now,
	}

	// Update album photo count and cover in a transaction
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// Create photo
		if err := tx.Create(&photo).Error; err != nil {
			return err
		}

		// Update album photo count
		if err := tx.Model(&album).Update("photo_count", gorm.Expr("photo_count + 1")).Error; err != nil {
			return err
		}

		// Update album cover if it's the first photo
		if album.PhotoCount == 0 {
			if err := tx.Model(&album).Update("cover_url", fileURL).Error; err != nil {
				return err
			}
		}

		// Update album updated_at
		if err := tx.Model(&album).Update("updated_at", now).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return AlbumPhotoPayload{}, err
	}

	// Get uploader name
	var uploader auth.User
	if err := s.db.Where("id = ?", userID).First(&uploader).Error; err != nil {
		return AlbumPhotoPayload{}, err
	}

	return AlbumPhotoPayload{
		ID:             photo.ID,
		AlbumID:        photo.AlbumID,
		FileURL:        photo.FileURL,
		FileName:       photo.FileName,
		FileSize:       photo.FileSize,
		MimeType:       photo.MimeType,
		UploadedBy:     photo.UploadedBy,
		UploadedByName: uploader.Nickname,
		CreatedAt:      formatTime(photo.CreatedAt),
	}, nil
}

// GetAlbumPhotos returns photos in an album with pagination.
func (s *Service) GetAlbumPhotos(userID, albumID string, page, pageSize int) ([]AlbumPhotoPayload, int, error) {
	// Get album
	var album Album
	if err := s.db.Where("id = ?", albumID).First(&album).Error; err != nil {
		return nil, 0, apperrors.ErrNotFound
	}

	// Check if user is in the group
	conversation, err := s.getConversationForUser(userID, album.ConversationID)
	if err != nil {
		return nil, 0, err
	}
	if conversation.Type != GroupConversationType {
		return nil, 0, apperrors.ErrNotGroupConversation
	}

	member, err := s.memberRecord(userID, album.ConversationID)
	if err != nil {
		return nil, 0, err
	}
	if member == nil {
		return nil, 0, apperrors.ErrUserNotInGroup
	}

	// Validate pagination
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 20
	}

	// Count total photos
	var total int64
	if err := s.db.Model(&AlbumPhoto{}).Where("album_id = ?", albumID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get photos
	var photos []AlbumPhoto
	if err := s.db.Where("album_id = ?", albumID).
		Order("created_at desc").
		Offset((page - 1) * pageSize).Limit(pageSize).
		Find(&photos).Error; err != nil {
		return nil, 0, err
	}

	// Get uploader IDs
	uploaderIDs := make([]string, 0, len(photos))
	for _, photo := range photos {
		uploaderIDs = append(uploaderIDs, photo.UploadedBy)
	}

	// Get uploaders
	var uploaders []auth.User
	if len(uploaderIDs) > 0 {
		if err := s.db.Where("id IN ?", uploaderIDs).Find(&uploaders).Error; err != nil {
			return nil, 0, err
		}
	}

	uploaderMap := make(map[string]auth.User, len(uploaders))
	for _, uploader := range uploaders {
		uploaderMap[uploader.ID] = uploader
	}

	// Build response
	items := make([]AlbumPhotoPayload, 0, len(photos))
	for _, photo := range photos {
		uploader := uploaderMap[photo.UploadedBy]
		items = append(items, AlbumPhotoPayload{
			ID:             photo.ID,
			AlbumID:        photo.AlbumID,
			FileURL:        photo.FileURL,
			FileName:       photo.FileName,
			FileSize:       photo.FileSize,
			MimeType:       photo.MimeType,
			UploadedBy:     photo.UploadedBy,
			UploadedByName: uploader.Nickname,
			CreatedAt:      formatTime(photo.CreatedAt),
		})
	}

	return items, int(total), nil
}

// DeleteAlbumPhoto deletes a photo from an album.
func (s *Service) DeleteAlbumPhoto(userID, photoID string) error {
	// Get photo
	var photo AlbumPhoto
	if err := s.db.Where("id = ?", photoID).First(&photo).Error; err != nil {
		return apperrors.ErrNotFound
	}

	// Get album
	var album Album
	if err := s.db.Where("id = ?", photo.AlbumID).First(&album).Error; err != nil {
		return apperrors.ErrNotFound
	}

	// Check if user is in the group
	conversation, err := s.getConversationForUser(userID, album.ConversationID)
	if err != nil {
		return err
	}
	if conversation.Type != GroupConversationType {
		return apperrors.ErrNotGroupConversation
	}

	member, err := s.memberRecord(userID, album.ConversationID)
	if err != nil {
		return err
	}
	if member == nil {
		return apperrors.ErrUserNotInGroup
	}

	// Check permission: only photo uploader, album creator, or group admin can delete
	if photo.UploadedBy != userID && album.CreatedBy != userID && member.Role == "member" {
		return apperrors.ErrForbidden
	}

	// Delete photo and update album in a transaction
	return s.db.Transaction(func(tx *gorm.DB) error {
		// Delete photo
		if err := tx.Delete(&photo).Error; err != nil {
			return err
		}

		// Update album photo count
		if err := tx.Model(&album).Update("photo_count", gorm.Expr("photo_count - 1")).Error; err != nil {
			return err
		}

		// Update album cover if deleted photo was the cover
		if album.CoverURL == photo.FileURL {
			// Find the most recent photo
			var newCover AlbumPhoto
			if err := tx.Where("album_id = ?", album.ID).Order("created_at desc").First(&newCover).Error; err != nil {
				// No more photos, clear cover
				if err := tx.Model(&album).Update("cover_url", "").Error; err != nil {
					return err
				}
			} else {
				// Set new cover
				if err := tx.Model(&album).Update("cover_url", newCover.FileURL).Error; err != nil {
					return err
				}
			}
		}

		// Update album updated_at
		if err := tx.Model(&album).Update("updated_at", time.Now()).Error; err != nil {
			return err
		}

		return nil
	})
}

// GetAllAlbumPhotos returns all photos in a group conversation across all albums.
func (s *Service) GetAllAlbumPhotos(userID, conversationID string, page, pageSize int) ([]AlbumPhotoPayload, int, error) {
	// Check if user is in the group
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return nil, 0, err
	}
	if conversation.Type != GroupConversationType {
		return nil, 0, apperrors.ErrNotGroupConversation
	}

	member, err := s.memberRecord(userID, conversationID)
	if err != nil {
		return nil, 0, err
	}
	if member == nil {
		return nil, 0, apperrors.ErrUserNotInGroup
	}

	// Validate pagination
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 20
	}

	// Get album IDs in this conversation
	var albumIDs []string
	if err := s.db.Model(&Album{}).Where("conversation_id = ?", conversationID).Pluck("id", &albumIDs).Error; err != nil {
		return nil, 0, err
	}

	if len(albumIDs) == 0 {
		return []AlbumPhotoPayload{}, 0, nil
	}

	// Count total photos
	var total int64
	if err := s.db.Model(&AlbumPhoto{}).Where("album_id IN ?", albumIDs).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get photos
	var photos []AlbumPhoto
	if err := s.db.Where("album_id IN ?", albumIDs).
		Order("created_at desc").
		Offset((page - 1) * pageSize).Limit(pageSize).
		Find(&photos).Error; err != nil {
		return nil, 0, err
	}

	// Get uploader IDs
	uploaderIDs := make([]string, 0, len(photos))
	for _, photo := range photos {
		uploaderIDs = append(uploaderIDs, photo.UploadedBy)
	}

	// Get uploaders
	var uploaders []auth.User
	if len(uploaderIDs) > 0 {
		if err := s.db.Where("id IN ?", uploaderIDs).Find(&uploaders).Error; err != nil {
			return nil, 0, err
		}
	}

	uploaderMap := make(map[string]auth.User, len(uploaders))
	for _, uploader := range uploaders {
		uploaderMap[uploader.ID] = uploader
	}

	// Build response
	items := make([]AlbumPhotoPayload, 0, len(photos))
	for _, photo := range photos {
		uploader := uploaderMap[photo.UploadedBy]
		items = append(items, AlbumPhotoPayload{
			ID:             photo.ID,
			AlbumID:        photo.AlbumID,
			FileURL:        photo.FileURL,
			FileName:       photo.FileName,
			FileSize:       photo.FileSize,
			MimeType:       photo.MimeType,
			UploadedBy:     photo.UploadedBy,
			UploadedByName: uploader.Nickname,
			CreatedAt:      formatTime(photo.CreatedAt),
		})
	}

	return items, int(total), nil
}

// GetMyAlbumPhotos returns all photos uploaded by the current user in a group conversation.
func (s *Service) GetMyAlbumPhotos(userID, conversationID string, page, pageSize int) ([]AlbumPhotoPayload, int, error) {
	// Check if user is in the group
	conversation, err := s.getConversationForUser(userID, conversationID)
	if err != nil {
		return nil, 0, err
	}
	if conversation.Type != GroupConversationType {
		return nil, 0, apperrors.ErrNotGroupConversation
	}

	member, err := s.memberRecord(userID, conversationID)
	if err != nil {
		return nil, 0, err
	}
	if member == nil {
		return nil, 0, apperrors.ErrUserNotInGroup
	}

	// Validate pagination
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 20
	}

	// Get album IDs in this conversation
	var albumIDs []string
	if err := s.db.Model(&Album{}).Where("conversation_id = ?", conversationID).Pluck("id", &albumIDs).Error; err != nil {
		return nil, 0, err
	}

	if len(albumIDs) == 0 {
		return []AlbumPhotoPayload{}, 0, nil
	}

	// Count total photos
	var total int64
	if err := s.db.Model(&AlbumPhoto{}).Where("album_id IN ? AND uploaded_by = ?", albumIDs, userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get photos
	var photos []AlbumPhoto
	if err := s.db.Where("album_id IN ? AND uploaded_by = ?", albumIDs, userID).
		Order("created_at desc").
		Offset((page - 1) * pageSize).Limit(pageSize).
		Find(&photos).Error; err != nil {
		return nil, 0, err
	}

	// Get uploader name
	var uploader auth.User
	if err := s.db.Where("id = ?", userID).First(&uploader).Error; err != nil {
		return nil, 0, err
	}

	// Build response
	items := make([]AlbumPhotoPayload, 0, len(photos))
	for _, photo := range photos {
		items = append(items, AlbumPhotoPayload{
			ID:             photo.ID,
			AlbumID:        photo.AlbumID,
			FileURL:        photo.FileURL,
			FileName:       photo.FileName,
			FileSize:       photo.FileSize,
			MimeType:       photo.MimeType,
			UploadedBy:     photo.UploadedBy,
			UploadedByName: uploader.Nickname,
			CreatedAt:      formatTime(photo.CreatedAt),
		})
	}

	return items, int(total), nil
}

// BatchDeleteAlbumPhotos deletes multiple photos from an album.
func (s *Service) BatchDeleteAlbumPhotos(userID, albumID string, photoIDs []string) error {
	if len(photoIDs) == 0 {
		return apperrors.ErrBadRequest
	}

	// Get album
	var album Album
	if err := s.db.Where("id = ?", albumID).First(&album).Error; err != nil {
		return apperrors.ErrNotFound
	}

	// Check if user is in the group
	conversation, err := s.getConversationForUser(userID, album.ConversationID)
	if err != nil {
		return err
	}
	if conversation.Type != GroupConversationType {
		return apperrors.ErrNotGroupConversation
	}

	member, err := s.memberRecord(userID, album.ConversationID)
	if err != nil {
		return err
	}
	if member == nil {
		return apperrors.ErrUserNotInGroup
	}

	// Check permission: only album creator or group admin can batch delete
	if album.CreatedBy != userID && member.Role == "member" {
		return apperrors.ErrForbidden
	}

	// Get photos to delete
	var photos []AlbumPhoto
	if err := s.db.Where("id IN ? AND album_id = ?", photoIDs, albumID).Find(&photos).Error; err != nil {
		return err
	}

	if len(photos) == 0 {
		return apperrors.ErrNotFound
	}

	// Delete photos and update album in a transaction
	return s.db.Transaction(func(tx *gorm.DB) error {
		// Delete photos
		if err := tx.Where("id IN ?", photoIDs).Delete(&AlbumPhoto{}).Error; err != nil {
			return err
		}

		// Update album photo count
		if err := tx.Model(&album).Update("photo_count", gorm.Expr("photo_count - ?", len(photos))).Error; err != nil {
			return err
		}

		// Update album cover if deleted photos include the cover
		coverDeleted := false
		for _, photo := range photos {
			if album.CoverURL == photo.FileURL {
				coverDeleted = true
				break
			}
		}

		if coverDeleted {
			// Find the most recent photo
			var newCover AlbumPhoto
			if err := tx.Where("album_id = ?", album.ID).Order("created_at desc").First(&newCover).Error; err != nil {
				// No more photos, clear cover
				if err := tx.Model(&album).Update("cover_url", "").Error; err != nil {
					return err
				}
			} else {
				// Set new cover
				if err := tx.Model(&album).Update("cover_url", newCover.FileURL).Error; err != nil {
					return err
				}
			}
		}

		// Update album updated_at
		if err := tx.Model(&album).Update("updated_at", time.Now()).Error; err != nil {
			return err
		}

		return nil
	})
}

// checkAlbumPermission checks if a user has permission to manage an album.
func (s *Service) checkAlbumPermission(userID, albumID string) (bool, error) {
	// Get album
	var album Album
	if err := s.db.Where("id = ?", albumID).First(&album).Error; err != nil {
		return false, apperrors.ErrNotFound
	}

	// Check if user is in the group
	conversation, err := s.getConversationForUser(userID, album.ConversationID)
	if err != nil {
		return false, err
	}
	if conversation.Type != GroupConversationType {
		return false, apperrors.ErrNotGroupConversation
	}

	member, err := s.memberRecord(userID, album.ConversationID)
	if err != nil {
		return false, err
	}
	if member == nil {
		return false, apperrors.ErrUserNotInGroup
	}

	// Check permission: only album creator or group admin can manage
	if album.CreatedBy != userID && member.Role == "member" {
		return false, nil
	}

	return true, nil
}

// checkPhotoPermission checks if a user has permission to delete a photo.
func (s *Service) checkPhotoPermission(userID, photoID string) (bool, error) {
	// Get photo
	var photo AlbumPhoto
	if err := s.db.Where("id = ?", photoID).First(&photo).Error; err != nil {
		return false, apperrors.ErrNotFound
	}

	// Get album
	var album Album
	if err := s.db.Where("id = ?", photo.AlbumID).First(&album).Error; err != nil {
		return false, apperrors.ErrNotFound
	}

	// Check if user is in the group
	conversation, err := s.getConversationForUser(userID, album.ConversationID)
	if err != nil {
		return false, err
	}
	if conversation.Type != GroupConversationType {
		return false, apperrors.ErrNotGroupConversation
	}

	member, err := s.memberRecord(userID, album.ConversationID)
	if err != nil {
		return false, err
	}
	if member == nil {
		return false, apperrors.ErrUserNotInGroup
	}

	// Check permission: only photo uploader, album creator, or group admin can delete
	if photo.UploadedBy != userID && album.CreatedBy != userID && member.Role == "member" {
		return false, nil
	}

	return true, nil
}
