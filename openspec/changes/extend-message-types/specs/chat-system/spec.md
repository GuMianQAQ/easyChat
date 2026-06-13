## MODIFIED Requirements

### Requirement: 消息类型扩展

聊天系统 SHALL 支持扩展的消息类型，包括原有类型和新增类型。

#### Scenario: 消息类型枚举
- **WHEN** 系统处理消息
- **THEN** 支持以下 messageType: "text", "image", "file", "voice", "contact", "code", "markdown", "link", "sticker", "video"

#### Scenario: 未知消息类型处理
- **WHEN** 前端接收到未知的 messageType
- **THEN** 降级显示为文本消息，显示原始内容

### Requirement: 消息渲染分发

MessageBubble 组件 SHALL 根据 messageType 分发到对应的渲染组件。

#### Scenario: 渲染分发逻辑
- **WHEN** 渲染消息气泡
- **THEN** 根据 messageType 选择对应的组件:
  - "text" → TextContent
  - "image" → ImageContent
  - "file" → FileContent
  - "voice" → VoicePlayer
  - "contact" → ContactCard
  - "code" → CodeBlock
  - "markdown" → MarkdownContent
  - "link" → LinkPreview
  - "sticker" → StickerContent
  - "video" → VideoContent

#### Scenario: 组件懒加载
- **WHEN** 渲染消息
- **THEN** 非核心组件使用 React.lazy 懒加载，减少首屏加载时间

### Requirement: 工具栏布局

聊天输入框上方 SHALL 显示简化后的工具栏。

#### Scenario: 工具栏按钮
- **WHEN** 用户查看聊天输入框
- **THEN** 工具栏从左到右显示：[表情] [媒体] [截图] [语音]

#### Scenario: 表情按钮
- **WHEN** 用户点击"表情"按钮
- **THEN** 打开表情面板（Emoji/收藏）

#### Scenario: 媒体按钮
- **WHEN** 用户点击"媒体"按钮
- **THEN** 显示下拉菜单，包含：文件、名片、代码、Markdown

#### Scenario: 截图按钮
- **WHEN** 用户点击"截图"按钮
- **THEN** 触发截图功能

#### Scenario: 语音按钮
- **WHEN** 用户点击"语音"按钮
- **THEN** 开始语音录制

### Requirement: 媒体组菜单

媒体按钮 SHALL 显示下拉菜单，包含多种消息类型入口。

#### Scenario: 菜单项
- **WHEN** 用户点击"媒体"按钮
- **THEN** 显示下拉菜单，从上到下：📁 文件、👤 名片、💻 代码、📝 Markdown

#### Scenario: 文件选项
- **WHEN** 用户点击"文件"菜单项
- **THEN** 打开文件选择器，支持选择任意类型文件（图片、视频、文档等）

#### Scenario: 名片选项
- **WHEN** 用户点击"名片"菜单项
- **THEN** 打开联系人选择器

#### Scenario: 代码选项
- **WHEN** 用户点击"代码"菜单项
- **THEN** 打开代码编辑器弹窗

#### Scenario: Markdown 选项
- **WHEN** 用户点击"Markdown"菜单项
- **THEN** 输入框切换为 Markdown 编辑模式

### Requirement: WebSocket 消息协议

WebSocket 消息协议 SHALL 支持新的消息类型。

#### Scenario: 消息发送格式
- **WHEN** 前端发送新类型消息
- **THEN** 消息格式为: `{"type": "chat", "messageType": "xxx", "content": "...", "conversationId": "...", ...}`

#### Scenario: 消息接收处理
- **WHEN** 后端接收到新类型消息
- **THEN** 验证 messageType 合法性，存储消息，广播给目标用户

### Requirement: 消息存储

消息存储 SHALL 支持新消息类型。

#### Scenario: 消息入库
- **WHEN** 后端接收到新类型消息
- **THEN** 将 messageType 和 content 存入 Message 表，与其他类型消息一致

#### Scenario: 消息查询
- **WHEN** 前端请求历史消息
- **THEN** 返回包含 messageType 的消息列表，前端根据类型渲染

### Requirement: 消息搜索

消息搜索 SHALL 支持新消息类型的内容搜索。

#### Scenario: 文本搜索
- **WHEN** 用户搜索聊天记录
- **THEN** 搜索 text、code、markdown 消息的 content 字段

#### Scenario: 非文本消息搜索
- **WHEN** 用户搜索聊天记录
- **THEN** 对于 image、file、video 等类型，搜索文件名或描述（如有）
