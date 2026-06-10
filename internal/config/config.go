// Package config 提供统一的配置加载功能。
// 使用 Viper 从 config/ 目录加载 YAML 配置文件，支持 .local.yaml 覆盖和环境变量覆盖。
package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"easyChat/internal/ai"
	"easyChat/internal/auth"
	"easyChat/internal/chatstore"
	"easyChat/internal/webchat"

	"github.com/spf13/viper"
)

// ServerConfig 服务器配置。
type ServerConfig struct {
	Addr string `mapstructure:"addr"`
}

// CORSConfig 跨域配置。
type CORSConfig struct {
	AllowOrigin string `mapstructure:"allow_origin"`
	MaxAge      int    `mapstructure:"max_age"`
}

// AppConfig 应用总配置，聚合各模块配置。
type AppConfig struct {
	Server    ServerConfig     `mapstructure:"server"`
	CORS      CORSConfig       `mapstructure:"cors"`
	Auth      auth.Config      `mapstructure:"auth"`
	AI        ai.Config        `mapstructure:"ai"`
	Upload    chatstore.Config `mapstructure:"upload"`
	WebSocket webchat.Config   `mapstructure:"websocket"`
}

// Load 从 config/ 目录加载所有 YAML 配置文件。
// 加载顺序：默认 YAML → .local.yaml 覆盖 → 环境变量覆盖。
// .local.yaml 文件不存在时静默忽略。
func Load() (*AppConfig, error) {
	modules := []string{"config", "auth", "ai", "upload", "websocket"}
	merged := viper.New()
	merged.SetConfigType("yaml")

	configDir := findConfigDir()

	// 设置兜底默认值（最先设置，这样 YAML 和环境变量可以覆盖）
	setDefaults(merged)

	for _, name := range modules {
		// 加载默认配置
		base := viper.New()
		baseFile := filepath.Join(configDir, name+".yaml")
		base.SetConfigFile(baseFile)
		if err := base.ReadInConfig(); err != nil {
			if !isFileNotFound(err) {
				return nil, fmt.Errorf("failed to read %s.yaml: %w", name, err)
			}
		}

		// 加载本地覆盖（如果存在）
		local := viper.New()
		localFile := filepath.Join(configDir, name+".local.yaml")
		local.SetConfigFile(localFile)
		if err := local.ReadInConfig(); err != nil {
			if !isFileNotFound(err) {
				return nil, fmt.Errorf("failed to read %s.local.yaml: %w", name, err)
			}
		}

		// 合并：local 覆盖 base
		if err := base.MergeConfigMap(local.AllSettings()); err != nil {
			return nil, fmt.Errorf("failed to merge config for %s: %w", name, err)
		}

		// 环境变量覆盖
		base.SetEnvPrefix("EASYCHAT")
		base.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
		base.AutomaticEnv()

		// 将模块配置嵌套在模块名下合并
		// 例如 ai.yaml 的 {"provider": "MIMO"} 合并为 {"ai": {"provider": "MIMO"}}
		if err := merged.MergeConfigMap(map[string]interface{}{name: base.AllSettings()}); err != nil {
			return nil, fmt.Errorf("failed to merge config for %s: %w", name, err)
		}
	}

	// 类型转换：YAML 中的数值转换为 Go 类型
	var cfg AppConfig
	if err := merged.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	convertTypes(&cfg)

	return &cfg, nil
}

// isFileNotFound 判断错误是否为"文件不存在"。
// Viper 的 SetConfigFile 模式下，文件不存在返回 *os.PathError 而非 ConfigFileNotFoundError。
func isFileNotFound(err error) bool {
	if _, ok := err.(viper.ConfigFileNotFoundError); ok {
		return true
	}
	if os.IsNotExist(err) {
		return true
	}
	return false
}

// findConfigDir 查找 config/ 目录的绝对路径。
// 优先从当前工作目录找，其次从可执行文件目录找。
func findConfigDir() string {
	candidates := []string{"config"}

	if wd, err := os.Getwd(); err == nil {
		candidates = append(candidates, filepath.Join(wd, "config"))
	}
	if exe, err := os.Executable(); err == nil {
		candidates = append(candidates, filepath.Join(filepath.Dir(exe), "config"))
	}

	for _, dir := range candidates {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			abs, err := filepath.Abs(dir)
			if err == nil {
				return abs
			}
		}
	}

	return "config"
}

// setDefaults 设置兜底默认值，YAML 文件不存在时生效。
func setDefaults(v *viper.Viper) {
	// Server
	v.SetDefault("server.addr", "127.0.0.1:8080")

	// CORS
	v.SetDefault("cors.allow_origin", "*")
	v.SetDefault("cors.max_age", 3600)

	// Auth
	v.SetDefault("auth.jwt.secret", "easychat-local-development-secret")
	v.SetDefault("auth.jwt.ttl", 24)

	// AI
	v.SetDefault("ai.provider", "openai")
	v.SetDefault("ai.model", "gpt-3.5-turbo")
	v.SetDefault("ai.temperature", 0.7)
	v.SetDefault("ai.max_tokens", 2000)
	v.SetDefault("ai.context_window", 20)
	v.SetDefault("ai.timeout.chat", 30)
	v.SetDefault("ai.timeout.stream", 60)
	v.SetDefault("ai.translate.temperature", 0.3)
	v.SetDefault("ai.translate.max_tokens", 1000)
	v.SetDefault("ai.summarize.temperature", 0.3)
	v.SetDefault("ai.summarize.max_tokens", 500)
	v.SetDefault("ai.complete.max_tokens", 3000)
	v.SetDefault("ai.predict.max_tokens", 3000)
	v.SetDefault("ai.enable.chat", true)
	v.SetDefault("ai.enable.stream", true)
	v.SetDefault("ai.enable.tools", true)
	v.SetDefault("ai.enable.search", true)

	// Upload
	v.SetDefault("upload.max_image_mb", 2)
	v.SetDefault("upload.max_file_mb", 10)

	// WebSocket
	v.SetDefault("websocket.write_timeout", 10)
	v.SetDefault("websocket.pong_timeout", 60)
	v.SetDefault("websocket.max_message_mb", 2)
}

// convertTypes 将 YAML 中的数值转换为 Go 类型。
// YAML 中 ttl: 24 表示 24 小时，需要转换为 time.Duration。
// YAML 中 max_image_mb: 2 表示 2MB，需要转换为字节数。
func convertTypes(cfg *AppConfig) {
	// Auth: ttl (小时) → time.Duration
	cfg.Auth.JWT.TTL = time.Duration(cfg.Auth.JWT.TTL) * time.Hour

	// Upload: MB → 字节
	cfg.Upload.MaxImageBytes = cfg.Upload.MaxImageBytes * 1024 * 1024
	cfg.Upload.MaxFileBytes = cfg.Upload.MaxFileBytes * 1024 * 1024

	// WebSocket: 秒 → time.Duration，MB → 字节
	cfg.WebSocket.WriteTimeout = time.Duration(cfg.WebSocket.WriteTimeout) * time.Second
	cfg.WebSocket.PongTimeout = time.Duration(cfg.WebSocket.PongTimeout) * time.Second
	cfg.WebSocket.MaxMessageSize = cfg.WebSocket.MaxMessageSize * 1024 * 1024

	// AI: 提示词为空时使用 Go 内置默认值
	applyAIPromptDefaults(&cfg.AI)
}

// applyAIPromptDefaults 当 YAML 中提示词为空时，使用 ai 包内置的默认提示词。
func applyAIPromptDefaults(cfg *ai.Config) {
	if cfg.SystemPrompt == "" {
		cfg.SystemPrompt = ai.DefaultSystemPrompt
	}
	if cfg.TranslatePrompt == "" {
		cfg.TranslatePrompt = ai.DefaultTranslatePrompt
	}
	if cfg.SummarizePrompt == "" {
		cfg.SummarizePrompt = ai.DefaultSummarizePrompt
	}
	if cfg.CompleteSimplePrompt == "" {
		cfg.CompleteSimplePrompt = ai.DefaultCompleteSimplePrompt
	}
	if cfg.CompleteMediumPrompt == "" {
		cfg.CompleteMediumPrompt = ai.DefaultCompleteMediumPrompt
	}
	if cfg.CompleteComplexPrompt == "" {
		cfg.CompleteComplexPrompt = ai.DefaultCompleteComplexPrompt
	}
	if cfg.PredictQuestionPrompt == "" {
		cfg.PredictQuestionPrompt = ai.DefaultPredictQuestionPrompt
	}
}
