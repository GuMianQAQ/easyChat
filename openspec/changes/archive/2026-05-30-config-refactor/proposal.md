# 配置整理与硬编码抽取

## 背景

项目中大量配置散落在代码里（超时时间、上传限制、AI 工具参数等），修改需要改代码重新编译。
同时存在重复工具函数（`newID()` 出现 4 次）和重复常量。

## 目标

1. 将需要维护/复用的硬编码配置抽取到各功能模块的配置结构中，通过环境变量可覆盖
2. 合并重复的 `newID()` 函数
3. 保持配置按功能域归属，不引入集中式配置框架
4. 功能行为不变，配置读取失败时有合理默认值

## 非目标

- 不引入 Viper 等配置框架
- 不配置 Electron 窗口尺寸、CSS 样式、业务校验规则
- 不重构前端常量（消息长度 500、防抖间隔等属于 UI 交互细节）
- `.env.example` 只保留 AI 配置段，其他功能不放

## 影响范围

### 新建文件
- `internal/auth/config.go`
- `internal/chatstore/config.go`
- `internal/webchat/config.go`
- `internal/webserver/config.go`
- `internal/uid/uid.go`

### 修改文件
- `internal/ai/config.go` — 扩充 AI 工具参数和提示词
- `internal/ai/service.go` — 用 config 字段替换硬编码
- `internal/auth/service.go` — 用 config 替换 JWT 硬编码
- `internal/chatstore/service.go` — 用 config 替换上传限制
- `internal/chatstore/files.go` — 引用 config
- `internal/webchat/client.go` — 用 config 替换 WS 常量
- `internal/webserver/router.go` — 用 config 替换 CORS 常量
- `internal/database/database.go` — 无变更（SQLite 单连接是正确行为）
- `internal/social/service.go` — 替换 `newID()` 引用
- `internal/moments/service.go` — 替换 `newID()` 引用
- `internal/auth/service.go` — 替换 `newID()` 引用
- `main.go` — 可能微调（JWT secret 从 auth config 读取）
- `.env.example` — 扩充 AI 配置段

## 设计原则

- 每个功能包自包含 `Config` 结构和 `LoadConfig()` 函数
- 跟现有 `ai.LoadConfig()` 模式一致
- 环境变量前缀统一为 `EASYCHAT_`
- 数值类配置解析失败时静默使用默认值，不 panic
