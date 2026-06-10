## Why

当前代码存在多个质量问题，影响可维护性和性能：

1. **错误处理脆弱**：39处使用字符串匹配判断错误类型，修改错误信息会导致功能失效
2. **性能问题**：`GetMessagesAround` 全量加载会话消息到内存，历史消息多的会话会卡死
3. **代码重复**：`lookupUser`、`formatTime`、`normalizeGender` 等函数在多个包中重复
4. **认证代码冗余**：每个路由 handler 都重复认证逻辑，约200行重复代码
5. **N+1查询**：`GetGroupConversation`、`ListFriendRequests` 等函数存在循环查询

## What Changes

### 阶段1：错误处理重构（影响最大）
- 创建自定义错误类型 `AppError`，替代 `errors.New()`
- 在 webserver 层添加错误处理中间件，统一处理错误响应
- 删除所有 `strings.Contains(err.Error(), ...)` 字符串匹配（39处）

### 阶段2：性能优化
- 重写 `GetMessagesAround`，使用 SQL 分页替代全量加载
- 优化 `GetGroupConversation`、`ListFriendRequests`、`ListFriends` 的 N+1 查询

### 阶段3：代码重复消除
- 提取认证中间件 `AuthRequired()`
- 合并重复的工具函数到公共包

## Capabilities

### Modified Capabilities

- `error-handling`: 改进错误处理机制，使用类型安全的自定义错误
- `performance`: 优化数据库查询性能，减少内存占用
- `code-quality`: 消除代码重复，提高可维护性

## Impact

### 阶段1：错误处理重构
- **新增文件**: `internal/errors/errors.go` - 自定义错误类型定义
- **修改文件**: 
  - `internal/chatstore/*.go` - 返回 `AppError` 替代 `errors.New()`
  - `internal/social/*.go` - 返回 `AppError` 替代 `errors.New()`
  - `internal/webserver/middleware.go` - 新增错误处理中间件
  - `internal/webserver/*_routes.go` - 删除字符串匹配，使用中间件

### 阶段2：性能优化
- **修改文件**:
  - `internal/chatstore/messages.go` - 重写 `GetMessagesAround`
  - `internal/chatstore/groups.go` - 优化 `GetGroupConversation`
  - `internal/social/service.go` - 优化 `ListFriendRequests`、`ListFriends`

### 阶段3：代码重复消除
- **新增文件**: `internal/middleware/auth.go` - 认证中间件
- **修改文件**:
  - `internal/webserver/router.go` - 注册中间件
  - `internal/webserver/*_routes.go` - 使用中间件替代重复代码

## 约束

- API 响应格式不变，前端无需修改
- 补充测试覆盖
- 直接替换代码，不保留旧逻辑
