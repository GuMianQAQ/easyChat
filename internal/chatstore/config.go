package chatstore

// Config 文件上传模块配置。
type Config struct {
	// MaxImageBytes 图片上传大小限制（字节），由 config 包从 MB 转换。
	MaxImageBytes int64 `mapstructure:"max_image_mb"`

	// MaxFileBytes 通用文件上传大小限制（字节），由 config 包从 MB 转换。
	MaxFileBytes int64 `mapstructure:"max_file_mb"`
}
