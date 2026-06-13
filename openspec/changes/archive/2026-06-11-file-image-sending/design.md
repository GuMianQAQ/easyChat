## Context

当前 easyChat 已经实现了：
- 后端图片上传接口 `/api/upload`
- 后端文件上传接口 `/api/upload/file`
- WebSocket 消息协议支持 text 和 image 类型
- 前端类型定义中已有 `file` 类型（`ChatMessageType = "text" | "image" | "file"`）
- MessageComposer 组件中有图片和文件按钮，但处于禁用状态

主要限制：
- 图片只能通过粘贴或拖拽发送
- 不支持主动选择文件发送
- 文件消息没有渲染逻辑

## Goals / Non-Goals

**Goals:**
- 启用图片按钮，支持点击选择图片文件发送
- 启用文件按钮，支持点击选择任意文件发送
- 实现文件消息的完整渲染（文件名、大小、下载链接）
- 支持文件消息的引用功能

**Non-Goals:**
- 不修改现有的图片上传和存储逻辑
- 不添加新的后端 API 接口
- 不实现文件预览功能（如 PDF 预览）
- 不实现文件夹上传或批量上传

## Decisions

### 0. 文件发送调用链路

文件发送需要经过以下完整链路：

```
MessageComposer (用户点击文件按钮)
    │
    ▼
ChatView (接收 onSendFile prop)
    │
    ▼
App.tsx (从 createConversationActions 解构 handleSendFile)
    │
    ▼
createConversationActions.ts (实现 handleSendFile，调用 uploadFile + sendFileMessage)
    │
    ▼
useChatSocket.ts (暴露 sendFileMessage，通过 WebSocket 发送)
    │
    ▼
webchat/message.go (后端验证 file 类型，存储消息)
```

**关键点**:
- `useChatSocket.ts` 需要在 `UseChatSocketResult` 接口中暴露 `sendFileMessage`
- `createConversationActions.ts` 负责组合上传和发送逻辑
- `App.tsx` 负责将 `handleSendFile` 传递到 `ChatView`
- `chatSocketHelpers.ts` 的 `normalizeQuote` 需要支持 file 类型，避免引用文件消息时类型丢失

### 1. 文件消息类型扩展

**决策**: 在 WebSocket 消息协议中添加 `file` 类型支持

**理由**: 
- 前端类型定义中已有 `file` 类型，只需后端跟进
- 复用现有的消息存储和传输逻辑
- 保持与 image 类型的一致性

**替代方案**: 
- 创建独立的文件消息 API → 过度设计，增加复杂度

### 2. 文件消息内容格式

**决策**: 文件消息 content 存储文件 URL，前端根据 URL 提取文件名和类型

**理由**:
- 与 image 消息格式一致
- 简化存储逻辑
- 前端可以灵活展示

**替代方案**:
- 存储 JSON 对象（包含 url、name、size）→ 需要修改消息存储结构

### 3. 前端文件选择方式

**决策**: 使用 HTML `<input type="file">` 元素，通过 ref 触发点击

**理由**:
- 原生支持，兼容性好
- 可以限制文件类型（accept 属性）
- 无需引入第三方依赖

**替代方案**:
- 使用第三方文件选择库 → 增加依赖

### 4. 文件消息渲染设计

**决策**: 在 MessageBubble 中添加文件消息渲染，显示文件图标、文件名、文件大小和下载按钮

**理由**:
- 与现有 UI 风格一致
- 提供清晰的文件信息
- 支持直接下载

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 大文件上传超时 | 中 | 复用现有的文件大小限制（10MB） |
| 文件类型安全 | 低 | 后端已有的文件类型检查 |
| 消息存储膨胀 | 低 | 文件 URL 与图片 URL 大小相当 |

## Migration Plan

1. 后端添加 file 类型验证
2. 前端启用按钮并添加文件选择逻辑
3. 前端添加文件消息渲染
4. 测试验证功能完整性

## Open Questions

- 是否需要支持文件消息的撤回？（当前已支持，无需额外处理）
- 是否需要显示文件类型图标？（建议使用通用文件图标）
