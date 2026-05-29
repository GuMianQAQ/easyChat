## Context

Phase 1-2 的 AI 实现将 AI 系统用户加入私聊会话成员，破坏了私聊的两人结构。需要重新设计 AI 的接入方式。

当前会话结构：
- 私聊 ID 格式: `private:用户A:用户B`
- 群聊 ID 格式: `group:xxx`
- AI 通过 `EnsureMember` 加入会话，导致私聊变成 3 人

## Goals / Non-Goals

**Goals:**
- AI 助手作为好友出现在好友列表，有独立的私聊会话
- 普通好友私聊不支持 AI 功能
- 群聊可选择性启用 AI 机器人
- 不破坏现有会话结构和好友关系

**Non-Goals:**
- 不实现 AI 主动发消息（只响应用户请求）
- 不实现 AI 学习用户习惯
- 不修改现有消息存储结构

## Decisions

### 1. AI 助手作为系统好友

注册时自动将 AI 助手添加为好友，使用固定的私聊会话 ID `private:用户ID:ai-assistant`。

**理由：** 用户可以直接在好友列表找到 AI，不需要学习 `/ai` 命令。

### 2. AI 助手私聊不需要 /ai 前缀

检测到私聊对方是 `ai-assistant` 时，所有消息直接作为 AI 对话处理。

**理由：** AI 助手本身就是 AI，不需要额外标记。

### 3. 群机器人开关存储在 conversations 表

在 conversations 表新增 `bot_enabled` bool 字段，仅对群聊生效。

**理由：** 每个群独立控制，开关状态需要持久化。

### 4. 群机器人开关时动态管理 AI 成员

开启时 `EnsureMember` 加入 AI，关闭时移除 AI 成员。

**理由：** AI 不在成员列表里时，不会收到群消息，也不会出现在群成员列表中。

## Risks / Trade-offs

- [风险] 现有用户没有 AI 好友 → 启动时检查并自动补加
- [风险] 群机器人开关频繁切换 → 使用 `OnConflict DoNothing` 避免重复添加
