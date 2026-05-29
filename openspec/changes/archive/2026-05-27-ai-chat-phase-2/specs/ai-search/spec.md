## Purpose

Describe semantic search capability using vector embeddings.

## Requirements

### Requirement: 向量存储
系统 SHALL 将消息的向量 embedding 存储到数据库，支持后续的语义搜索。

#### Scenario: 自动生成 embedding
- **WHEN** 新消息保存时
- **THEN** 系统自动生成该消息的向量 embedding 并存储

### Requirement: 语义搜索
系统 SHALL 支持基于向量相似度的语义搜索。

#### Scenario: 语义搜索
- **WHEN** 用户输入自然语言查询
- **THEN** 系统将查询转换为向量，找到最相似的消息

### Requirement: 混合搜索
系统 SHALL 支持关键词搜索（FTS5）和语义搜索的混合策略。

#### Scenario: 混合搜索
- **WHEN** 用户发起搜索
- **THEN** 系统同时执行关键词和语义搜索，合并结果
