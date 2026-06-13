## ADDED Requirements

### Requirement: 用户可以发送名片消息

系统 SHALL 允许用户在聊天中分享其他用户的名片，接收者可以查看名片信息并添加好友。

#### Scenario: 发送名片成功
- **WHEN** 用户在聊天界面点击"发送名片"按钮
- **THEN** 系统显示联系人选择器，用户选择一个联系人后，系统发送一条 messageType 为 "contact" 的消息

#### Scenario: 接收名片消息
- **WHEN** 用户接收到一条名片消息
- **THEN** 系统显示名片卡片，包含头像、昵称、微信号，并显示"添加好友"按钮

#### Scenario: 通过名片添加好友
- **WHEN** 用户点击名片卡片上的"添加好友"按钮
- **THEN** 系统跳转到好友申请页面，预填对方信息

#### Scenario: 分享自己
- **WHEN** 用户选择分享自己的名片
- **THEN** 系统允许发送，接收者可以查看并添加

### Requirement: 名片消息数据格式

名片消息 SHALL 使用 JSON 格式存储联系人信息。

#### Scenario: 名片消息结构
- **WHEN** 系统发送名片消息
- **THEN** 消息 content 字段包含 JSON，格式为: `{"userId": "user-123", "name": "张三", "avatar": "/uploads/xxx.jpg", "wechatId": "zhangsan"}`

### Requirement: 名片卡片 UI 展示

名片卡片 SHALL 显示联系人的基本信息，并提供操作按钮。

#### Scenario: 名片卡片布局
- **WHEN** 渲染名片消息
- **THEN** 显示卡片样式，左侧头像，右侧昵称和微信号，底部"添加好友"按钮

#### Scenario: 已是好友状态
- **WHEN** 接收者已经是名片用户的好友
- **THEN** "添加好友"按钮显示为"发消息"，点击跳转到与该用户的聊天
