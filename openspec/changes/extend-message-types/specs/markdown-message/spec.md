## ADDED Requirements

### Requirement: 用户可以发送 Markdown 消息

系统 SHALL 允许用户发送 Markdown 格式的富文本消息，入口在媒体组菜单中。

#### Scenario: 切换到 Markdown 模式
- **WHEN** 用户点击"媒体"按钮，选择"Markdown"选项
- **THEN** 输入框切换为 Markdown 编辑模式，显示工具栏和输入区域

#### Scenario: Markdown 消息渲染
- **WHEN** 用户接收到一条 Markdown 消息
- **THEN** 系统将 Markdown 渲染为富文本，支持标题、粗体、斜体、列表、链接、代码块

#### Scenario: 退出 Markdown 模式
- **WHEN** 用户点击"退出Markdown"按钮
- **THEN** 输入框切换回普通文本模式，内容保留

### Requirement: Markdown 消息数据格式

Markdown 消息 SHALL 使用原始 Markdown 文本作为内容。

#### Scenario: Markdown 消息结构
- **WHEN** 系统发送 Markdown 消息
- **THEN** 消息 content 字段包含原始 Markdown 文本，messageType 为 "markdown"

### Requirement: Markdown 渲染支持

系统 SHALL 支持 GitHub Flavored Markdown (GFM) 语法。

#### Scenario: 支持的语法
- **WHEN** 渲染 Markdown 消息
- **THEN** 支持: 标题 (h1-h6), 粗体, 斜体, 删除线, 无序列表, 有序列表, 任务列表, 链接, 图片, 行内代码, 代码块, 表格, 引用

#### Scenario: 安全过滤
- **WHEN** 渲染 Markdown 消息
- **THEN** 系统过滤危险内容（如 script 标签、onclick 事件），防止 XSS 攻击

### Requirement: Markdown 工具栏

Markdown 编辑模式 SHALL 提供格式化工具栏。

#### Scenario: 工具栏按钮
- **WHEN** 用户进入 Markdown 编辑模式
- **THEN** 输入框上方显示工具栏，包含：粗体(B)、斜体(I)、删除线(~)、无序列表(•)、有序列表(1.)、链接(🔗)、代码(</>)、引用(📋)

#### Scenario: 工具栏操作
- **WHEN** 用户点击工具栏按钮
- **THEN** 在光标位置插入对应的 Markdown 语法标记

### Requirement: Markdown 消息 UI 展示

Markdown 消息 SHALL 在聊天气泡中渲染为富文本。

#### Scenario: 消息气泡样式
- **WHEN** 渲染 Markdown 消息
- **THEN** 使用聊天应用常见的富文本样式，标题加粗，列表有缩进，代码有背景色

#### Scenario: 链接可点击
- **WHEN** Markdown 消息中包含链接
- **THEN** 链接显示为可点击的蓝色文字，点击在新窗口打开
