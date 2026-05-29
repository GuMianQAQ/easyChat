package ai

import (
	"bufio"
	"log"
	"os"
	"path/filepath"
	"strings"
)

type Config struct {
	Provider      string  `json:"provider"`
	APIKey        string  `json:"-"`
	Model         string  `json:"model"`
	BaseURL       string  `json:"base_url"`
	Temperature   float64 `json:"temperature"`
	MaxTokens     int     `json:"max_tokens"`
	ContextWindow int     `json:"context_window"`
	EnableChat    bool    `json:"enable_chat"`
	EnableStream  bool    `json:"enable_stream"`
	EnableTools   bool    `json:"enable_tools"`
	EnableSearch  bool    `json:"enable_search"`
}

func DefaultConfig() Config {
	return Config{
		Provider:      "openai",
		Model:         "gpt-3.5-turbo",
		BaseURL:       "",
		Temperature:   0.7,
		MaxTokens:     2000,
		ContextWindow: 20,
		EnableChat:    true,
		EnableStream:  true,
		EnableTools:   true,
		EnableSearch:  true,
	}
}

func LoadConfig() Config {
	loadDotEnv()

	cfg := DefaultConfig()

	if v := os.Getenv("EASYCHAT_AI_PROVIDER"); v != "" {
		cfg.Provider = v
	}
	if v := os.Getenv("EASYCHAT_AI_API_KEY"); v != "" {
		cfg.APIKey = v
	}
	if v := os.Getenv("EASYCHAT_AI_MODEL"); v != "" {
		cfg.Model = v
	}
	if v := os.Getenv("EASYCHAT_AI_BASE_URL"); v != "" {
		cfg.BaseURL = v
	}
	if v := os.Getenv("EASYCHAT_AI_ENABLE_CHAT"); v == "false" {
		cfg.EnableChat = false
	}
	if v := os.Getenv("EASYCHAT_AI_ENABLE_STREAM"); v == "false" {
		cfg.EnableStream = false
	}
	if v := os.Getenv("EASYCHAT_AI_ENABLE_TOOLS"); v == "false" {
		cfg.EnableTools = false
	}
	if v := os.Getenv("EASYCHAT_AI_ENABLE_SEARCH"); v == "false" {
		cfg.EnableSearch = false
	}

	keyStatus := "未设置"
	if cfg.APIKey != "" {
		keyStatus = "已设置 (***" + cfg.APIKey[len(cfg.APIKey)-4:] + ")"
	}
	log.Printf("AI config loaded: provider=%s, model=%s, baseURL=%q, apiKey=%s, chat=%v, stream=%v, tools=%v, search=%v",
		cfg.Provider, cfg.Model, cfg.BaseURL, keyStatus, cfg.EnableChat, cfg.EnableStream, cfg.EnableTools, cfg.EnableSearch)

	return cfg
}

func NewProvider(cfg Config) Provider {
	switch cfg.Provider {
	case "ollama":
		if cfg.BaseURL == "" {
			cfg.BaseURL = "http://localhost:11434/v1"
		}
		return NewOpenAIProvider(cfg.APIKey, cfg.Model, cfg.BaseURL)
	default:
		return NewOpenAIProvider(cfg.APIKey, cfg.Model, cfg.BaseURL)
	}
}

func loadDotEnv() {
	// 优先从当前工作目录找，再从可执行文件目录找
	paths := []string{".env"}

	if dir, err := os.Getwd(); err == nil {
		p := filepath.Join(dir, ".env")
		if p != ".env" {
			paths = append(paths, p)
		}
	}

	// 从可执行文件所在目录找
	if exe, err := os.Executable(); err == nil {
		paths = append(paths, filepath.Join(filepath.Dir(exe), ".env"))
	}

	loaded := false
	for _, p := range paths {
		if loaded {
			break
		}

		func() {
			file, err := os.Open(p)
			if err != nil {
				return
			}
			defer file.Close()

			log.Printf("Loading .env from: %s", p)
			loaded = true

			scanner := bufio.NewScanner(file)
			for scanner.Scan() {
				line := strings.TrimSpace(scanner.Text())

				if line == "" || strings.HasPrefix(line, "#") {
					continue
				}

				parts := strings.SplitN(line, "=", 2)
				if len(parts) != 2 {
					continue
				}

				key := strings.TrimSpace(parts[0])
				value := strings.TrimSpace(parts[1])

				if len(value) >= 2 && ((value[0] == '"' && value[len(value)-1] == '"') || (value[0] == '\'' && value[len(value)-1] == '\'')) {
					value = value[1 : len(value)-1]
				}

				if os.Getenv(key) == "" {
					os.Setenv(key, value)
				}
			}
		}()
	}

	if !loaded {
		log.Printf("No .env file found, using environment variables only")
	}
}
