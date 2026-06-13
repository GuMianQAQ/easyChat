## Purpose

Describe the voice message feature for easyChat, including recording, playback, upload, transcription, and revoke behavior.

## Requirements

### Requirement: 语音消息录制
系统 SHALL 支持用户通过浏览器 MediaRecorder API 录制语音消息。录音格式为 WebM/Opus，不支持时降级为 MP3。最长录音时长为 60 秒，最短有效录音时长为 1 秒。

#### Scenario: 正常录制并发送
- **WHEN** 用户按住麦克风按钮并说话
- **THEN** 系统开始录制，显示实时音量波形和计时器

#### Scenario: 松手发送语音
- **WHEN** 用户在正常区域松手且录音时长 >= 1 秒
- **THEN** 系统上传音频文件并通过 WebSocket 发送 voice 类型消息

#### Scenario: 录音时间太短
- **WHEN** 用户松手时录音时长 < 1 秒
- **THEN** 系统取消录音并提示"录音时间太短"

#### Scenario: 录音超时自动发送
- **WHEN** 录音时长达到 60 秒
- **THEN** 系统自动停止录制并发送语音消息

### Requirement: 滑动取消录音
系统 SHALL 支持在录音过程中通过左滑手势取消录音。

#### Scenario: 左滑进入取消区域
- **WHEN** 用户按住麦克风后左滑超过 80px
- **THEN** 界面显示取消状态（红点变叉，波形变淡，显示"松开取消"）

#### Scenario: 在取消区域松手
- **WHEN** 用户在取消区域松手
- **THEN** 系统取消录音，丢弃音频数据，恢复输入框

#### Scenario: 滑回正常区域
- **WHEN** 用户从取消区域滑回正常区域
- **THEN** 界面恢复录音状态，继续录制

### Requirement: 语音消息上传
系统 SHALL 提供独立的语音上传端点，接收音频文件和时长元数据。

#### Scenario: 上传语音文件
- **WHEN** 前端调用 POST /api/upload/voice
- **THEN** 系统校验文件格式（audio/*）和大小（<= 10MB），存储到 /uploads/voice/ 目录，返回 { url, duration }

#### Scenario: 文件格式不支持
- **WHEN** 上传的文件不是音频格式
- **THEN** 系统返回 400 错误

#### Scenario: 上传文件过大
- **WHEN** 音频文件超过 10MB
- **THEN** 系统返回 400 错误

### Requirement: 语音消息类型
系统 SHALL 将语音消息作为一种独立的消息类型（voice），与 text、image、file 并列。

#### Scenario: 发送语音消息
- **WHEN** 用户发送语音消息
- **THEN** 系统创建 MessageType 为 "voice" 的消息记录，Content 为音频 URL，Duration 为录音秒数

#### Scenario: 语音消息气泡渲染
- **WHEN** 消息列表中存在 voice 类型消息
- **THEN** 前端显示播放器组件（播放按钮 + 进度条 + 时长），气泡宽度根据时长动态调整

#### Scenario: 语音消息引用摘要
- **WHEN** 语音消息被引用
- **THEN** 引用预览显示 "[语音] 0:15"

### Requirement: 语音消息播放
系统 SHALL 支持在消息气泡中直接播放语音消息。

#### Scenario: 点击播放
- **WHEN** 用户点击语音消息的播放按钮
- **THEN** 系统播放音频，进度条实时更新，按钮变为暂停图标

#### Scenario: 点击进度条跳转
- **WHEN** 用户点击进度条的某个位置
- **THEN** 音频跳转到对应时间点继续播放

#### Scenario: 播放完成
- **WHEN** 音频播放到末尾
- **THEN** 进度条归零，按钮恢复为播放图标

### Requirement: 语音转文字
系统 SHALL 支持用户按需将语音消息转写为文字，转写结果缓存在服务端并同步给所有在线用户。

#### Scenario: 点击转写按钮
- **WHEN** 用户点击语音消息气泡上的 [转写] 按钮
- **THEN** 系统调用 Whisper API 转写，显示 loading 状态

#### Scenario: 转写完成显示文字
- **WHEN** 转写成功
- **THEN** 播放器下方显示转写文字，[转写] 按钮消失

#### Scenario: 转写结果缓存
- **WHEN** 同一语音消息被第二次请求转写
- **THEN** 系统直接返回 Message.Transcript 中的缓存结果，不重复调用 Whisper API

#### Scenario: 转写结果同步
- **WHEN** 某个用户触发转写完成
- **THEN** 系统通过 WebSocket 发送 transcript-update 消息，其他在线用户的气泡自动更新显示转写文字

#### Scenario: AI 服务商不支持转写
- **WHEN** 当前配置的 AI 服务商不支持 Transcribe 方法
- **THEN** 后端返回 501，前端隐藏 [转写] 按钮

### Requirement: 语音消息撤回
语音消息撤回 SHALL 执行硬删除（从数据库移除记录并删除音频文件），而非像文本消息那样仅标记 Revoked。

#### Scenario: 撤回语音消息
- **WHEN** 用户撤回自己发送的语音消息且在 2 分钟内
- **THEN** 系统从数据库删除该消息记录，删除磁盘上的音频文件，广播 revoke 消息给会话成员

#### Scenario: 撤回后引用失效
- **WHEN** 语音消息被撤回后，其他消息引用了该语音消息
- **THEN** 引用预览显示 "对方撤回了一条消息"

### Requirement: 浏览器兼容性
系统 SHALL 在浏览器不支持录音能力时优雅降级。

#### Scenario: 浏览器不支持 MediaRecorder
- **WHEN** 浏览器不支持 MediaRecorder API
- **THEN** 麦克风按钮不显示

#### Scenario: 用户拒绝麦克风权限
- **WHEN** 用户首次录音时拒绝了麦克风权限
- **THEN** 系统提示"需要麦克风权限才能录音"

### Requirement: 录音时音量波形可视化
系统 SHALL 在录音过程中通过 Canvas 实时绘制音量波形。

#### Scenario: 录音中显示波形
- **WHEN** 用户正在录音
- **THEN** 录音面板显示 Canvas 绘制的音量柱状图，高度随音量实时变化，颜色为绿色主题色
