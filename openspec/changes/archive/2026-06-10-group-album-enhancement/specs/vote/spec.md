## ADDED Requirements

### Requirement: Vote form UI improvement
群投票创建表单 SHALL 提供更好的用户界面，包括投票类型选择和设置项分组。

#### Scenario: Create form with type selection
- **WHEN** 用户打开群投票创建表单
- **THEN** 表单显示投票类型选择（单选/多选）

#### Scenario: Create form with grouped settings
- **WHEN** 用户查看投票创建表单的设置区域
- **THEN** 设置项（匿名投票、截止时间）分组显示，每个设置有说明文字

### Requirement: Vote empty state
群投票弹窗的空状态 SHALL 使用统一的圆形图标样式。

#### Scenario: Empty state display
- **WHEN** 群聊没有投票记录
- **THEN** 显示圆形图标（matcha渐变背景）和"暂无投票"提示
