## ADDED Requirements

### Requirement: Solitaire form UI improvement
群接龙创建表单 SHALL 提供更好的用户界面，包括格式说明输入和实时预览。

#### Scenario: Create form with format field
- **WHEN** 用户打开群接龙创建表单
- **THEN** 表单显示标题输入框和可选的格式说明输入框

#### Scenario: Create form with preview
- **WHEN** 用户输入标题或格式说明
- **THEN** 表单下方实时显示预览效果

### Requirement: Solitaire empty state
群接龙弹窗的空状态 SHALL 使用统一的圆形图标样式。

#### Scenario: Empty state display
- **WHEN** 群聊没有接龙记录
- **THEN** 显示圆形图标（matcha渐变背景）和"暂无接龙"提示
