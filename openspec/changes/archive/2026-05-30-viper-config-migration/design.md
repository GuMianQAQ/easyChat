# Viper + YAML 配置迁移 — 详细设计

## 1. 配置文件结构

```
config/
├── config.yaml           ← 全局（服务器地址、CORS）
├── auth.yaml             ← 认证（JWT secret、TTL）
├── ai.yaml               ← AI（provider、model、超时、工具参数、提示词）
├── upload.yaml           ← 上传（图片/文件大小限制）
└── websocket.yaml        ← WebSocket（超时、消息大小）
```

每个文件都有对应的 `.local.yaml`（可选），用于覆盖敏感值。`.local.yaml` 被 `.gitignore` 排除。

## 2. 各 YAML 文件内容

### config.yaml

```yaml
server:
  addr: "127.0.0.1:8080"

cors:
  allow_origin: "*"
  max_age: 3600
```

### auth.yaml

```yaml
jwt:
  secret: "easychat-local-development-secret"
  ttl: 24
```

### ai.yaml

```yaml
provider: openai
model: gpt-3.5-turbo
api_key: ""
base_url: ""
temperature: 0.7
max_tokens: 2000
context_window: 20

timeout:
  chat: 30
  stream: 60

translate:
  temperature: 0.3
  max_tokens: 1000

summarize:
  temperature: 0.3
  max_tokens: 500

complete:
  max_tokens: 3000

predict:
  max_tokens: 3000

enable:
  chat: true
  stream: true
  tools: true
  search: true
```

### upload.yaml

```yaml
max_image_mb: 2
max_file_mb: 10
```

### websocket.yaml

```yaml
write_timeout: 10
pong_timeout: 60
max_message_mb: 2
```

## 3. 统一配置结构体

`internal/config/config.go` 定义 `AppConfig`，引用各包的 Config 结构体：

```go
package config

import (
    "easyChat/internal/ai"
    "easyChat/internal/auth"
    "easyChat/internal/chatstore"
    "easyChat/internal/webchat"
)

type ServerConfig struct {
    Addr string `mapstructure:"addr"`
}

type CORSConfig struct {
    AllowOrigin string `mapstructure:"allow_origin"`
    MaxAge      int    `mapstructure:"max_age"`
}

type AppConfig struct {
    Server    ServerConfig      `mapstructure:"server"`
    CORS      CORSConfig        `mapstructure:"cors"`
    Auth      auth.Config       `mapstructure:"auth"`
    AI        ai.Config         `mapstructure:"ai"`
    Upload    chatstore.Config  `mapstructure:"upload"`
    WebSocket webchat.Config    `mapstructure:"websocket"`
}
```

## 4. 各包 Config 结构体（只保留结构体，删除 LoadConfig）

### auth.Config

```go
type Config struct {
    JWTSecret string        `mapstructure:"secret"`
    TokenTTL  time.Duration `mapstructure:"ttl"`
}
```

### ai.Config

保留现有结构体字段，但：
- 删除 `LoadConfig()` 函数
- 删除 `loadDotEnv()` 函数
- 删除 `DefaultConfig()` 函数
- 删除不再需要的 import（bufio, path/filepath, log, os, strconv, strings）
- 保留提示词常量（`defaultSystemPrompt` 等）
- 保留 `NewProvider()` 函数
- **重构结构体以匹配 YAML 嵌套结构**：

```go
type TimeoutConfig struct {
    Chat   int `mapstructure:"chat"`
    Stream int `mapstructure:"stream"`
}
type TranslateConfig struct {
    Temperature float64 `mapstructure:"temperature"`
    MaxTokens   int     `mapstructure:"max_tokens"`
}
type SummarizeConfig struct {
    Temperature float64 `mapstructure:"temperature"`
    MaxTokens   int     `mapstructure:"max_tokens"`
}
type CompleteConfig struct {
    MaxTokens int `mapstructure:"max_tokens"`
}
type PredictConfig struct {
    MaxTokens int `mapstructure:"max_tokens"`
}
type EnableConfig struct {
    Chat   bool `mapstructure:"chat"`
    Stream bool `mapstructure:"stream"`
    Tools  bool `mapstructure:"tools"`
    Search bool `mapstructure:"search"`
}
type Config struct {
    Provider      string           `mapstructure:"provider"`
    APIKey        string           `mapstructure:"api_key"`
    Model         string           `mapstructure:"model"`
    BaseURL       string           `mapstructure:"base_url"`
    Temperature   float64          `mapstructure:"temperature"`
    MaxTokens     int              `mapstructure:"max_tokens"`
    ContextWindow int              `mapstructure:"context_window"`
    Timeout       TimeoutConfig    `mapstructure:"timeout"`
    Translate     TranslateConfig  `mapstructure:"translate"`
    Summarize     SummarizeConfig  `mapstructure:"summarize"`
    Complete      CompleteConfig   `mapstructure:"complete"`
    Predict       PredictConfig    `mapstructure:"predict"`
    Enable        EnableConfig     `mapstructure:"enable"`
    // 提示词
    SystemPrompt          string `mapstructure:"system_prompt"`
    TranslatePrompt       string `mapstructure:"translate_prompt"`
    SummarizePrompt       string `mapstructure:"summarize_prompt"`
    CompleteSimplePrompt  string `mapstructure:"complete_simple_prompt"`
    CompleteMediumPrompt  string `mapstructure:"complete_medium_prompt"`
    CompleteComplexPrompt string `mapstructure:"complete_complex_prompt"`
    PredictQuestionPrompt string `mapstructure:"predict_question_prompt"`
}
```

ai/service.go 中的字段引用需要同步更新：
- `s.config.ChatTimeout` → `s.config.Timeout.Chat`
- `s.config.TranslateTemperature` → `s.config.Translate.Temperature`
- `s.config.EnableChat` → `s.config.Enable.Chat`
- 等等

### chatstore.Config

```go
type Config struct {
    MaxImageBytes int64 `mapstructure:"max_image_bytes"`
    MaxFileBytes  int64 `mapstructure:"max_file_bytes"`
}
```

### webchat.Config

```go
type Config struct {
    WriteTimeout  time.Duration `mapstructure:"write_timeout"`
    PongTimeout   time.Duration `mapstructure:"pong_timeout"`
    MaxMessageSize int64        `mapstructure:"max_message_size"`
}
```

## 5. Viper 加载逻辑

```go
func Load() (*AppConfig, error) {
    modules := []string{"config", "auth", "ai", "upload", "websocket"}
    merged := viper.New()
    merged.SetConfigType("yaml")

    for _, name := range modules {
        // 加载默认配置
        base := viper.New()
        base.SetConfigName(name)
        base.AddConfigPath("config")
        _ = base.ReadInConfig()

        // 加载本地覆盖（如果存在）
        local := viper.New()
        local.SetConfigName(name + ".local")
        local.AddConfigPath("config")
        _ = local.ReadInConfig()

        // 合并：local 覆盖 base
        base.MergeConfigMap(local.AllSettings())

        // 环境变量覆盖（部署时可选）
        base.SetEnvPrefix("EASYCHAT")
        base.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
        base.AutomaticEnv()

        merged.MergeConfigMap(base.AllSettings())
    }

    // 设置默认值（YAML 文件不存在时兜底）
    setDefaults(merged)

    var cfg AppConfig
    if err := merged.Unmarshal(&cfg); err != nil {
        return nil, fmt.Errorf("failed to unmarshal config: %w", err)
    }
    return &cfg, nil
}
```

## 6. 类型转换处理

Viper 读取 YAML 时，数值类型需要注意：
- `time.Duration`：YAML 中写秒数（如 `ttl: 24`），Viper 解析为 int，需要在 `Load()` 中转换为 `time.Duration`
- `int64`：YAML 中写 MB 数（如 `max_image_mb: 2`），需要转换为字节数

处理方式：先 unmarshal 到中间结构，再手动转换；或者使用 Viper 的 `DecodeHook`。

推荐方式：在 `Load()` 函数中，unmarshal 后手动处理类型转换：

```go
func Load() (*AppConfig, error) {
    // ... Viper 加载逻辑 ...

    var cfg AppConfig
    merged.Unmarshal(&cfg)

    // 类型转换
    cfg.Auth.TokenTTL = time.Duration(cfg.Auth.TokenTTL) * time.Hour
    cfg.Upload.MaxImageBytes = cfg.Upload.MaxImageBytes * 1024 * 1024
    cfg.Upload.MaxFileBytes = cfg.Upload.MaxFileBytes * 1024 * 1024
    cfg.WebSocket.WriteTimeout = time.Duration(cfg.WebSocket.WriteTimeout) * time.Second
    cfg.WebSocket.PongTimeout = time.Duration(cfg.WebSocket.PongTimeout) * time.Second
    cfg.WebSocket.MaxMessageSize = cfg.WebSocket.MaxMessageSize * 1024 * 1024

    return &cfg, nil
}
```

## 7. 调用链变更

```
  修改前                               修改后
  ═══════════════════════              ═══════════════════════════════

  main.go                              main.go
    webserver.NewServer(addr)            cfg, _ := config.Load()
    │                                    webserver.NewServer(cfg)
    ▼                                      │
  NewServer 内部                           ▼
    auth.LoadConfig()                    NewServer 内部
    ai.LoadConfig()                        auth.NewService(db, cfg.Auth)
    chatstore.LoadConfig()                 ai.NewService(..., cfg.AI)
    webchat.LoadConfig()                   chatstore.NewService(db, dir, cfg.Upload)
    webserver.LoadConfig()                 webchat.NewHub(cfg.WebSocket)
```

## 8. .gitignore 追加

```
# 本地配置覆盖（包含敏感值）
config/*.local.yaml
```

## 9. 各包 NewService 签名变更

| 包 | 修改前 | 修改后 |
|---|---|---|
| auth | `NewService(db) (*Service, error)` | `NewService(db, cfg Config) (*Service, error)` |
| chatstore | `NewService(db, uploadsDir) (*Service, error)` | `NewService(db, uploadsDir string, cfg Config) (*Service, error)` |
| webchat | `NewHub() *Hub` | `NewHub(cfg Config) *Hub` |
| ai | `NewService(provider, store, db, config)` | 不变（已经接收 config） |
| webserver | `NewServer(addr string) *Server` | `NewServer(cfg *config.AppConfig) *Server` |

## 10. 向后兼容

- 开发环境：只用 `config/*.yaml`，不需要设置任何环境变量
- 生产环境：可以用环境变量覆盖任意配置项（`EASYCHAT_AI_API_KEY=sk-xxx`）
- `.local.yaml` 文件不存在时静默忽略，不影响启动
