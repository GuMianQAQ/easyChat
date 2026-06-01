## ADDED Requirements

### Requirement: AI 功能使用统计
系统 SHALL 记录 AI 功能的调用次数。

#### Scenario: 记录调用
- **WHEN** AI 功能被调用
- **THEN** 系统递增对应功能的计数器

#### Scenario: 查询统计
- **WHEN** 用户查询 AI 统计
- **THEN** 系统返回各功能的调用次数
