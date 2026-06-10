## Context

当前 easyChat 项目存在多个代码质量问题：

1. **错误处理**：使用 `errors.New()` 创建错误，然后在 webserver 层用 `strings.Contains()` 匹配错误信息字符串来判断错误类型。这种方式：
   - 依赖错误消息的精确文本，修改消息会破坏逻辑
   - 性能差（每次错误都做字符串搜索）
   - 容易误匹配（子串匹配可能匹配到不相关的错误）

2. **性能问题**：`GetMessagesAround` 函数会加载整个会话的所有消息到内存，然后在内存中查找目标消息的位置。对于历史消息多的会话，这会造成严重的内存和性能问题。

3. **代码重复**：`lookupUser`、`formatTime`、`normalizeGender` 等函数在 `chatstore` 和 `social` 包中重复实现。

4. **认证冗余**：每个路由 handler 都重复认证代码，约50+处重复。

## Goals / Non-Goals

### Goals
- 消除字符串匹配的错误处理模式，使用类型安全的自定义错误
- 优化 `GetMessagesAround` 性能，避免全量加载
- 消除 N+1 查询问题
- 提取认证中间件，减少代码重复
- 补充测试覆盖

### Non-Goals
- 不改变 API 响应格式
- 不重构项目整体架构
- 不引入新的依赖

## Decisions

### Decision 1: 自定义错误类型设计

**选择**: 使用 `AppError` 结构体，包含 HTTP 状态码和错误信息

```go
type AppError struct {
    Code    int
    Message string
}

func (e *AppError) Error() string { return e.Message }
```

**理由**:
- 类型安全，使用 `errors.As` 进行类型断言
- 包含 HTTP 状态码，中间件可以直接使用
- 预定义错误变量，避免重复创建

**替代方案**: 使用 iota 枚举错误码 - 但需要额外的错误码到 HTTP 状态码映射

### Decision 2: GetMessagesAround 优化策略

**选择**: 使用 SQL 分页查询替代全量加载

```sql
-- 获取目标消息的时间戳
SELECT created_at FROM messages WHERE id = ? AND conversation_id = ?

-- 获取前半部分
SELECT * FROM messages 
WHERE conversation_id = ? AND created_at < ?
ORDER BY created_at DESC, id DESC
LIMIT ?

-- 获取后半部分
SELECT * FROM messages 
WHERE conversation_id = ? AND created_at >= ?
ORDER BY created_at ASC, id ASC
LIMIT ?
```

**理由**:
- 只查询需要的消息，内存占用极小
- 利用索引，查询速度快
- 逻辑清晰，易于维护

**替代方案**: 使用子查询和 UNION - 但 SQL 复杂度高，可读性差

### Decision 3: 认证中间件设计

**选择**: Gin 中间件，将用户信息存入 context

```go
func (s *Server) AuthRequired() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := bearerToken(c)
        user, err := s.Auth.UserFromToken(token)
        if err != nil {
            c.AbortWithStatusJSON(401, gin.H{"error": err.Error()})
            return
        }
        c.Set("user", user)
        c.Next()
    }
}
```

**理由**:
- 标准 Gin 模式，易于理解
- 用户信息存入 context，handler 中通过 `c.MustGet("user")` 获取
- 认证逻辑集中在一处，便于维护

**替代方案**: 使用闭包传递用户信息 - 但会改变 handler 签名

### Decision 4: N+1 查询优化策略

**选择**: 批量查询 + 内存映射

```go
// 收集所有需要的 ID
userIDs := make([]string, 0, len(records))
for _, record := range records {
    userIDs = append(userIDs, record.UserID)
}

// 批量查询
var users []auth.User
s.db.Where("id IN ?", userIDs).Find(&users)

// 构建映射
userMap := make(map[string]auth.User, len(users))
for _, user := range users {
    userMap[user.ID] = user
}
```

**理由**:
- 减少数据库查询次数
- 使用 map 查找，时间复杂度 O(1)
- 代码清晰，易于理解

**替代方案**: 使用 GORM Preload - 但需要修改模型关系，影响较大

## Risks / Trade-offs

### 风险1: 错误类型转换不完整
- **风险**: 如果某些错误路径没有正确转换为 `AppError`，会导致 500 错误
- **缓解**: 逐步转换，先转换核心路径，添加测试覆盖

### 风险2: 性能优化引入新 bug
- **风险**: SQL 分页查询的边界条件可能处理不当
- **缓解**: 补充单元测试，覆盖各种边界情况

### 风险3: 中间件顺序问题
- **风险**: 错误处理中间件和认证中间件的顺序可能影响行为
- **缓解**: 明确中间件执行顺序，添加集成测试

## Migration Plan

### 阶段1: 错误处理重构 (1-2天)
1. 创建 `internal/errors/errors.go`
2. 修改 `chatstore` 和 `social` 包，返回 `AppError`
3. 创建错误处理中间件
4. 修改路由层，删除字符串匹配
5. 补充测试

### 阶段2: 性能优化 (1天)
1. 重写 `GetMessagesAround`
2. 优化 N+1 查询
3. 补充性能测试

### 阶段3: 代码重复消除 (0.5天)
1. 提取认证中间件
2. 合并重复的工具函数
3. 补充测试

## Open Questions

1. 是否需要为所有错误都定义 `AppError`，还是只处理需要特定 HTTP 状态码的错误？
2. `GetMessagesAround` 的 SQL 分页是否需要考虑 `created_at` 相同的情况？
3. 认证中间件是否需要支持可选认证（某些路由不需要认证）？
