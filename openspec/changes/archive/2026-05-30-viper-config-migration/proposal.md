# Viper + YAML 配置迁移

## 背景

当前配置方案（config-refactor 刚实现的）存在以下问题：

1. **每个包各自调用 `LoadConfig()` 读环境变量**——配置散落在代码里，没有统一入口
2. **`.env` 平面结构**——没有层级，前缀堆砌，看不出配置全貌
3. **不利于微服务拆分**——所有配置混在一起，未来拆服务时需要重新整理
4. **开发体验差**——需要手动设置环境变量或维护 `.env` 文件

## 目标

1. 引入 Viper 库，用 YAML 文件管理配置（类似 Spring Boot 的 `application.yml`）
2. 按模块拆分配置文件，每个模块一个 `config/<module>.yaml`
3. 支持 `.local.yaml` 覆盖敏感值（API key、JWT secret），`.local.yaml` 不提交到 GitHub
4. 各包只保留 Config 结构体，不再自己读配置
5. 统一由 `internal/config` 包加载，分发给各服务
6. 删除 config-refactor 中创建的各包 `LoadConfig()` 函数和相关代码

## 非目标

- 不引入热加载（WatchConfig）
- 不引入远程配置中心（Consul/etcd）
- 不修改前端配置
- 不修改 Electron 配置

## 影响范围

### 新增依赖
- `github.com/spf13/viper`

### 新建文件
- `internal/config/config.go` — Viper 统一加载
- `config/config.yaml` — 全局配置
- `config/auth.yaml` — 认证配置
- `config/ai.yaml` — AI 配置
- `config/upload.yaml` — 上传配置
- `config/websocket.yaml` — WebSocket 配置

### 修改文件
- `go.mod` / `go.sum` — 添加 viper 依赖
- `main.go` — 调用 `config.Load()` 获取配置，传给 `webserver.NewServer()`
- `internal/webserver/router.go` — `NewServer()` 接收 `*config.AppConfig`，分发给各服务
- `internal/ai/config.go` — 删除 `LoadConfig()`、`loadDotEnv()`、`DefaultConfig()`，只保留结构体和提示词常量
- `internal/auth/service.go` — `NewService()` 接收 `auth.Config` 参数
- `internal/chatstore/service.go` — `NewService()` 接收 `chatstore.Config` 参数
- `internal/chatstore/files.go` — 从 config 读取上传限制
- `internal/webchat/hub.go` — `NewHub()` 接收 `webchat.Config` 参数
- `internal/webchat/client.go` — 从 hub.config 读取
- `.gitignore` — 添加 `config/*.local.yaml`

### 删除文件
- `internal/auth/config.go` — 整个文件删除（LoadConfig 读 env）
- `internal/chatstore/config.go` — 整个文件删除
- `internal/webchat/config.go` — 整个文件删除
- `internal/webserver/config.go` — 整个文件删除

### 删除代码
- `internal/ai/config.go` 中的 `LoadConfig()` 函数
- `internal/ai/config.go` 中的 `loadDotEnv()` 函数
- `internal/ai/config.go` 中的 `DefaultConfig()` 函数
- `internal/ai/config.go` 中不再需要的 import（bufio, path/filepath）
- `.env.example` — 删除（用 config/*.yaml 替代）
