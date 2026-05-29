## Purpose

Describe the streaming AI response capability for easyChat, including WebSocket streaming protocol and frontend rendering.

## Requirements

### Requirement: 流式响应协议
系统 SHALL 通过 WebSocket 协议支持 AI 回复的流式传输。

#### Scenario: 流式 chunk 消息
- **WHEN** AI 生成回复时
- **THEN** 系统通过 WebSocket 发送 `ai-stream-chunk` 消息，包含增量内容

#### Scenario: 流式结束消息
- **WHEN** AI 回复生成完成
- **THEN** 系统通过 WebSocket 发送 `ai-stream-done` 消息，包含最终消息 ID

#### Scenario: 流式消息格式
- **WHEN** 系统发送流式消息时
- **THEN** 消息 SHALL 包含 `streamId`、`conversationId`、`content`（chunk）或 `messageId`（done）

### Requirement: 流式回复渲染
系统 SHALL 在前端实时渲染 AI 流式回复。

#### Scenario: 显示流式气泡
- **WHEN** 用户在 AI 助手会话中发送消息
- **THEN** 前端立即显示"AI 正在输入..."的流式气泡

#### Scenario: 追加内容
- **WHEN** 前端收到 `ai-stream-chunk` 消息
- **THEN** 流式气泡追加增量内容，显示光标动画

#### Scenario: 替换为最终消息
- **WHEN** 前端收到 `ai-stream-done` 消息
- **THEN** 流式气泡替换为最终消息（通过正常 chat 消息到达）

### Requirement: 流式状态管理
系统 SHALL 在会话切换时保留流式状态。

#### Scenario: 切换会话
- **WHEN** 用户在流式过程中切换到其他会话
- **THEN** 流式状态保留，不中断流式过程

#### Scenario: 返回会话
- **WHEN** 用户返回到有流式回复的会话
- **THEN** 流式气泡继续显示，内容继续追加

### Requirement: 流式错误处理
系统 SHALL 正确处理流式过程中的错误。

#### Scenario: 网络中断
- **WHEN** 流式过程中网络中断
- **THEN** 系统显示错误提示，清理流式状态

#### Scenario: AI 服务错误
- **WHEN** AI 服务返回错误
- **THEN** 系统显示错误提示，保留已接收的部分内容
