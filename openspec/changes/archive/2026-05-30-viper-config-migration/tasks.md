# Viper + YAML 配置迁移 — 任务清单

## Phase 0: 准备工作

### Task 0.1: 安装 Viper 依赖
- [ ] `go get github.com/spf13/viper`
- [ ] 确认 `go.mod` 和 `go.sum` 更新

## Phase 1: 创建配置文件

### Task 1.1: 创建 config 目录和 YAML 文件
- [ ] 创建 `config/` 目录
- [ ] 创建 `config/config.yaml`（server.addr, cors）
- [ ] 创建 `config/auth.yaml`（jwt.secret, jwt.ttl）
- [ ] 创建 `config/ai.yaml`（所有 AI 配置项，提示词留空由 Go 常量兜底）
- [ ] 创建 `config/upload.yaml`（max_image_mb, max_file_mb）
- [ ] 创建 `config/websocket.yaml`（write_timeout, pong_timeout, max_message_mb）

### Task 1.2: 更新 .gitignore
- [ ] 追加 `config/*.local.yaml`

## Phase 2: 创建统一配置加载器

### Task 2.1: 创建 `internal/config/config.go`
- [ ] 定义 `ServerConfig`、`CORSConfig` 结构体
- [ ] 定义 `AppConfig` 结构体，引用各包的 Config 类型
- [ ] 实现 `Load()` 函数：Viper 加载 YAML + .local.yaml 覆盖 + 环境变量覆盖
- [ ] 实现 `setDefaults()` 函数：兜底默认值
- [ ] 处理类型转换（秒→Duration, MB→字节）
- [ ] 日志输出加载的配置来源

## Phase 3: 修改各包 Config 结构体

### Task 3.1: 重写 `internal/ai/config.go`
- [ ] 删除 `LoadConfig()` 函数（第 98-205 行）
- [ ] 删除 `loadDotEnv()` 函数（第 219-281 行）
- [ ] 删除 `DefaultConfig()` 函数（第 60-96 行）
- [ ] 删除不再需要的 import（bufio, log, os, path/filepath, strconv, strings）
- [ ] 重构 Config 结构体以匹配 YAML 嵌套结构：
  ```go
  type TimeoutConfig struct {
      Chat   int `mapstructure:"chat"`
      Stream int `mapstructure:"stream"`
  }
  type TranslateConfig struct {
      Temperature float64 `mapstructure:"temperature"`
      MaxTokens   int     `mapstructure:"max_tokens"`
  }
  // ... 类似 SummarizeConfig, CompleteConfig, PredictConfig, EnableConfig
  type Config struct {
      Provider  string         `mapstructure:"provider"`
      APIKey    string         `mapstructure:"api_key"`
      Model     string         `mapstructure:"model"`
      BaseURL   string         `mapstructure:"base_url"`
      Temperature float64      `mapstructure:"temperature"`
      MaxTokens   int          `mapstructure:"max_tokens"`
      ContextWindow int        `mapstructure:"context_window"`
      Timeout     TimeoutConfig    `mapstructure:"timeout"`
      Translate   TranslateConfig  `mapstructure:"translate"`
      Summarize   SummarizeConfig  `mapstructure:"summarize"`
      Complete    CompleteConfig   `mapstructure:"complete"`
      Predict     PredictConfig    `mapstructure:"predict"`
      Enable      EnableConfig     `mapstructure:"enable"`
      // 提示词字段保持 string，通过 mapstructure tag 映射
      SystemPrompt          string `mapstructure:"system_prompt"`
      TranslatePrompt       string `mapstructure:"translate_prompt"`
      // ...
  }
  ```
- [ ] 保留提示词常量（`defaultSystemPrompt` 等）
- [ ] 保留 `NewProvider()` 函数（不需要改）

### Task 3.2: 修改 `internal/ai/service.go` 字段引用
- [ ] `s.config.ChatTimeout` → `s.config.Timeout.Chat`
- [ ] `s.config.StreamTimeout` → `s.config.Timeout.Stream`
- [ ] `s.config.TranslateTemperature` → `s.config.Translate.Temperature`
- [ ] `s.config.TranslateMaxTokens` → `s.config.Translate.MaxTokens`
- [ ] `s.config.SummarizeTemperature` → `s.config.Summarize.Temperature`
- [ ] `s.config.SummarizeMaxTokens` → `s.config.Summarize.MaxTokens`
- [ ] `s.config.CompleteMaxTokens` → `s.config.Complete.MaxTokens`
- [ ] `s.config.PredictMaxTokens` → `s.config.Predict.MaxTokens`
- [ ] `s.config.EnableChat` → `s.config.Enable.Chat`
- [ ] `s.config.EnableStream` → `s.config.Enable.Stream`
- [ ] `s.config.EnableTools` → `s.config.Enable.Tools`
- [ ] `s.config.EnableSearch` → `s.config.Enable.Search`
- [ ] 提示词字段引用不变（`s.config.SystemPrompt` 等）

### Task 3.3: 重写 `internal/auth/config.go`
- [ ] 删除 `LoadConfig()` 函数
- [ ] 只保留 Config 结构体，添加 `mapstructure` tag
- [ ] 删除不再需要的 import（os, strconv）

### Task 3.4: 重写 `internal/chatstore/config.go`
- [ ] 删除 `LoadConfig()` 函数
- [ ] 只保留 Config 结构体，添加 `mapstructure` tag
- [ ] 删除不再需要的 import（os, strconv）

### Task 3.5: 重写 `internal/webchat/config.go`
- [ ] 删除 `LoadConfig()` 函数
- [ ] 只保留 Config 结构体，添加 `mapstructure` tag
- [ ] 删除不再需要的 import（os, strconv）

### Task 3.6: 删除 `internal/webserver/config.go`
- [ ] 整个文件删除（CORS 配置移入 config 包的 ServerConfig/CORSConfig）

## Phase 4: 修改各包 NewService/NewHub 签名

### Task 4.1: 修改 `internal/auth/service.go`
- [ ] `NewService(db)` → `NewService(db, cfg Config)`
- [ ] 删除内部调用 `LoadConfig()`
- [ ] 使用传入的 `cfg` 初始化 Service

### Task 4.2: 修改 `internal/chatstore/service.go`
- [ ] `NewService(db, uploadsDir)` → `NewService(db, uploadsDir string, cfg Config)`
- [ ] 删除内部调用 `LoadConfig()`
- [ ] 使用传入的 `cfg` 初始化 Service

### Task 4.3: 修改 `internal/chatstore/files.go`
- [ ] 确认从 `s.config` 读取上传限制（已经是，无需改动）

### Task 4.4: 修改 `internal/webchat/hub.go`
- [ ] `NewHub()` → `NewHub(cfg Config)`
- [ ] 删除内部调用 `LoadConfig()`
- [ ] 使用传入的 `cfg` 初始化 Hub

## Phase 5: 修改调用方

### Task 5.1: 修改 `internal/webserver/router.go`
- [ ] `NewServer(addr string)` → `NewServer(cfg *config.AppConfig)`
- [ ] 删除 `corsConfig` 字段（CORS 从 cfg.CORS 读取）
- [ ] `auth.NewService(db)` → `auth.NewService(db, cfg.Auth)`
- [ ] `chatstore.NewService(db, dir)` → `chatstore.NewService(db, dir, cfg.Upload)`
- [ ] `webchat.NewHub()` → `webchat.NewHub(cfg.WebSocket)`
- [ ] `corsMiddleware()` 使用 `cfg.CORS` 而非 `s.corsConfig`
- [ ] `s.Addr` 从 `cfg.Server.Addr` 读取
- [ ] 删除 `LoadConfig()` 相关 import

### Task 5.2: 修改 `main.go`
- [ ] 调用 `config.Load()` 获取配置
- [ ] 将配置传给 `webserver.NewServer(cfg)`
- [ ] 删除 `addr` flag（地址从配置读取）

### Task 5.3: 修改 `internal/webserver/behavior_matrix_test.go`
- [ ] `auth.NewService(db)` → `auth.NewService(db, auth.Config{...})`
- [ ] `chatstore.NewService(db, dir)` → `chatstore.NewService(db, dir, chatstore.Config{...})`
- [ ] 测试中使用合理的默认配置值

## Phase 6: 清理

### Task 6.1: 删除废弃文件
- [ ] 删除 `.env.example`（用 config/*.yaml 替代）

### Task 6.2: 全局编译验证
- [ ] `go build ./...` 确保无编译错误

### Task 6.3: 测试验证
- [ ] `go test ./...` 确保所有测试通过

### Task 6.4: 功能验证
- [ ] 不创建 `.local.yaml` 文件，直接启动，验证默认配置生效
- [ ] 创建 `config/ai.local.yaml` 填入 API key，验证覆盖生效
