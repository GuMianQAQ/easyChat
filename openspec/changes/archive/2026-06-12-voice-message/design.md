## Context

easyChat 是一个基于 Go + Gin + WebSocket + React + Vite + TypeScript + Electron 的实时聊天项目。当前支持 text、image、file 三种消息类型，消息通过 WebSocket 实时广播，文件通过 REST API 上传到 `/uploads/` 目录。AI 服务基于 OpenAI 兼容 API（支持 OpenAI / Ollama / MIMO），目前只有 Chat、Stream、Embed 三种能力，无音频处理能力。

## Goals / Non-Goals

**Goals:**
- 用户可以录制并发送语音消息（WebM/Opus 格式）
- 接收方可以播放语音消息，带进度条和时长显示
- 用户可以按需触发语音转文字（Whisper API）
- 转写结果通过 WebSocket 同步给所有在线用户
- 录音过程中提供实时音量波形反馈
- 支持滑动取消录音手势
- 适配亮色/暗色主题

**Non-Goals:**
- 不做自动转写（节省 API 调用，用户按需触发）
- 不做语音通话（WebRTC，复杂度完全不同）
- 不做语音消息的端到端加密
- 不做音频格式转码（浏览器录制什么就存什么）
- 不支持 Ollama/MIMO 的语音转文字（仅 OpenAI Whisper）

## Decisions

### 1. 音频格式：WebM/Opus

**选择**: WebM 容器 + Opus 编码

**理由**:
- 文件最小（1 分钟约 600KB），Opus 是语音场景最优编码
- Whisper API 原生支持
- 现代浏览器 MediaRecorder 默认支持
- 无需额外转码

**降级**: 通过 `MediaRecorder.isTypeSupported()` 检测，不支持时回退到 `audio/mp3`

**替代方案**:
- WAV：文件太大（1 分钟 10MB），不考虑
- M4A/AAC：Safari 支持好但 Chrome 支持不完整

### 2. 录音 API：MediaRecorder + Web Audio API

**选择**: MediaRecorder 录制音频，Web Audio API 的 AnalyserNode 获取音量数据用于波形可视化

**理由**:
- 浏览器原生 API，无外部依赖
- MediaRecorder 直接输出 Blob，可直接上传
- AnalyserNode 提供实时频率数据，用于 Canvas 波形绘制

**替代方案**:
- 纯 CSS 竖条：每帧更新 20-30 个 DOM 元素，60fps 下性能差
- RecordRTC 库：过度封装，MediaRecorder 已够用

### 3. 波形可视化：Canvas

**选择**: Canvas 2D 绘制音量柱状图

**理由**:
- GPU 加速，不触发 layout，60fps 流畅
- 可做渐变色、圆角柱
- 项目已有 Canvas 经验（截图编辑器用 fabric.js）

**实现**: 20-30 个竖条，高度由 AnalyserNode 的 byteFrequencyData 映射，颜色用 `var(--green)`

### 4. 滑动取消：Pointer Events

**选择**: 在麦克风按钮上监听 pointerdown，window 上监听 pointermove/pointerup，用 setPointerCapture 确保事件不丢失

**交互**:
- 按住麦克风开始录音
- 左滑超过 80px 进入取消区域（红点变叉，波形变淡）
- 取消区域松手 → 取消录音
- 正常区域松手 → 发送
- 录音 < 1 秒 → 自动取消，提示"录音时间太短"
- 录音 = 60 秒 → 自动发送

**替代方案**: 点击开始/点击结束（交互不够直觉，用户需要两次点击）

### 5. 消息存储：扩展 Message 表

**选择**: Message 表新增 `Duration`（int）和 `Transcript`（text）两个字段

**理由**:
- GORM AutoMigrate 自动加列，无迁移成本
- Duration 用于前端显示时长和动态调整气泡宽度
- Transcript 缓存转写结果，避免重复调用 Whisper API
- Content 字段存 `/uploads/voice/xxx.webm` URL，和 image/file 一致
- `MessagePayload` 和 `PersistMessageInput` 同步新增 `Duration` 字段，`MessagePayload` 新增 `Transcript` 字段

**替代方案**:
- 新建 VoiceMessage 表：过度设计，语音消息就是消息的一种
- Duration 存在文件 metadata 里：每次播放都要额外查询

### 6. 语音消息撤回：硬删除

**选择**: 语音消息撤回时从数据库删除记录并删除磁盘音频文件，而非像文本消息那样仅标记 `Revoked=true`

**理由**:
- 音频文件占用磁盘空间，撤回后不应保留
- 语音消息内容不可文本化，软删除没有意义
- 其他引用该语音消息的引用预览会显示"对方撤回了一条消息"

**实现**: `RevokeMessage` 方法中，voice 类型走 `db.Delete` + `os.Remove(音频文件路径)` 分支

### 7. 语音转文字：按需触发 + 结果缓存

**选择**: 用户点击"转写"按钮触发，结果存 Message.Transcript，后续直接读取

**流程**:
1. 用户点击 [转写]
2. 前端检查 message.transcript 是否已有值 → 有则直接显示
3. 调用 POST /api/ai/transcribe { url: "/uploads/voice/xxx.webm" }
4. 后端检查 Message.Transcript → 有则直接返回
5. 读取音频文件 → multipart 提交到 Whisper API → 存 DB → 返回
6. 通过 WS 广播 transcript-update，其他在线用户自动看到

**替代方案**:
- 发送时自动转写：浪费 API 调用，有些语音不需要转写
- 前端用 Web Speech API：精度低，不支持离线，不支持中文方言

### 8. Whisper API 兼容性

**选择**: 在 Provider 接口新增 `Transcribe` 方法，仅 OpenAI 兼容 provider 实现

**策略**:
- Provider 不支持时返回明确错误："当前 AI 服务商不支持语音转文字"
- 前端收到 501 时隐藏"转写"按钮
- ai.yaml 新增 `transcribe.enabled` 和 `transcribe.model` 配置

## Risks / Trade-offs

| 风险 | 影响 | 缓解 |
|------|------|------|
| 浏览器 MediaRecorder 兼容性 | 旧浏览器无法录音 | isTypeSupported 检测 + 降级提示 |
| 麦克风权限被拒绝 | 用户无法录音 | getUserMedia 失败时提示 + 隐藏录音按钮 |
| Whisper API 延迟（2-5 秒） | 转写体验不即时 | loading 状态 + 结果缓存避免重复调用 |
| Whisper API 成本 | 按需触发控制成本 | 不自动转写，用户主动选择 |
| WebM 在 Safari 上的支持 | iOS Safari 17+ 才支持 | 检测 + 提示用户升级浏览器 |
| 音频文件体积 | 60 秒约 600KB | 限制最长 60 秒，上传大小限制 10MB |
| 滑动取消在触屏上的体验 | 手指滑出按钮区域 | setPointerCapture 确保事件跟踪 |
| 语音消息撤回硬删除 | 引用该消息的引用预览失效 | 显示"对方撤回了一条消息" |
