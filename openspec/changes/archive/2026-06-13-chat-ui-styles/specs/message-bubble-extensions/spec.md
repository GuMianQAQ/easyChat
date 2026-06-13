## ADDED Requirements

### Requirement: Contact 消息使用 ContactCard 渲染

MessageBubble 中 messageType 为 "text" 且 content 以 `[名片]` 前缀开头的消息 SHALL 使用 ContactCard 组件渲染。

#### Scenario: 名片消息渲染
- **WHEN** 消息 messageType 为 "text" 且 content 匹配 `[名片] name\nID: userId\n微信: wechatId` 格式
- **THEN** 解析 content 中的 name、userId 和 wechatId，渲染为 ContactCard 组件（白底卡片 + 头像 + 昵称 + 微信号 + 分隔线 + 操作按钮）

#### Scenario: 名片消息解析失败降级
- **WHEN** 消息 content 以 `[名片]` 开头但无法解析出 ID 行
- **THEN** 降级为纯文本显示

#### Scenario: 名片消息发送格式
- **WHEN** 用户通过 ContactPicker 选择联系人发送名片
- **THEN** 以 messageType "text" 发送，content 格式为 `[名片] name\nID: userId\n微信: wechatId`

### Requirement: ContactCard 视觉样式

ContactCard 在消息气泡中 SHALL 以白底卡片形式呈现，与文件消息保持一致的设计语言。

#### Scenario: 卡片在绿色气泡中（自己发的）
- **WHEN** 名片消息在自己发送的绿色气泡中渲染
- **THEN** 卡片白底 + 圆角，气泡 padding 露出绿色边缘，形成层次感

#### Scenario: 卡片在白色气泡中（别人发的）
- **WHEN** 名片消息在别人发送的白色气泡中渲染
- **THEN** 卡片白底 + 细边框（border-color: transparent），从气泡中浮现

#### Scenario: 信息区与操作区分隔
- **WHEN** ContactCard 渲染
- **THEN** 头像/昵称/微信号信息区与底部操作按钮之间有分隔线

### Requirement: Markdown 消息使用 MarkdownContent 渲染

MessageBubble 中 messageType 为 "text" 且 content 以 `[MD]\n` 前缀开头的消息 SHALL 使用 MarkdownContent 组件渲染。

#### Scenario: Markdown 消息渲染
- **WHEN** 消息 messageType 为 "text" 且 content 以 `[MD]\n` 开头
- **THEN** 剥离 `[MD]\n` 前缀，将剩余 content 传入 MarkdownContent 组件渲染为格式化 HTML

#### Scenario: Markdown 消息发送
- **WHEN** 用户通过 MarkdownEditor 发送消息
- **THEN** 在内容前添加 `[MD]\n` 前缀后以 messageType "text" 发送

### Requirement: 消息气泡 contact/markdown 样式

#### Scenario: contact 消息气泡宽度
- **WHEN** 名片消息渲染在气泡中
- **THEN** 气泡宽度固定 260px，适配 ContactCard 布局

#### Scenario: markdown 消息气泡样式
- **WHEN** Markdown 消息渲染在气泡中
- **THEN** 气泡内 Markdown 渲染样式与项目已有 MarkdownContent 样式一致
