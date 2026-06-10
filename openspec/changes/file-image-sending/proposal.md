## Why

当前 easyChat 的聊天功能仅支持文本消息和图片消息（通过粘贴/拖拽），但工具栏中的图片和文件按钮处于禁用状态，用户无法主动选择文件发送。这限制了用户的文件分享需求，需要启用这些功能以提供完整的聊天体验。

## What Changes

- 启用 MessageComposer 中的图片按钮，点击后打开文件选择器选择图片
- 启用 MessageComposer 中的文件按钮，点击后打开文件选择器选择任意文件
- 添加文件消息的 WebSocket 发送和接收支持
- 添加文件消息的前端渲染组件
- 支持文件消息的引用（quote）功能

## Capabilities

### New Capabilities

- `file-sending`: 支持在聊天中发送文件消息，包括文件选择、上传、消息发送和渲染

### Modified Capabilities

- `messaging`: 扩展消息类型支持，添加 file 类型消息的处理

## Impact

- **前端组件**: MessageComposer.tsx, MessageBubble.tsx, ChatView.tsx
- **前端 hooks**: useChatSocket.ts, chatSocketHelpers.ts
- **前端 actions**: createConversationActions.ts, App.tsx
- **前端工具**: chatApi.ts
- **后端**: webchat/message.go（添加 file 类型验证）
- **API**: 无新增 API，使用现有的 /api/upload/file 接口
