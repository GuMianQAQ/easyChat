# 配置整理 — 详细设计

## 1. 配置架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                    配置归属 — 按功能域拆分                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  internal/ai/config.go          ← 扩充工具参数和提示词      │
│  internal/auth/config.go        ← 新建，JWT Secret/TTL      │
│  internal/chatstore/config.go   ← 新建，上传大小限制        │
│  internal/webchat/config.go     ← 新建，WS 超时/消息大小    │
│  internal/webserver/config.go   ← 新建，CORS 参数           │
│  internal/uid/uid.go            ← 新建，公共 ID 生成        │
│                                                             │
│  每个包自己 LoadConfig()，读 env，给默认值                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 2. 各模块配置详情

### 2.1 AI 配置 — 扩充 `internal/ai/config.go`

现有 `Config` 结构新增字段：

```go
type Config struct {
    // ... 现有字段保持不变 ...

    // 新增：超时
    ChatTimeout   int `json:"chat_timeout"`   // 秒，默认 30
    StreamTimeout int `json:"stream_timeout"` // 秒，默认 60

    // 新增：翻译工具参数
    TranslateTemperature float64 `json:"translate_temperature"` // 默认 0.3
    TranslateMaxTokens   int     `json:"translate_max_tokens"`  // 默认 1000

    // 新增：摘要工具参数
    SummarizeTemperature float64 `json:"summarize_temperature"` // 默认 0.3
    SummarizeMaxTokens   int     `json:"summarize_max_tokens"`  // 默认 500

    // 新增：系统提示词
    SystemPrompt        string `json:"-"` // 默认内置值
    TranslatePrompt     string `json:"-"` // 默认内置值
    SummarizePrompt     string `json:"-"` // 默认内置值
    CompleteSimplePrompt  string `json:"-"`
    CompleteMediumPrompt  string `json:"-"`
    CompleteComplexPrompt string `json:"-"`
    PredictQuestionPrompt string `json:"-"`
}
```

环境变量映射：
```
EASYCHAT_AI_CHAT_TIMEOUT=30
EASYCHAT_AI_STREAM_TIMEOUT=60
EASYCHAT_AI_TRANSLATE_TEMPERATURE=0.3
EASYCHAT_AI_TRANSLATE_MAX_TOKENS=1000
EASYCHAT_AI_SUMMARIZE_TEMPERATURE=0.3
EASYCHAT_AI_SUMMARIZE_MAX_TOKENS=500
EASYCHAT_AI_SYSTEM_PROMPT=                # 留空用默认值
EASYCHAT_AI_TRANSLATE_PROMPT=
EASYCHAT_AI_SUMMARIZE_PROMPT=
EASYCHAT_AI_COMPLETE_SIMPLE_PROMPT=
EASYCHAT_AI_COMPLETE_MEDIUM_PROMPT=
EASYCHAT_AI_COMPLETE_COMPLEX_PROMPT=
EASYCHAT_AI_PREDICT_QUESTION_PROMPT=
```

`service.go` 变更：
- `assistantSystemPrompt` 等常量改为从 `s.config.SystemPrompt` 等读取
- `context.WithTimeout(context.Background(), 30*time.Second)` → `time.Duration(s.config.ChatTimeout) * time.Second`
- `Translate()` 中的 `Temperature: 0.3, MaxTokens: 1000` → `s.config.TranslateTemperature, s.config.TranslateMaxTokens`
- `Summarize()` 同理

### 2.2 Auth 配置 — 新建 `internal/auth/config.go`

```go
type Config struct {
    JWTSecret string        // 环境变量 EASYCHAT_JWT_SECRET
    TokenTTL  time.Duration // 环境变量 EASYCHAT_JWT_TTL（小时），默认 24
}

func LoadConfig() Config {
    cfg := Config{
        JWTSecret: "easychat-local-development-secret",
        TokenTTL:  24 * time.Hour,
    }
    if v := os.Getenv("EASYCHAT_JWT_SECRET"); v != "" {
        cfg.JWTSecret = v
    }
    if v := os.Getenv("EASYCHAT_JWT_TTL"); v != "" {
        if n, err := strconv.Atoi(v); err == nil && n > 0 {
            cfg.TokenTTL = time.Duration(n) * time.Hour
        }
    }
    return cfg
}
```

`service.go` 变更：
- `NewService(db)` → `NewService(db)` 内部调用 `LoadConfig()`
- `tokenTTL` 常量删除，改用 `s.config.TokenTTL`
- JWT secret 从 config 读取

### 2.3 Chatstore 配置 — 新建 `internal/chatstore/config.go`

```go
type Config struct {
    MaxImageBytes int64 // 环境变量 EASYCHAT_UPLOAD_MAX_IMAGE_MB，默认 2
    MaxFileBytes  int64 // 环境变量 EASYCHAT_UPLOAD_MAX_FILE_MB，默认 10
}

func LoadConfig() Config {
    cfg := Config{
        MaxImageBytes: 2 * 1024 * 1024,
        MaxFileBytes:  10 * 1024 * 1024,
    }
    if v := os.Getenv("EASYCHAT_UPLOAD_MAX_IMAGE_MB"); v != "" {
        if n, err := strconv.Atoi(v); err == nil && n > 0 {
            cfg.MaxImageBytes = int64(n) * 1024 * 1024
        }
    }
    if v := os.Getenv("EASYCHAT_UPLOAD_MAX_FILE_MB"); v != "" {
        if n, err := strconv.Atoi(v); err == nil && n > 0 {
            cfg.MaxFileBytes = int64(n) * 1024 * 1024
        }
    }
    return cfg
}
```

`service.go` 变更：
- `MaxUploadBytes` 常量删除
- `Service` 结构新增 `config Config` 字段
- `NewService()` 内部调用 `LoadConfig()`

`files.go` 变更：
- `file.Size > MaxUploadBytes` → `file.Size > s.config.MaxImageBytes`
- `file.Size > 10*1024*1024` → `file.Size > s.config.MaxFileBytes`

### 2.4 Webchat 配置 — 新建 `internal/webchat/config.go`

```go
type Config struct {
    WriteTimeout  time.Duration // 环境变量 EASYCHAT_WS_WRITE_TIMEOUT（秒），默认 10
    PongTimeout   time.Duration // 环境变量 EASYCHAT_WS_PONG_TIMEOUT（秒），默认 60
    MaxMessageSize int64        // 环境变量 EASYCHAT_WS_MAX_MESSAGE_MB（MB），默认 2
}

func LoadConfig() Config {
    cfg := Config{
        WriteTimeout:   10 * time.Second,
        PongTimeout:    60 * time.Second,
        MaxMessageSize: 2 * 1024 * 1024,
    }
    // ... 从环境变量读取 ...
    return cfg
}
```

`client.go` 变更：
- `writeWait`、`pongWait`、`maxMessageSize` 常量删除
- `pingPeriod` 由 `config.PongTimeout * 9 / 10` 派生
- `Client` 结构持有 config 引用
- `Hub` 创建时加载 config，传递给 Client

### 2.5 Webserver 配置 — 新建 `internal/webserver/config.go`

```go
type Config struct {
    CORSAllowOrigin string // 环境变量 EASYCHAT_CORS_ALLOW_ORIGIN，默认 "*"
    CORSMaxAge      int    // 环境变量 EASYCHAT_CORS_MAX_AGE，默认 3600
}

func LoadConfig() Config {
    cfg := Config{
        CORSAllowOrigin: "*",
        CORSMaxAge:      3600,
    }
    if v := os.Getenv("EASYCHAT_CORS_ALLOW_ORIGIN"); v != "" {
        cfg.CORSAllowOrigin = v
    }
    if v := os.Getenv("EASYCHAT_CORS_MAX_AGE"); v != "" {
        if n, err := strconv.Atoi(v); err == nil && n > 0 {
            cfg.CORSMaxAge = n
        }
    }
    return cfg
}
```

`router.go` 变更：
- `corsMiddleware()` 中的硬编码值改为从 config 读取
- `Server` 结构持有 `corsConfig` 或在 `corsMiddleware` 中传入 config

### 2.6 公共 ID 生成 — 新建 `internal/uid/uid.go`

```go
package uid

import (
    "crypto/rand"
    "fmt"
    "time"
)

func New(prefix string) string {
    buf := make([]byte, 16)
    if _, err := rand.Read(buf); err != nil {
        return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
    }
    return fmt.Sprintf("%s-%x", prefix, buf)
}
```

替换以下 4 处重复实现：
- `internal/auth/service.go:482` `newID()`
- `internal/social/service.go:866` `newID()`
- `internal/moments/service.go:433` `newID()`
- `internal/chatstore/helpers.go`（如存在）

每处改为 `import "easyChat/internal/uid"` 然后调用 `uid.New("usr")` 等。

## 3. 数据流变更

```
  .env / 环境变量
       │
       ▼
  各包 LoadConfig() ──→ 返回 Config 结构
       │
       ▼
  NewService(config) ──→ Service 持有 config
       │
       ▼
  运行时从 s.config.XXX 读取，不再硬编码
```

## 4. 向后兼容

- 所有配置都有默认值，不设置环境变量时行为完全不变
- `EASYCHAT_JWT_SECRET` 空值时使用原默认值（开发环境）
- AI 提示词环境变量为空时使用内置默认值

## 5. 不变更的部分

| 项目 | 原因 |
|---|---|
| 数据库连接池参数 | SQLite 单连接是正确行为 |
| 验证码内部参数 (132×44, 4位) | 内部渲染细节 |
| 密码/用户名格式规则 | 业务规则，不需要外部配置 |
| 消息最大长度 500 (前端) | UI 交互细节 |
| 防抖间隔 500ms (前端) | UI 交互细节 |
| 搜索权重 0.4/0.6 | 算法内部参数 |
| WebSocket send buffer 64 | 实现细节 |
| Electron 窗口尺寸 | 产品定义 |
