## Context

Phase 1 已完成 AI 基础架构。Phase 2 在此基础上扩展功能。

## Goals / Non-Goals

**Goals:**
- 实现 AI 功能增强（翻译、摘要、智能回复、代码生成）
- 实现上下文管理（对话历史、滑动窗口）
- 实现语义搜索（向量 embedding、混合搜索）
- 编写测试和文档

**Non-Goals:**
- 不实现联网搜索功能（Phase 3）
- 不实现多模态 AI（图像生成）
- 不修改现有消息结构

## Decisions

### 1. 上下文管理：滑动窗口 + 摘要

保留最近 N 条消息作为上下文，超出部分自动摘要。

### 2. 语义搜索：SQLite FTS5 + 向量

使用 SQLite 内建的 FTS5 做关键词搜索，BLOB 列存储向量做语义搜索。

### 3. AI 功能：共享 Provider

所有 AI 功能复用同一个 Provider 实例，通过不同的 prompt 实现不同功能。

## Risks / Trade-offs

- 上下文窗口大小需要根据模型调整
- 向量搜索在大数据量时可能较慢
- 多个 AI 功能可能产生 API 调用竞争
