## Why

Phase 1-2 的 AI 功能将 AI 内嵌到所有会话中，导致私聊会话结构被破坏（AI 系统用户被加入私聊成员），引发好友关系校验错误。需要重新设计 AI 的接入方式，使其不破坏现有会话结构。

## What Changes

- AI 助手作为系统好友，注册时自动添加到好友列表第一位
- AI 助手有独立的私聊会话，不需要 `/ai` 前缀即可直接对话
- 普通好友私聊禁用 `/ai` 命令
- 群聊增加"群机器人"开关，群主可控制是否启用 AI
- 开关状态存储在 conversations 表的 `bot_enabled` 字段

## Capabilities

### New Capabilities

- `ai-bot`: AI 机器人接入方式，包括 AI 助手好友、群机器人开关

### Modified Capabilities

- `ai-chat`: 修改 AI 消息处理逻辑，区分私聊/群聊/AI 助手会话
- `messaging`: 私聊中禁用 `/ai` 命令
- `groups`: 群聊增加机器人开关，控制 AI 成员的加入/移除

## Impact

- 数据库：conversations 表新增 `bot_enabled` 字段
- 后端：修改 HandleMessage 逻辑，新增群机器人开关 API
- 前端：群设置面板增加机器人开关 UI
- 注册流程：新用户注册时自动添加 AI 好友
