## ADDED Requirements

### Requirement: AI 机器人对话能力
系统 SHALL 支持用户通过 `/ai` 前缀在聊天中向 AI 发起对话。AI 回复 SHALL 以特殊消息形式出现在聊天流中，与普通用户消息区分开来。

#### Scenario: 用户发起 AI 对话
- **WHEN** 用户发送以 `/ai` 开头的消息
- **THEN** 系统将消息内容发送给 LLM API，并将 AI 回复以特殊消息形式推送给用户

#### Scenario: AI 回复显示在聊天流中
- **WHEN** AI 生成回复后
- **THEN** 回复以 AI 助手身份出现在当前会话的消息流中，使用区别于普通消息的气泡样式

### Requirement: AI 流式响应
系统 SHALL 支持 AI 回复的流式传输，通过 SSE 协议将 LLM 的响应逐字推送给前端。

#### Scenario: AI 流式回复
- **WHEN** 用户发起 AI 对话请求
- **THEN** 系统通过 SSE 连接将 LLM 的流式响应逐字推送给前端，前端实时渲染

#### Scenario: 流式响应中断处理
- **WHEN** SSE 连接中断或 LLM API 返回错误
- **THEN** 系统 SHALL 将已接收的部分内容保存为完整消息，并显示错误提示

### Requirement: AI 上下文管理
系统 SHALL 支持 AI 对话的上下文管理，允许 AI 参考之前的对话历史进行回复。

#### Scenario: AI 参考上下文回复
- **WHEN** 用户在同一个会话中多次向 AI 发起对话
- **THEN** AI SHALL 能够参考之前的对话历史进行连贯回复

#### Scenario: 上下文窗口限制
- **WHEN** 对话历史超过 LLM 的上下文窗口限制
- **THEN** 系统 SHALL 自动截断或摘要旧的对话内容
