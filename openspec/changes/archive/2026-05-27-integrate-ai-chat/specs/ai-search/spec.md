## ADDED Requirements

### Requirement: 语义搜索能力
系统 SHALL 支持基于向量 embedding 的语义搜索，允许用户使用自然语言搜索聊天记录。

#### Scenario: 用户发起语义搜索
- **WHEN** 用户在搜索框输入自然语言查询
- **THEN** 系统将查询转换为向量，搜索相似的聊天记录并返回结果

#### Scenario: 搜索结果排序
- **WHEN** 系统返回搜索结果时
- **THEN** 结果 SHALL 按语义相似度排序，最相关的结果排在前面

### Requirement: 混合搜索策略
系统 SHALL 支持关键词搜索（FTS5）和语义搜索（向量）的混合策略。

#### Scenario: 混合搜索
- **WHEN** 用户发起搜索请求
- **THEN** 系统同时执行关键词搜索和语义搜索，合并结果并去重

#### Scenario: 搜索结果标注
- **WHEN** 系统返回混合搜索结果时
- **THEN** 每个结果 SHALL 标注其来源（关键词匹配或语义匹配）

### Requirement: 搜索结果上下文
系统 SHALL 在搜索结果中显示消息的上下文信息，帮助用户理解消息背景。

#### Scenario: 显示消息上下文
- **WHEN** 搜索结果包含某条消息时
- **THEN** 系统 SHALL 显示该消息前后各 2-3 条消息作为上下文

#### Scenario: 跳转到原始位置
- **WHEN** 用户点击搜索结果中的某条消息
- **THEN** 系统 SHALL 跳转到该消息在原始会话中的位置
