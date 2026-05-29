## ADDED Requirements

### Requirement: 语义搜索界面
系统 SHALL 提供前端界面供用户进行语义搜索。

#### Scenario: 用户发起搜索
- **WHEN** 用户在搜索框输入查询
- **THEN** 系统显示语义搜索结果

### Requirement: AI 功能使用统计
系统 SHALL 记录 AI 功能的调用次数。

#### Scenario: 记录调用
- **WHEN** AI 功能被调用
- **THEN** 系统递增对应功能的计数器
