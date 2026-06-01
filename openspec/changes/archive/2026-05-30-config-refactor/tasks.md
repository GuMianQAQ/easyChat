# 配置整理 — 任务清单

## Phase 1: 公共工具提取

### Task 1.1: 创建 `internal/uid/uid.go`
- [x] 新建 `internal/uid/uid.go`
- [x] 实现 `New(prefix string) string` 函数
- [x] 逻辑与现有 `newID()` 一致（crypto/rand + fallback）

### Task 1.2: 替换各包的 `newID()`
- [x] `internal/auth/service.go` — 删除 `newID()`，改用 `uid.New("usr")`
- [x] `internal/auth/captcha.go` — 改用 `uid.New("cap")`
- [x] `internal/social/service.go` — 删除 `newID()`，改用 `uid.New("frd")` 等
- [x] `internal/moments/service.go` — 删除 `newID()`，改用 `uid.New("mom")` 等
- [x] `internal/chatstore/helpers.go` — 删除 `newID()`
- [x] `internal/chatstore/conversations.go` — 改用 `uid.New("member")` 等
- [x] `internal/chatstore/files.go` — 改用 `uid.New("upload")` 等
- [x] `internal/chatstore/favorites.go` — 改用 `uid.New("fav")`
- [x] `internal/chatstore/groups.go` — 改用 `uid.New("member")`
- [x] 确保所有 import 路径正确
- [x] `go build ./...` 编译通过

## Phase 2: Auth 配置

### Task 2.1: 创建 `internal/auth/config.go`
- [x] 定义 `Config` 结构（JWTSecret, TokenTTL）
- [x] 实现 `LoadConfig()` 函数
- [x] 读取 `EASYCHAT_JWT_SECRET`、`EASYCHAT_JWT_TTL`
- [x] 默认值：secret=easychat-local-development-secret, TTL=24h

### Task 2.2: 修改 `internal/auth/service.go`
- [x] 删除 `tokenTTL` 常量
- [x] `NewService()` 内部调用 `LoadConfig()`
- [x] `Service` 结构持有 `config Config`
- [x] `createToken()` 使用 `s.config.TokenTTL`
- [x] JWT secret 从 `s.config.JWTSecret` 读取

## Phase 3: AI 配置扩充

### Task 3.1: 扩充 `internal/ai/config.go`
- [x] `Config` 结构新增字段：ChatTimeout, StreamTimeout
- [x] 新增字段：TranslateTemperature, TranslateMaxTokens
- [x] 新增字段：SummarizeTemperature, SummarizeMaxTokens
- [x] 新增字段：SystemPrompt, TranslatePrompt, SummarizePrompt, CompleteSimplePrompt, CompleteMediumPrompt, CompleteComplexPrompt, PredictQuestionPrompt
- [x] `DefaultConfig()` 补充新字段默认值
- [x] `LoadConfig()` 补充新环境变量读取

### Task 3.2: 修改 `internal/ai/service.go`
- [x] 删除 `assistantSystemPrompt`、`translateSystemPrompt`、`summarySystemPrompt`、`completeSimplePrompt`、`completeMediumPrompt`、`completeComplexPrompt`、`predictQuestionPrompt` 常量
- [x] `HandleMessage()` 中 `30*time.Second` → `time.Duration(s.config.ChatTimeout)*time.Second`
- [x] `HandleMessageStream()` 中 `60*time.Second` → `time.Duration(s.config.StreamTimeout)*time.Second`
- [x] `Translate()` 中 `Temperature: 0.3` → `s.config.TranslateTemperature`，`MaxTokens: 1000` → `s.config.TranslateMaxTokens`，提示词从 config 读取
- [x] `Summarize()` 同理
- [x] `Complete()` 中提示词从 config 读取（按 granularity 选择）
- [x] `PredictQuestion()` 中提示词从 config 读取
- [x] `HandleMessage()` 和 `HandleMessageStream()` 中 system prompt 从 config 读取

## Phase 4: Chatstore 配置

### Task 4.1: 创建 `internal/chatstore/config.go`
- [x] 定义 `Config` 结构（MaxImageBytes, MaxFileBytes）
- [x] 实现 `LoadConfig()` 函数
- [x] 读取 `EASYCHAT_UPLOAD_MAX_IMAGE_MB`、`EASYCHAT_UPLOAD_MAX_FILE_MB`
- [x] 默认值：image=2MB, file=10MB

### Task 4.2: 修改 `internal/chatstore/service.go`
- [x] 删除 `MaxUploadBytes` 常量
- [x] `Service` 结构新增 `config Config`
- [x] `NewService()` 内部调用 `LoadConfig()`

### Task 4.3: 修改 `internal/chatstore/files.go`
- [x] `StoreUpload()` 中 `file.Size > MaxUploadBytes` → `file.Size > s.config.MaxImageBytes`
- [x] `StoreGenericUpload()` 中 `file.Size > 10*1024*1024` → `file.Size > s.config.MaxFileBytes`

## Phase 5: Webchat 配置

### Task 5.1: 创建 `internal/webchat/config.go`
- [x] 定义 `Config` 结构（WriteTimeout, PongTimeout, MaxMessageSize）
- [x] 实现 `LoadConfig()` 函数
- [x] 读取 `EASYCHAT_WS_WRITE_TIMEOUT`、`EASYCHAT_WS_PONG_TIMEOUT`、`EASYCHAT_WS_MAX_MESSAGE_MB`
- [x] 默认值：write=10s, pong=60s, maxMsg=2MB

### Task 5.2: 修改 `internal/webchat/client.go`
- [x] 删除 `writeWait`、`pongWait`、`pingPeriod`、`maxMessageSize` 常量
- [x] `Client` 结构新增 `config Config`
- [x] `NewClient()` 从 hub.config 获取 config
- [x] `readPump()` 使用 `c.config.MaxMessageSize`、`c.config.PongTimeout`
- [x] `writePump()` 使用 `c.config.WriteTimeout`，ping 从 `c.config.PongTimeout * 9 / 10` 派生

### Task 5.3: 修改 `internal/webchat/hub.go`
- [x] `Hub` 结构持有 `config Config`
- [x] `NewHub()` 内部调用 `LoadConfig()`

### Task 5.4: 修改 `internal/webserver/router.go` (NewClient 调用)
- [x] 无需修改 — NewClient 通过 hub.config 自动获取配置

## Phase 6: Webserver CORS 配置

### Task 6.1: 创建 `internal/webserver/config.go`
- [x] 定义 `Config` 结构（CORSAllowOrigin, CORSMaxAge）
- [x] 实现 `LoadConfig()` 函数
- [x] 读取 `EASYCHAT_CORS_ALLOW_ORIGIN`、`EASYCHAT_CORS_MAX_AGE`
- [x] 默认值：origin=*, maxAge=3600

### Task 6.2: 修改 `internal/webserver/router.go` (CORS)
- [x] `Server` 结构新增 `corsConfig Config`
- [x] `NewServer()` 中调用 `LoadConfig()`
- [x] `corsMiddleware()` 改为 `s.corsMiddleware()` 方法
- [x] CORS 值从 `s.corsConfig` 读取

## Phase 7: .env.example 更新

### Task 7.1: 更新 `.env.example`
- [x] 扩充 AI 配置段，新增所有 AI 环境变量及注释
- [x] 保持现有 AI 配置项不变
- [x] 新增超时、工具参数、提示词的说明

## Phase 8: 验证

### Task 8.1: 编译验证
- [x] `go build ./...` 确保无编译错误
- [x] 检查所有 import 路径正确

### Task 8.2: 测试验证
- [x] `go test ./...` 确保现有测试通过
- [x] 不设置任何新环境变量时，行为与修改前完全一致

### Task 8.3: 功能验证
- [ ] 启动服务器，验证基本功能正常
- [ ] 设置部分环境变量，验证配置生效
