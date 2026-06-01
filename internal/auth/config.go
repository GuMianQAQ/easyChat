package auth

import "time"

// Config 认证模块配置。
type Config struct {
	// JWT JWT 相关配置。
	JWT JWTConfig `mapstructure:"jwt"`
}

// JWTConfig JWT 签名与有效期配置。
type JWTConfig struct {
	// Secret 签名 JWT 的密钥。
	Secret string `mapstructure:"secret"`

	// TTL JWT 令牌有效期（小时），由 config 包转换为 time.Duration。
	TTL time.Duration `mapstructure:"ttl"`
}
