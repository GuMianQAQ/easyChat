package webchat

import "time"

// Config WebSocket 模块配置。
type Config struct {
	// WriteTimeout 写操作超时（秒），由 config 包转换为 time.Duration。
	WriteTimeout time.Duration `mapstructure:"write_timeout"`

	// PongTimeout 等待 Pong 响应的超时（秒），由 config 包转换为 time.Duration。
	PongTimeout time.Duration `mapstructure:"pong_timeout"`

	// MaxMessageSize WebSocket 消息最大字节数，由 config 包从 MB 转换。
	MaxMessageSize int64 `mapstructure:"max_message_mb"`
}
