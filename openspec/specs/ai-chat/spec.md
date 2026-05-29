## Purpose

Describe the AI chat capability for easyChat, including bot conversation in groups and AI assistant private chat.

## Requirements

### Requirement: AI 机器人对话能力
系统 SHALL 支持用户通过 `/ai` 前缀在群聊中向 AI 发起对话（前提是群机器人已开启）。在 AI 助手私聊中，所有消息 SHALL 直接作为 AI 对话请求处理，不需要 `/ai` 前缀。在普通好友私聊中，`/ai` 命令 SHALL 被禁用。

#### Scenario: 群聊中使用 /ai 命令
- **WHEN** 群机器人已开启，用户在群聊中发送 `/ai` 开头的消息
- **THEN** 系统将消息内容发送给 LLM API，并将 AI 回复推送到群聊

#### Scenario: 群机器人未开启时禁用 /ai
- **WHEN** 群机器人未开启，用户在群聊中发送 `/ai` 开头的消息
- **THEN** 系统 SHALL 返回错误提示"群机器人未开启"

#### Scenario: AI 助手私聊直接对话
- **WHEN** 用户在 AI 助手私聊中发送任意消息
- **THEN** 系统将消息作为 AI 对话请求处理，AI 回复出现在该私聊中

#### Scenario: 普通好友私聊禁用 /ai
- **WHEN** 用户在普通好友私聊中发送 `/ai` 开头的消息
- **THEN** 系统 SHALL 返回错误提示"私聊不支持 AI 功能，请使用 AI 助手会话"
