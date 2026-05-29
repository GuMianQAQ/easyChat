## Purpose

Describe the stable message-delivery behavior for easyChat, including real-time delivery, message history retrieval, revoke behavior, and read or unread handling.

## Requirements

### Requirement: Real-time message exchange
The system SHALL support real-time private and group messaging through the current WebSocket-based behavior. In private conversations, the `/ai` command SHALL be disabled unless the conversation partner is the AI system user. In group conversations, the `/ai` command SHALL only work when the group bot is enabled. The system SHALL also support AI-generated messages through the same real-time channel, using special message type markers to distinguish AI responses from user messages.

#### Scenario: User receives a message
- **WHEN** another participant sends a valid message into an accessible conversation
- **THEN** the receiving client can obtain the message through the existing real-time channel

#### Scenario: Delivered message updates conversation preview
- **WHEN** a real-time message is delivered into a visible conversation list
- **THEN** the conversation preview uses the same content summarization rules that the system uses after a refresh of that conversation summary

#### Scenario: AI message delivery
- **WHEN** an AI response is generated
- **THEN** the system SHALL deliver the AI message through the same WebSocket channel, using a special sender ID to mark it as AI-generated

#### Scenario: Private chat disables /ai
- **WHEN** a user sends an `/ai` message in a private chat with a non-AI user
- **THEN** the system SHALL reject the message with an appropriate error

#### Scenario: Group chat requires bot enabled for /ai
- **WHEN** a user sends an `/ai` message in a group with bot disabled
- **THEN** the system SHALL reject the message with an appropriate error

### Requirement: Message history and message actions
The system SHALL support loading message history, revoking messages, and maintaining current unread and read behavior. Message-history retrieval and revoke flows SHALL not cause conversation preview semantics or unread transitions to diverge from the latest server-visible conversation state.

#### Scenario: User loads older messages
- **WHEN** a client requests message history for an accessible conversation
- **THEN** the system returns paginated history in the existing format

#### Scenario: User receives a revoked latest message
- **WHEN** the latest visible message for a conversation is revoked
- **THEN** the conversation preview and unread state reflect the revoked-message summary consistently across real-time updates and refreshed conversation summaries

### Requirement: AI 消息类型支持
系统 SHALL 支持 AI 生成的消息类型，包括 AI 流式消息和 AI 功能菜单消息。

#### Scenario: AI 流式消息显示
- **WHEN** AI 生成流式回复时
- **THEN** 系统 SHALL 使用特殊的消息类型标记 AI 流式消息，前端使用流式渲染组件

#### Scenario: AI 功能菜单消息
- **WHEN** 用户触发 AI 功能（如翻译、摘要）时
- **THEN** 系统 SHALL 生成包含 AI 功能结果的消息，使用区别于普通消息的样式

### Requirement: 消息中的 AI 交互
系统 SHALL 支持在消息气泡中嵌入 AI 交互元素，如翻译按钮、摘要按钮等。

#### Scenario: 消息气泡中的 AI 操作
- **WHEN** 用户右键点击消息气泡
- **THEN** 上下文菜单 SHALL 包含 AI 相关操作（翻译、摘要、改写等）

#### Scenario: AI 操作结果展示
- **WHEN** 用户触发 AI 操作后
- **THEN** 操作结果 SHALL 以展开/折叠形式显示在原消息下方
