## Why

easyChat 后端已实现 8 个 AI 功能端点，但前端只接入了 3 个（AI 助手对话、群机器人开关、消息翻译）。其余功能（流式回复、智能回复、消息摘要、语义搜索）的后端 API 完整可用，前端组件部分已写好但未接入，部分完全缺失。

用户无法使用已开发完成的 AI 能力，造成后端资源浪费和产品体验不完整。

## What Changes

### 1. 流式回复
- 后端 WebSocket 新增 `ai-stream-chunk` 和 `ai-stream-done` 消息类型
- 前端 AI 助手会话中，发送消息后自动显示流式气泡（带光标动画）
- 流式完成后替换为最终消息
- 切换会话时不锁定，流式状态保留

### 2. 智能回复
- 用户设置中新增"智能回复建议"开关（默认关闭）
- AI 助手会话中，输入框下方自动显示回复建议（浅色字体）
- 基于最近 3 条消息 + 当前输入框内容生成建议
- Tab 键补全，Esc 关闭建议
- debounce 500ms 调用 `/api/ai/generate-replies`

### 3. 消息摘要
- 群聊详情面板新增"生成未读摘要"按钮
- 点击后调用 `/api/ai/summarize`
- 结果以浮层弹窗展示，关闭后消失
- 仅群聊显示

### 4. 语义搜索（统一搜索）
- ConversationList 搜索栏 onFocus 打开 SearchPanel
- SearchPanel 替换 Sidebar 中的 ConversationList
- 分三类结果：联系人（本地过滤）→ 群聊（本地过滤）→ 聊天记录（AI 语义搜索）
- 聊天记录搜索调用 `/api/ai/search`（无 conversationId，全局搜索）
- 结果显示会话名称、发送者、时间
- 点击联系人 → 切换到私聊
- 点击群聊 → 切换到群聊
- 点击聊天记录 → 切换到该会话 + 跳转到该消息
- 用户设置中新增"AI 语义搜索"开关（默认关闭）
- embedding 异步生成：消息保存后 goroutine 调用 embedding API

### 5. 清理无用代码
- 删除代码生成相关：`/api/ai/generate-code` 路由、`GenerateCode` 方法、`codeSystemPrompt`、`RecordCode`、测试
- 保留语义搜索相关代码（不删除）

### 6. 后端 API 改动
- `/api/ai/search`：`conversationId` 参数改为可选，为空时搜索所有会话
- `/api/ai/search` 返回结构增强：包含 `messageId`、`conversationId`、`conversationName`、`senderName`、`content`、`createdAt`、`score`
- WebSocket 协议新增 `ai-stream-chunk` 和 `ai-stream-done` 消息类型

## Capabilities

### Modified Capabilities
- `ai-chat`：流式回复通过 WebSocket 实现
- `ai-features`：智能回复、消息摘要的前端接入
- `ai-search`：搜索 API 支持全局搜索、返回结构增强
- `ai-search-ui`：统一搜索面板（SearchPanel）
- `messaging`：消息保存后异步生成 embedding

### Removed Capabilities
- 代码生成（`/api/ai/generate-code`）：前端不接入，后端保留（可选）

## Impact

- **后端**：
  - `webchat/message.go`：新增消息类型常量
  - `webchat/client.go`：修改 `handleAICommand` 为流式发送
  - `ai/service.go`：新增 `GenerateEmbeddingAsync` 方法、修改 `SearchHybrid` 支持全局搜索
  - `webserver/ai_routes.go`：修改 `handleAISearch` 返回结构、删除 `handleAIGenerateCode`（可选）
  - `ai/stats.go`：删除 `RecordCode`（可选）
  - `ai/config.go`：保留 `EnableSearch` 配置

- **前端**：
  - 新增 `SearchPanel.tsx`：统一搜索面板组件
  - 修改 `ConversationList.tsx`：搜索栏 onFocus 触发搜索
  - 修改 `AppShell.tsx`：管理 searchActive 状态
  - 修改 `MessageComposer.tsx`：智能回复建议条
  - 修改 `useChatSocket.ts`：处理流式消息
  - 新增 `useAIStream.ts` 改造：支持 WebSocket 流式（或复用现有 SSE）
  - 删除 `AISearchPanel.tsx`（被 SearchPanel 替代）
  - 修改 `ai.css`：新增搜索面板样式

- **OpenSpec specs**：
  - 更新 `ai-features/spec.md`：删除代码生成 requirements
  - 更新 `ai-search/spec.md`：支持全局搜索
  - 更新 `ai-search-ui/spec.md`：统一搜索面板设计

## Design Reference

### 配色方案（Chat & Messaging App）
- Primary: #2563EB（Messenger blue）
- Accent: #059669（Online green）
- Background: #FFFFFF
- Muted: #F1F5FD
- Border: #E4ECFC

### 搜索面板交互
- 点击搜索栏 → Sidebar 替换为 SearchPanel
- 输入关键词 → 即时显示联系人/群聊结果
- debounce 500ms → 显示 AI 聊天记录结果
- 点击结果 → 导航到对应会话/消息
- 按 Escape 或点击返回 → 关闭搜索

### 流式回复交互
- 发送消息 → 立即显示"AI 正在输入..."气泡
- 收到 chunk → 追加内容到气泡（带光标动画）
- 收到 done → 替换为最终消息
- 切换会话 → 流式状态保留，回来后继续显示
