## Purpose

Describe AI context management for maintaining conversation history and coherence.

## Requirements

### Requirement: 对话历史存储
系统 SHALL 存储 AI 对话历史，支持上下文感知的连续对话。

#### Scenario: 存储对话历史
- **WHEN** 用户与 AI 对话时
- **THEN** 系统将每轮对话（用户问题 + AI 回复）存储到 `ai_conversations` 表

### Requirement: 滑动窗口上下文
系统 SHALL 使用滑动窗口管理上下文长度，防止超出 LLM 的 token 限制。

#### Scenario: 上下文窗口限制
- **WHEN** 对话历史超过窗口大小
- **THEN** 系统只保留最近 N 条消息作为上下文

### Requirement: 上下文摘要
系统 SHALL 在对话历史过长时自动生成摘要，压缩上下文。

#### Scenario: 自动生成摘要
- **WHEN** 对话历史超过阈值
- **THEN** 系统将旧消息摘要为一段文字，作为上下文的一部分
