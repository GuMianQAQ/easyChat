## Architecture

### 流式回复协议

新增 WebSocket 消息类型，独立于现有 Message 结构：

```
// 流式 chunk
{
  "type": "ai-stream-chunk",
  "streamId": "stream-1716987654321",
  "conversationId": "private:user1:ai-assistant",
  "content": "你好"  // 增量内容
}

// 流式结束
{
  "type": "ai-stream-done",
  "streamId": "stream-1716987654321",
  "conversationId": "private:user1:ai-assistant",
  "messageId": "msg-1716987654321-1"  // 最终消息 ID
}
```

### 前端状态管理

```
// useChatSocket.ts 新增状态
streamingState: Map<string, {
  streamId: string;
  conversationId: string;
  content: string;
  loading: boolean;
}>

// 处理逻辑
switch (data.type) {
  case "ai-stream-chunk":
    // 追加内容到对应 streamId 的 streamingState
    break;
  case "ai-stream-done":
    // 清理 streamingState，最终消息通过正常 chat 消息到达
    break;
}
```

### SearchPanel 组件结构

```
SearchPanel
├── Props
│   ├── conversations: Conversation[]  // 本地搜索用
│   ├── contacts: ContactItem[]        // 本地搜索用
│   ├── aiSearchEnabled: boolean       // AI 搜索开关
│   ├── token: string                  // API 认证
│   ├── onSelectConversation: (id, messageId?) => void
│   └── onClose: () => void
│
├── State
│   ├── keyword: string
│   ├── aiResults: SearchResultItem[]  // 异步
│   └── aiLoading: boolean
│
└── 渲染逻辑
    ├── keyword 为空 → 提示文字
    └── keyword 不为空
        ├── 联系人匹配 (本地过滤)
        ├── 群聊匹配 (本地过滤)
        └── 聊天记录 (AI 语义搜索, debounce 500ms)
```

### embedding 生成流程

```
消息保存成功
    │
    ▼
go aiService.GenerateEmbeddingAsync(msg)
    │
    ▼
provider.Embed(ctx, msg.Content)
    │
    ▼
service.SaveEmbedding(conversationID, messageID, content, embedding)
    │
    ▼
存入 ai_embeddings 表
```

## Data Models

### SearchResultItem（后端返回）

```go
type SearchResultItem struct {
    MessageID        string  `json:"messageId"`
    ConversationID   string  `json:"conversationId"`
    ConversationName string  `json:"conversationName"`
    SenderName       string  `json:"senderName"`
    Content          string  `json:"content"`
    CreatedAt        string  `json:"createdAt"`
    Score            float64 `json:"score"`
}
```

### 前端类型

```typescript
interface SearchResultItem {
  messageId: string;
  conversationId: string;
  conversationName: string;
  senderName: string;
  content: string;
  createdAt: string;
  score: number;
}

interface StreamingState {
  streamId: string;
  conversationId: string;
  content: string;
  loading: boolean;
}
```

## API Changes

### GET /api/ai/search

**请求参数：**
- `q` (必填): 搜索关键词
- `conversationId` (可选): 会话 ID，为空时搜索所有会话

**响应：**
```json
{
  "results": [
    {
      "messageId": "msg-xxx",
      "conversationId": "private:user1:user2",
      "conversationName": "张三",
      "senderName": "张三",
      "content": "项目进度已经到 80% 了",
      "createdAt": "2026-05-29 14:30:00",
      "score": 0.85
    }
  ]
}
```

### WebSocket 新增消息类型

**ai-stream-chunk：**
```json
{
  "type": "ai-stream-chunk",
  "streamId": "stream-xxx",
  "conversationId": "private:user1:ai-assistant",
  "content": "增量内容"
}
```

**ai-stream-done：**
```json
{
  "type": "ai-stream-done",
  "streamId": "stream-xxx",
  "conversationId": "private:user1:ai-assistant",
  "messageId": "msg-xxx"
}
```

## UI Design

### 搜索面板样式

```css
.search-panel {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-bg-primary);
  z-index: 10;
}

.search-panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid var(--color-border);
}

.search-panel-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-secondary);
  font-size: 14px;
}

.search-section {
  padding: 8px 0;
}

.search-section-title {
  padding: 4px 12px;
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.search-result-item:hover {
  background: var(--color-bg-secondary);
}

.search-result-content {
  flex: 1;
  min-width: 0;
}

.search-result-name {
  font-weight: 500;
  font-size: 14px;
}

.search-result-preview {
  font-size: 13px;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-result-meta {
  font-size: 12px;
  color: var(--color-text-tertiary);
}
```

### 智能回复建议样式

```css
.ai-suggestions {
  padding: 4px 8px;
  border-top: 1px solid var(--color-border);
}

.ai-suggestion-text {
  font-size: 13px;
  color: var(--color-text-tertiary);
  opacity: 0.7;
}

.ai-suggestion-hint {
  font-size: 11px;
  color: var(--color-text-tertiary);
  opacity: 0.5;
}
```

### 消息摘要浮层样式

```css
.summary-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.summary-modal {
  background: var(--color-bg-primary);
  border-radius: 12px;
  padding: 24px;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.summary-content {
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}
```
