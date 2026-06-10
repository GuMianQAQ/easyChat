## ADDED Requirements

### Requirement: Solitaire format field
群接龙 SHALL 支持可选的格式说明字段（Format），用于告诉参与者如何填写接龙内容。

#### Scenario: Create solitaire with format
- **WHEN** 用户创建接龙时填写了格式说明
- **THEN** 系统保存格式说明，并在接龙详情中显示

#### Scenario: Create solitaire without format
- **WHEN** 用户创建接龙时未填写格式说明
- **THEN** 系统创建接龙，格式说明字段为空，前端不显示格式说明区域

### Requirement: Solitaire format display
群接龙详情 SHALL 显示格式说明（如果有），帮助参与者理解填写格式。

#### Scenario: Display solitaire with format
- **WHEN** 用户查看有格式说明的接龙
- **THEN** 在标题下方显示格式说明文字

#### Scenario: Display solitaire without format
- **WHEN** 用户查看没有格式说明的接龙
- **THEN** 不显示格式说明区域

### Requirement: Solitaire create form preview
群接龙创建表单 SHALL 提供实时预览功能，让用户在创建前看到接龙效果。

#### Scenario: Preview updates on input
- **WHEN** 用户输入标题或格式说明
- **THEN** 预览区实时更新显示效果

#### Scenario: Preview shows example entries
- **WHEN** 用户查看预览区
- **THEN** 显示 2-3 个示例接龙条目
