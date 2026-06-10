## 任务列表

### Code Review 要求

**每个任务完成后必须进行 Code Review，检查以下内容：**
1. 冗余代码：删除未使用的变量、导入、重复逻辑
2. 乱码：检查中文字符编码，确保无乱码
3. 时空复杂度：优化算法复杂度，减少不必要的内存分配
4. 代码风格：保持与现有代码风格一致

---

### 阶段1：错误处理重构

- [x] 1.1 创建 `internal/errors/errors.go` 文件
  - 定义 `AppError` 结构体（包含 Code 和 Message 字段）
  - 按模块定义所有预定义错误变量：
    - chatstore 模块错误（约100个）
    - social 模块错误（约20个）
    - moments 模块错误（约14个）
    - auth 模块错误（约10个）
    - webserver 模块错误（约10个）
  - **Code Review**: 检查错误变量命名是否一致，是否有遗漏

- [x] 1.2 修改 `internal/chatstore` 包
  - 修改文件：groups.go, conversations.go, messages.go, votes.go, solitaire.go, group_files.go, files.go, favorites.go, pinned.go, invites.go
  - 替换所有 `errors.New()` 为预定义错误
  - **Code Review**: 检查是否有遗漏的 errors.New()，是否有冗余代码

- [x] 1.3 修改 `internal/social/service.go`
  - 替换所有 `errors.New()` 为预定义错误
  - **Code Review**: 检查错误类型是否正确

- [x] 1.4 修改 `internal/moments/service.go`
  - 替换所有 `errors.New()` 为预定义错误
  - **Code Review**: 检查错误类型是否正确

- [x] 1.5 修改 `internal/auth/service.go`
  - 替换所有 `errors.New()` 为预定义错误
  - **Code Review**: 检查错误类型是否正确

- [x] 1.6 创建 `internal/webserver/middleware.go`
  - 实现 `ErrorHandler()` 中间件
  - 使用 `errors.As` 判断错误类型
  - 返回对应的 HTTP 状态码和错误信息
  - 处理未知错误类型（默认返回 500）
  - **Code Review**: 检查中间件逻辑，确保无死循环

- [x] 1.7 修改所有路由文件
  - 修改文件：group_routes.go, conversation_routes.go, message_routes.go, vote_routes.go, solitaire_routes.go, auth_routes.go, friend_routes.go, file_routes.go, favorite_routes.go, moment_routes.go, ai_routes.go
  - 删除所有 `strings.Contains(err.Error(), ...)` 判断（39处）
  - 使用 `c.Error(err)` 传递错误给中间件
  - 保留非错误处理的业务逻辑
  - **Code Review**: 检查是否有遗漏的字符串匹配，是否有冗余代码

- [x] 1.8 补充错误处理测试
  - 为 `AppError` 添加单元测试
  - 为错误处理中间件添加单元测试
  - 为关键错误路径添加集成测试
  - **Code Review**: 检查测试覆盖率

---

### 阶段2：性能优化

- [x] 2.1 重写 `internal/chatstore/messages.go` 中的 `GetMessagesAround`
  - 先查询目标消息的 `created_at` 和 `id`
  - 使用 SQL 分页查询前半部分：`WHERE created_at < ? OR (created_at = ? AND id < ?)`
  - 使用 SQL 分页查询后半部分：`WHERE created_at >= ? OR (created_at = ? AND id >= ?)`
  - 边界条件：当 `created_at` 相同时，使用 `id` 作为第二排序条件
  - 合并结果并返回
  - **Code Review**: 检查 SQL 效率，检查边界条件处理

- [x] 2.2 优化 `internal/chatstore/groups.go` 中的 `GetGroupConversation`
  - 收集所有成员的 `UserID`
  - 批量查询用户信息：`WHERE id IN (?)`
  - 使用 map 构建用户信息映射
  - **Code Review**: 检查批量查询效率，检查内存使用

- [x] 2.3 优化 `internal/social/service.go` 中的 `ListFriendRequests`
  - 批量查询用户信息
  - 批量查询好友关系
  - 批量查询请求状态
  - 减少循环中的数据库查询（从 N*4 次减少到 3 次）
  - **Code Review**: 检查批量查询效率

- [x] 2.4 优化 `internal/social/service.go` 中的 `ListFriends`
  - 批量查询用户信息
  - 批量查询反向好友关系
  - 减少循环中的数据库查询（从 N*2 次减少到 2 次）
  - **Code Review**: 检查批量查询效率

- [x] 2.5 补充性能测试
  - 为 `GetMessagesAround` 添加基准测试
  - 为优化后的函数添加基准测试
  - 对比优化前后的性能差异
  - **Code Review**: 检查测试覆盖率

---

### 阶段3：代码重复消除

- [x] 3.1 创建 `internal/middleware/auth.go`
  - 实现 `AuthRequired()` 中间件
  - 将用户信息存入 `c.Set("user", user)`
  - 处理认证失败情况（返回 401）
  - 处理可选认证情况（某些路由不需要认证）
  - **Code Review**: 检查中间件逻辑

- [x] 3.2 修改 `internal/webserver/router.go`
  - 注册认证中间件
  - 处理 WebSocket 路由认证（使用 query 参数 token）
  - 处理可选认证路由
  - **Code Review**: 检查中间件注册顺序

- [x] 3.3 修改所有路由文件
  - 修改文件：group_routes.go, conversation_routes.go, message_routes.go, vote_routes.go, solitaire_routes.go, auth_routes.go, friend_routes.go, file_routes.go, favorite_routes.go, moment_routes.go, ai_routes.go
  - 删除重复的认证代码（约50+处）
  - 使用 `c.MustGet("user").(auth.PublicUser)` 获取用户
  - 保留非认证的业务逻辑
  - **Code Review**: 检查是否有遗漏的认证代码，是否有冗余代码

- [x] 3.4 合并重复的工具函数
  - 在 `internal/auth` 包中创建 `LookupUser(db *gorm.DB, userID string) (User, error)` 公共函数
  - 在 `internal/auth` 包中创建 `FormatTime(value time.Time) string` 公共函数
  - 在 `internal/auth` 包中创建 `NormalizeGender(value string) string` 公共函数
  - 修改 `chatstore` 和 `social` 包，使用公共函数
  - 删除重复的函数实现
  - **Code Review**: 检查是否有遗漏的重复函数

- [x] 3.5 补充中间件测试
  - 为认证中间件添加单元测试
  - 为工具函数添加单元测试
  - **Code Review**: 检查测试覆盖率

---

### 阶段4：调用链修复（Code Review 发现）

- [x] 4.1 修复 `c.JSON(400, err.Error())` 为 `c.Error(err)`
  - 修改文件：friend_routes.go (14处), moment_routes.go (7处), vote_routes.go (4处), solitaire_routes.go (4处), favorite_routes.go (4处), conversation_routes.go (3处), file_routes.go (3处), group_routes.go (1处), auth_routes.go (2处)
  - 确保所有 AppError 通过 ErrorHandler 中间件处理
  - **Code Review**: 验证错误状态码正确返回

- [x] 4.2 修复 `auth_routes.go` 中的重复认证
  - `UpdateProfile` 和 `ChangePassword` 改为从 context 获取用户
  - 避免重复调用 `verifyToken` 和数据库查询
  - **Code Review**: 验证认证流程正确

- [x] 4.3 验证调用链完整性
  - 运行所有测试
  - 验证 ErrorHandler 中间件正确处理所有错误
  - 验证 authMiddleware 正确传递用户信息
  - **Code Review**: 端到端测试验证

---

## 依赖关系

- 阶段1、阶段2、阶段3 可以并行进行，但建议按顺序执行以减少冲突
- 每个阶段的测试应该在该阶段完成后立即补充
- 建议执行顺序：1.1 → 1.2-1.5 → 1.6 → 1.7 → 1.8 → 2.1-2.4 → 2.5 → 3.1-3.2 → 3.3-3.4 → 3.5

## 验收标准

1. 所有测试通过
2. `go vet` 无警告
3. `go build` 成功
4. API 响应格式不变
5. 性能测试显示明显提升
6. 每个 task 完成后 Code Review 通过
7. 无冗余代码
8. 无乱码
9. 时空复杂度优化
