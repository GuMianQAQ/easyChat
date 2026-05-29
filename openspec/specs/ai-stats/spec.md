## Purpose

Describe AI usage statistics tracking for easyChat.

## Requirements

### Requirement: AI 功能使用统计
系统 SHALL 记录各 AI 功能的调用次数，用于监控和运维。

#### Scenario: 记录调用
- **WHEN** AI 功能被调用（对话、流式、翻译、摘要、回复建议、搜索）
- **THEN** 系统递增对应功能的原子计数器

#### Scenario: 查询统计
- **WHEN** 用户请求 AI 统计信息
- **THEN** 系统返回各功能的调用次数及总计

### Requirement: 统计数据结构
系统 SHALL 维护以下统计项：chat、stream、translate、summarize、replies、search、total。
