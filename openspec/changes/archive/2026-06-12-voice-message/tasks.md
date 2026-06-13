## 1. 后端 - 消息模型与类型扩展

- [x] 1.1 `webchat/message.go`：新增 `ChatMessageVoice = "voice"` 常量，`ValidateInput` 新增 voice 分支调用 `validateVoiceURL`
- [x] 1.2 `chatstore/service.go`：`MessagePayload` 新增 `Duration int` 和 `Transcript string` 字段（JSON: `duration`, `transcript`）
- [x] 1.3 `chatstore/service.go`：`PersistMessageInput` 新增 `Duration int` 字段
- [x] 1.4 `chatstore/messages.go`：Message 模型新增 `Duration int` 和 `Transcript string` 字段；`summarizeMessageRecord` 新增 voice 分支返回 `[语音] 0:15`
- [x] 1.5 `chatstore/messages.go`：`toPayload` 函数填充 `Duration` 和 `Transcript` 字段
- [x] 1.6 `chatstore/messages.go`：`RevokeMessage` 对 voice 类型消息执行硬删除（`db.Delete` + 删除磁盘音频文件），而非仅标记 `Revoked=true`
- [x] 1.7 `chatstore/files.go`：`extKindMap` 新增 `.webm`/`.ogg`/`.mp3`/`.wav`/`.m4a` → `"audio"`
- [x] 1.8 运行 `go test ./internal/webchat/... ./internal/chatstore/...` 确认无回归

## 2. 后端 - 语音上传端点

- [x] 2.1 `webserver/file_routes.go`：新增 `POST /api/upload/voice` handler，接收 multipart "file" + "duration" 字段（duration 为字符串，需 strconv.Atoi 转为 int），校验 Content-Type 为 audio/*，大小 <= 10MB，存储到 `/uploads/voice/`，返回 `{ url, duration }`
- [x] 2.2 `webserver/router.go`：注册新路由到受保护路由组
- [x] 2.3 用 curl 测试上传端点：正常上传、非音频文件拒绝、超大文件拒绝

## 3. 后端 - AI Provider 转写能力

- [x] 3.1 `ai/provider.go`：Provider 接口新增 `Transcribe(ctx, audioPath, language string) (string, error)`
- [x] 3.2 `ai/openai.go`：OpenAIProvider 实现 Transcribe，构造 multipart 请求调用 `POST {base_url}/audio/transcriptions`，解析响应 `{ "text": "..." }`
- [x] 3.3 `ai/config.go`：Config 新增 `Transcribe.Enabled bool` 和 `Transcribe.Model string` 字段
- [x] 3.4 `ai/service.go`：Service 新增 `Transcribe(audioPath string) (string, error)` 方法，检查 enabled 后调用 provider

## 4. 后端 - 转写 API 端点与 WS 广播

- [x] 4.1 `webserver/ai_routes.go`：新增 `POST /api/ai/transcribe` handler，接收 `{ "messageId", "url" }`，通过 `service.uploadsDir + strings.TrimPrefix(url, "/uploads/")` 定位磁盘文件，调用 `service.Transcribe`，更新 `Message.Transcript`，返回 `{ "transcript" }`
- [x] 4.2 `webserver/router.go`：注册转写路由
- [x] 4.3 `webchat/message.go`：新增 `MessageTypeTranscriptUpdate = "transcript-update"` 常量和 `TranscriptUpdate` 结构体（含 `MessageID`, `ConversationID`, `Transcript`）
- [x] 4.4 `webchat/hub.go`：新增 `BroadcastTranscriptUpdate(messageID, conversationID, transcript string, memberUserIDs []string)` 方法，构造 transcript-update 消息并通过 `publishUsers` 广播
- [x] 4.5 转写 handler 中查询会话成员列表（`s.Store.GetConversationMemberIDs(conversationID)`），调用 `hub.BroadcastTranscriptUpdate`
- [x] 4.6 运行 `go test ./internal/...` 确认所有后端测试通过

## 5. 前端 - 类型定义与工具函数

- [x] 5.1 `types/chat.ts`：`ChatMessageType` 联合类型新增 `"voice"`；`ChatMessage` 新增 `duration?: number` 和 `transcript?: string`；`ServerMessage` 新增 `duration` 和 `transcript` 字段
- [x] 5.2 `hooks/chatSocketHelpers.ts`：`mapIncomingMessage` 的 messageType 映射新增 `"voice"` 分支
- [x] 5.3 `utils/chatApi.ts`：新增 `uploadVoice(blob: Blob, duration: number)` 和 `transcribeVoice(messageId: string, url: string)` API 函数

## 6. 前端 - useVoiceRecorder Hook

- [x] 6.1 新建 `hooks/useVoiceRecorder.ts`：封装 MediaRecorder + AudioContext + AnalyserNode，暴露 `start()`/`stop()`/`cancel()`/`state`/`duration`/`analyserNode`/`isSupported`
- [x] 6.2 实现状态机：idle → recording → processing → idle；`isSupported` 通过 `MediaRecorder.isTypeSupported('audio/webm;codecs=opus')` 检测
- [x] 6.3 实现麦克风权限拒绝处理：`navigator.mediaDevices.getUserMedia` 失败时设置错误状态
- [x] 6.4 实现最长 60 秒自动停止

## 7. 前端 - VoiceRecorder 组件

- [x] 7.1 新建 `components/chat/VoiceRecorder.tsx`：录音面板 UI，包含 Canvas 波形、计时器、取消/发送按钮
- [x] 7.2 实现 Canvas 波形绘制：从 AnalyserNode 读取 byteFrequencyData，绘制 20-30 个绿色竖条
- [x] 7.3 实现滑动取消：pointerdown 触发 `start()`，pointermove 检测左滑 80px 进入取消态（红点变叉，波形变淡，显示"松开取消"），pointerup 在取消态调用 `cancel()`，在正常态调用 `stop()`
- [x] 7.4 实现计时器显示：mm:ss 格式，font-variant-numeric: tabular-nums

## 8. 前端 - VoicePlayer 组件

- [x] 8.1 新建 `components/chat/VoicePlayer.tsx`：语音播放器，包含播放/暂停按钮、进度条、时长标签
- [x] 8.2 实现播放控制：play/pause 切换，进度条实时更新，点击进度条跳转
- [x] 8.3 实现气泡宽度动态调整：`width = max(180, min(280, 180 + duration * 2))`px
- [x] 8.4 实现 [转写] 按钮：点击调用 `transcribeVoice` API，显示 loading → 文字；如果 `message.transcript` 已有值则直接显示文字，不显示按钮
- [x] 8.5 转写按钮可见性：通过后端 AI status 接口或首次转写 501 错误判断，不支持时隐藏按钮

## 9. 前端 - MessageComposer 集成

- [x] 9.1 `MessageComposer.tsx`：工具栏新增 Mic 按钮（lucide `Mic` 图标），`onPointerDown` 时检查 `useVoiceRecorder.isSupported`，支持则进入录音态并调用 `start()`
- [x] 9.2 录音态替换 composer-input-wrap 为 VoiceRecorder 组件，其他工具栏按钮 disabled
- [x] 9.3 新增 `onSendVoice` prop：`(blob: Blob, duration: number, quote?) => Promise<boolean>`
- [x] 9.4 录音态下隐藏字符计数和原发送按钮

## 10. 前端 - MessageBubble 集成

- [x] 10.1 `MessageBubble.tsx`：`renderContent()` 新增 `voice` 分支，渲染 VoicePlayer 组件
- [x] 10.2 `summarizeQuote` 新增 voice 分支返回 `[语音] 0:15`
- [x] 10.3 气泡样式适配：voice 消息的 padding 和 max-width 根据播放器调整

## 11. 前端 - WebSocket 消息处理

- [x] 11.1 `useChatSocket.ts`：新增 `sendVoiceMessage` 函数，先上传音频获取 URL，再调用 `sendOptimistic("voice", { content: url, duration })`
- [x] 11.2 `useChatSocket.ts`：onmessage handler 新增 `transcript-update` 分支，解析 `{ messageId, conversationId, transcript }`，更新对应 message 的 `transcript` 字段
- [x] 11.3 从 MessageComposer 的 onSendVoice 连接到 sendVoiceMessage

## 12. 前端 - CSS 样式

- [x] 12.1 `styles/chat/messages.css`：新增 `.message-voice`、`.voice-player`、`.voice-progress`、`.voice-transcript`、`.voice-transcribe-btn` 样式
- [x] 12.2 新增 `.composer-voice-recording` 录音面板样式
- [x] 12.3 确保所有颜色使用 CSS 变量，暗色模式自动适配
- [x] 12.4 检查所有中文字符串无乱码

## 13. 端到端验证

- [x] 13.1 启动后端 + 前端，录制语音并发送，验证气泡显示和播放
- [x] 13.2 在另一个窗口接收语音消息，验证播放和转写
- [x] 13.3 验证滑动取消手势
- [x] 13.4 验证语音消息撤回（硬删除，对方看到消息消失）
- [x] 13.5 验证浏览器不支持录音时麦克风按钮隐藏
- [x] 13.6 验证暗色模式下样式正常
- [x] 13.7 运行 `go test ./...` 和 `npm run test` 确认无回归
