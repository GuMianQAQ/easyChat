## ADDED Requirements

### Requirement: 用户可以发送视频消息

系统 SHALL 允许用户发送视频消息，支持自动压缩和大小限制。

#### Scenario: 选择视频
- **WHEN** 用户在聊天界面点击"发送视频"按钮
- **THEN** 系统显示文件选择器，用户选择视频文件

#### Scenario: 视频上传
- **WHEN** 用户选择视频后确认发送
- **THEN** 系统上传视频，自动压缩，生成缩略图，发送视频消息

#### Scenario: 视频大小限制
- **WHEN** 用户选择的视频超过 50MB
- **THEN** 系统提示"视频大小不能超过 50MB"

#### Scenario: 视频时长限制
- **WHEN** 用户选择的视频超过 30 秒
- **THEN** 系统提示"视频时长不能超过 30 秒"

### Requirement: 视频消息数据格式

视频消息 SHALL 使用 JSON 格式存储视频信息。

#### Scenario: 视频消息结构
- **WHEN** 系统发送视频消息
- **THEN** 消息 content 字段包含 JSON，格式为: `{"url": "/uploads/videos/xxx.mp4", "thumbnail": "/uploads/thumbnails/xxx.jpg", "duration": 15, "width": 1280, "height": 720, "size": 5242880}`

### Requirement: 视频压缩

系统 SHALL 使用 FFmpeg 自动压缩上传的视频。

#### Scenario: 压缩参数
- **WHEN** 系统压缩视频
- **THEN** 输出 720p 分辨率，H.264 编码，码率 2Mbps，音频 AAC 128kbps

#### Scenario: 压缩失败
- **WHEN** FFmpeg 压缩失败
- **THEN** 系统尝试发送原始视频，但如果超过大小限制则提示失败

#### Scenario: 缩略图生成
- **WHEN** 视频压缩完成
- **THEN** 系统从视频第 1 秒截取一帧作为缩略图

### Requirement: 视频播放器

视频消息 SHALL 在聊天气泡中显示缩略图，点击后播放。

#### Scenario: 视频缩略图
- **WHEN** 用户接收到视频消息
- **THEN** 显示视频缩略图，叠加播放按钮和时长标签

#### Scenario: 视频播放
- **WHEN** 用户点击缩略图
- **THEN** 弹窗显示视频播放器，支持播放、暂停、进度拖动、音量控制

#### Scenario: 全屏播放
- **WHEN** 用户点击全屏按钮
- **THEN** 视频全屏播放

### Requirement: 视频存储

视频文件 SHALL 存储在服务器本地文件系统。

#### Scenario: 存储路径
- **WHEN** 视频上传成功
- **THEN** 视频存储在 `uploads/videos/` 目录，缩略图存储在 `uploads/thumbnails/` 目录

#### Scenario: 文件命名
- **WHEN** 视频保存
- **THEN** 使用 UUID 命名文件，保留原始扩展名

### Requirement: 视频上传 API

系统 SHALL 提供视频上传的 REST API。

#### Scenario: 上传接口
- **WHEN** 前端请求 `POST /api/upload/video`
- **THEN** 服务器接收视频文件，压缩后返回视频信息（URL、缩略图、时长等）

#### Scenario: 上传进度
- **WHEN** 视频正在上传
- **THEN** 前端显示上传进度条

### Requirement: FFmpeg 依赖检测

系统 SHALL 在启动时检测 FFmpeg 是否可用。

#### Scenario: FFmpeg 未安装
- **WHEN** 系统启动时检测到 FFmpeg 未安装
- **THEN** 记录警告日志，视频功能降级（仅允许小视频，不压缩）

#### Scenario: FFmpeg 版本检查
- **WHEN** 系统启动
- **THEN** 检测 FFmpeg 版本，确保支持 H.264 编码
