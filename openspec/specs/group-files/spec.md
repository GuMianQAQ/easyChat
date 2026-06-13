## Purpose

Describe the group files UI improvements, including enhanced file list display and consistent empty state styling.

## Requirements

### Requirement: Group files UI improvement
群文件列表 SHALL 显示上传者名称和文件类型色标。

#### Scenario: Display file with sender name
- **WHEN** 用户查看群文件列表
- **THEN** 每个文件项显示上传者名称

#### Scenario: Display file with type icon
- **WHEN** 用户查看群文件列表
- **THEN** 根据文件类型显示不同颜色的图标

### Requirement: Group files empty state
群文件弹窗的空状态 SHALL 使用统一的圆形图标样式。

#### Scenario: Empty state display
- **WHEN** 群聊没有文件记录
- **THEN** 显示圆形图标（matcha渐变背景）和"暂无文件"提示
