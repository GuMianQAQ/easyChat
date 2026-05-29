## Tasks

### Phase 1: 清理代码生成（可选）

- [x] 1.1 删除后端代码生成端点
  - 删除 `internal/webserver/ai_routes.go` 中的 `ai.POST("/generate-code", ...)` 和 `handleAIGenerateCode` 函数
  - 删除 `internal/ai/service.go` 中的 `codeSystemPrompt` 常量和 `GenerateCode` 方法
  - 删除 `internal/ai/stats.go` 中的 `codeCalls` 字段、`RecordCode` 方法、`StatsSnapshot.Code` 字段
  - 删除 `internal/ai/service_test.go` 中的 `TestGenerateCode` 测试

### Phase 2: 后端 - 流式回复

- [x] 2.1 新增 WebSocket 消息类型
  - 在 `internal/webchat/message.go` 中新增 `MessageTypeAIStreamChunk = "ai-stream-chunk"` 和 `MessageTypeAIStreamDone = "ai-stream-done"`
  - 定义 `AIStreamChunk` 和 `AIStreamDone` 结构体

- [x] 2.2 修改 handleAICommand 为流式
  - 在 `internal/webchat/client.go` 中修改 `handleAICommand` 方法
  - 调用 `provider.Stream()` 而非 `provider.Chat()`
  - 通过 WebSocket 发送 `ai-stream-chunk` 消息
  - 流结束后保存完整消息，发送 `ai-stream-done` 消息
  - 广播最终消息（通过现有 chat 消息机制）

- [x] 2.3 测试流式回复
  - 验证 AI 助手私聊中流式回复正常工作
  - 验证群聊中 `/ai` 命令流式回复正常工作
  - 验证流式过程中切换会话后状态保留

### Phase 3: 前端 - 流式回复

- [x] 3.1 修改 useChatSocket 处理流式消息
  - 在 `frontend/src/hooks/useChatSocket.ts` 中新增 `streamingState` 状态
  - 处理 `ai-stream-chunk` 消息：追加内容到 streamingState
  - 处理 `ai-stream-done` 消息：清理 streamingState
  - 切换会话时保留 streamingState

- [x] 3.2 修改 MessageList 渲染流式气泡
  - 在 `frontend/src/components/chat/MessageList.tsx` 中检查 streamingState
  - 当前会话有流式内容时，渲染 `AIStreamBubble` 组件
  - 流式气泡显示在消息列表末尾

- [x] 3.3 测试前端流式回复
  - 验证流式气泡正确显示
  - 验证光标动画正常
  - 验证流式完成后替换为最终消息
  - 验证切换会话后流式状态保留

### Phase 4: 后端 - 智能回复

- [x] 4.1 智能回复 API 已存在
  - `/api/ai/generate-replies` 已实现，无需修改

### Phase 5: 前端 - 智能回复

- [x] 5.1 新增智能回复设置开关
  - 在用户设置中新增 `aiReplySuggestions` 布尔字段
  - 默认值为 `false`
  - 在设置页面添加开关 UI

- [x] 5.2 修改 MessageComposer 添加建议条
  - 在 `frontend/src/components/chat/MessageComposer.tsx` 中新增建议条
  - 仅在 AI 助手会话且开关开启时显示
  - 输入框内容变化时 debounce 500ms 调用 `/api/ai/generate-replies`
  - 建议以浅色字体显示在输入框下方
  - Tab 键补全，Esc 关闭建议

- [x] 5.3 测试智能回复
  - 验证建议正确显示
  - 验证 Tab 补全功能
  - 验证开关控制
  - 验证 debounce 行为

### Phase 6: 后端 - 消息摘要

- [x] 6.1 消息摘要 API 已存在
  - `/api/ai/summarize` 已实现，无需修改

### Phase 7: 前端 - 消息摘要

- [x] 7.1 修改 ConversationDetailPanel 添加摘要按钮
- [x] 7.2 新增摘要浮层组件
- [x] 7.3 测试消息摘要
  - 验证按钮仅在群聊中显示
  - 验证摘要正确生成
  - 验证浮层正确显示和关闭

### Phase 8: 后端 - 语义搜索

- [x] 8.1 修改 search API 支持全局搜索
  - 在 `internal/webserver/ai_routes.go` 中修改 `handleAISearch`
  - `conversationId` 参数改为可选
  - 为空时调用 `SearchHybrid` 搜索所有会话

- [x] 8.2 修改 SearchHybrid 返回结构
  - 在 `internal/ai/service.go` 中修改 `SearchHybrid` 方法
  - 返回 `[]SearchResultItem` 而非 `[]string`
  - 包含 `messageId`、`conversationId`、`conversationName`、`senderName`、`content`、`createdAt`、`score`

- [x] 8.3 新增 GenerateEmbeddingAsync 方法
- [x] 8.4 在消息保存后触发 embedding 生成
- [x] 8.5 测试语义搜索后端
  - 验证全局搜索返回正确结果
  - 验证 embedding 异步生成正常
  - 验证搜索结果包含完整信息

### Phase 9: 前端 - 语义搜索

- [x] 9.1 新增 SearchPanel 组件
  - 创建 `frontend/src/components/chat/SearchPanel.tsx`
  - 实现分类结果展示：联系人 → 群聊 → 聊天记录
  - 实现本地过滤（联系人、群聊）
  - 实现 AI 语义搜索（debounce 500ms）
  - 实现点击结果导航

- [x] 9.2 修改 ConversationList 触发搜索
  - 在 `frontend/src/components/chat/ConversationList.tsx` 中
  - 搜索栏 `onFocus` 时调用 `onOpenSearch` 回调

- [x] 9.3 修改 AppShell 管理搜索状态
  - 在 `frontend/src/components/app/AppShell.tsx` 中新增 `searchActive` 状态
  - 当 `activeDock === "chat" && searchActive` 时渲染 SearchPanel
  - 实现 `onSelectConversation` 回调：切换会话 + 关闭搜索

- [x] 9.4 新增 AI 搜索设置开关
  - 在用户设置中新增 `aiSearchEnabled` 布尔字段
  - 默认值为 `false`
  - 在设置页面添加开关 UI

- [x] 9.5 删除旧的 AISearchPanel
  - 删除 `frontend/src/components/chat/AISearchPanel.tsx`
  - 删除 `frontend/src/styles/chat/ai.css` 中的 `.ai-search-*` 样式

- [x] 9.6 测试语义搜索前端
  - 验证搜索面板正确打开和关闭
  - 验证联系人/群聊本地过滤
  - 验证 AI 聊天记录搜索
  - 验证点击结果导航
  - 验证开关控制

### Phase 10: OpenSpec 更新

- [x] 10.1 更新 ai-features spec
  - 删除代码生成相关 requirements
  - 保留翻译、摘要、智能回复

- [x] 10.2 更新 ai-search spec
  - 添加全局搜索 support
  - 更新返回结构说明

- [x] 10.3 更新 ai-search-ui spec
  - 更新为统一搜索面板设计
  - 添加分类结果说明

- [x] 10.4 更新 ai-stats spec
  - 删除代码生成统计（如果删除了代码生成）

## Verification

### 后端验证
```bash
# 运行测试
go test ./internal/ai/... -v
go test ./internal/webchat/... -v

# 启动服务器
go run main.go

# 测试流式回复
# 1. 登录，打开 AI 助手会话
# 2. 发送消息，验证流式回复

# 测试智能回复
# 1. 开启智能回复开关
# 2. 在 AI 助手会话中，验证建议显示

# 测试消息摘要
# 1. 在群聊中，点击"生成未读摘要"
# 2. 验证浮层显示

# 测试语义搜索
# 1. 开启 AI 搜索开关
# 2. 在搜索栏输入关键词
# 3. 验证搜索结果
```

### 前端验证
```bash
# 启动前端
cd frontend && npm run dev

# 测试所有功能
# 1. 流式回复：AI 助手会话中发送消息
# 2. 智能回复：开启开关，输入框下方显示建议
# 3. 消息摘要：群聊中点击摘要按钮
# 4. 语义搜索：搜索栏输入关键词，验证分类结果
```
