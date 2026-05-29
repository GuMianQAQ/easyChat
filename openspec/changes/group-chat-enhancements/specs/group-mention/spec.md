## ADDED Requirements

### Requirement: 用户可以在群聊中 @ 其他成员

用户在群聊输入框中输入 @ 符号时，系统 SHALL 弹出成员选择列表，用户可以选择要 @ 的成员。

#### Scenario: 输入 @ 触发成员选择器

- **WHEN** 用户在群聊输入框中输入 @ 符号
- **THEN** 系统弹出成员选择列表，显示群内所有成员

#### Scenario: 选择成员插入 @ 标记

- **WHEN** 用户从成员列表中选择一个成员
- **THEN** 系统在输入框中插入 "@昵称 " 文本，并记录 user_id

#### Scenario: 搜索成员

- **WHEN** 用户在成员选择器中输入关键词
- **THEN** 系统根据昵称或用户名过滤成员列表

### Requirement: 消息中的 @ 标记高亮显示

消息内容中的 @xxx 标记 SHALL 被渲染为高亮样式，可点击。

#### Scenario: 渲染 @ 高亮

- **WHEN** 消息内容包含 @user_id 标记
- **THEN** 前端将 @user_id 替换为 "@昵称" 并应用高亮样式

#### Scenario: 点击 @ 跳转

- **WHEN** 用户点击消息中的 @xxx 高亮文本
- **THEN** 系统显示该用户的资料卡或跳转到该用户的私聊

### Requirement: 被 @ 的用户收到特殊提醒

当用户在群聊中被 @ 时，系统 SHALL 通过 WebSocket 推送特殊提醒。

#### Scenario: 推送 @ 提醒

- **WHEN** 群聊消息包含 @user_id 标记
- **THEN** 系统通过 WebSocket 向被 @ 的用户推送提醒事件

#### Scenario: 会话列表显示 @ 标记

- **WHEN** 用户在某个群聊中被 @ 且未读
- **THEN** 会话列表中该群聊显示特殊 @ 标记

### Requirement: 支持 @ 所有人

用户可以选择 @ 所有人（@all），向群内所有成员发送提醒。

#### Scenario: @ 所有人

- **WHEN** 用户选择 @ 所有人
- **THEN** 系统在消息中标记 @all，所有群成员收到提醒
