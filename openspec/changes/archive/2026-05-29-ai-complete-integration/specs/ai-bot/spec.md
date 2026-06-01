## Purpose

Describe the AI bot integration model: AI assistant as a system friend, and group bot toggle.

## Requirements

### Requirement: AI 助手作为系统好友
系统 SHALL 在用户注册时自动将 AI 助手添加为好友，AI 助手 SHALL 出现在好友列表第一位。

#### Scenario: 新用户注册后自动获得 AI 好友
- **WHEN** 新用户完成注册
- **THEN** 系统自动将 AI 助手添加为该用户的好友

#### Scenario: AI 助手出现在好友列表第一位
- **WHEN** 用户查看好友列表
- **THEN** AI 助手 SHALL 排在所有好友之前

### Requirement: AI 助手独立私聊
系统 SHALL 为每个用户提供与 AI 助手的独立私聊会话，用户发送的所有消息 SHALL 被视为 AI 对话请求。

#### Scenario: 用户与 AI 助手直接对话
- **WHEN** 用户在 AI 助手私聊中发送消息
- **THEN** 系统将消息作为 AI 对话请求处理，不需要 `/ai` 前缀

#### Scenario: AI 助手私聊会话独立
- **WHEN** 用户与 AI 助手对话
- **THEN** 对话 SHALL 发生在独立的 `private:用户ID:ai-assistant` 会话中，不影响其他私聊

### Requirement: 群聊机器人开关
系统 SHALL 支持群主控制群聊是否启用 AI 机器人。

#### Scenario: 群主开启机器人
- **WHEN** 群主在群设置中开启机器人
- **THEN** AI 助手 SHALL 被添加为群成员，群成员可以使用 `/ai` 命令

#### Scenario: 群主关闭机器人
- **WHEN** 群主在群设置中关闭机器人
- **THEN** AI 助手 SHALL 被从群成员中移除，群成员无法使用 `/ai` 命令

#### Scenario: 非群主无法操作机器人开关
- **WHEN** 非群主尝试操作机器人开关
- **THEN** 系统 SHALL 拒绝请求
