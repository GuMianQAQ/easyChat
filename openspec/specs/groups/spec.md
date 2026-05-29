## Purpose

Describe the stable group-chat behavior for easyChat, including group creation, group details, group profile updates, membership changes, and owner-restricted actions.

## Requirements

### Requirement: Group conversation lifecycle
The system SHALL support creating group chats, reading group details, updating supported group profile fields, leaving a group, and dismissing a group according to current role rules.

#### Scenario: Group owner creates a group chat
- **WHEN** the owner creates a group with valid members
- **THEN** the system creates the group conversation and initializes members using current permission rules

### Requirement: Group role-sensitive actions
The system SHALL enforce the existing owner and member permissions for editable group fields and destructive operations.

#### Scenario: Non-owner attempts an owner-only action
- **WHEN** a non-owner invokes an owner-restricted group operation
- **THEN** the system rejects the request using the existing permission behavior

### Requirement: 群聊机器人开关
系统 SHALL 支持群主控制群聊是否启用 AI 机器人。开关状态 SHALL 持久化存储。

#### Scenario: 群主开启机器人
- **WHEN** 群主调用机器人开关 API 设置为开启
- **THEN** 系统将 AI 助手添加为群成员，设置 `bot_enabled=true`

#### Scenario: 群主关闭机器人
- **WHEN** 群主调用机器人开关 API 设置为关闭
- **THEN** 系统将 AI 助手从群成员中移除，设置 `bot_enabled=false`

#### Scenario: 查询机器人状态
- **WHEN** 用户获取群聊详情
- **THEN** 响应 SHALL 包含 `botEnabled` 字段

### Requirement: 群主权限限制
系统 SHALL 只允许群主操作机器人开关。

#### Scenario: 非群主尝试操作
- **WHEN** 非群主调用机器人开关 API
- **THEN** 系统 SHALL 返回权限错误
