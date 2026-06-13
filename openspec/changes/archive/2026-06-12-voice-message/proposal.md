## Why

当前 easyChat 只支持文本、图片、文件三种消息类型。语音消息是即时通讯的基础能力，能让用户在不方便打字时快速沟通。同时结合 Whisper 语音转文字，可以让语音消息的内容被检索和阅读，提升信息可达性。

## What Changes

- 新增 `voice` 消息类型，支持录制、发送、播放语音消息
- 新增 `/api/upload/voice` 端点，处理音频文件上传（含时长元数据）
- 新增 `/api/ai/transcribe` 端点，调用 Whisper API 将语音转为文字
- Message 数据模型新增 `Duration` 和 `Transcript` 字段
- WebSocket 协议新增 `transcript-update` 消息类型，同步转写结果给其他在线用户
- 前端新增录音面板（含实时音量波形、滑动取消）、语音播放器、转写交互
- AI Provider 接口新增 `Transcribe` 方法

## Capabilities

### New Capabilities

- `voice-message`: 语音消息的录制、发送、播放、转写完整能力，包括前端录音 UI、音频上传、消息类型扩展、Whisper 转写、播放器组件

### Modified Capabilities

- `messaging`: 消息类型从 text/image/file 扩展为包含 voice，会话预览摘要需支持语音消息的展示

## Impact

- **后端**: `webchat/message.go`、`chatstore/messages.go`、`chatstore/files.go`、`ai/provider.go`、`ai/openai.go`、`ai/service.go`、`webserver/file_routes.go`、`webserver/ai_routes.go`
- **前端**: `types/chat.ts`、`hooks/useChatSocket.ts`、`hooks/chatSocketHelpers.ts`、`components/chat/MessageComposer.tsx`、`components/chat/MessageBubble.tsx`、新增 `hooks/useVoiceRecorder.ts`、新增 `components/chat/VoiceRecorder.tsx`、新增 `components/chat/VoicePlayer.tsx`、`styles/chat/messages.css`
- **配置**: `ai.yaml` 新增 transcribe 配置项
- **依赖**: 无新增外部依赖，使用浏览器原生 MediaRecorder API + 现有 OpenAI Whisper API
