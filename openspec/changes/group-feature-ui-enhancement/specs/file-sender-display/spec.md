## ADDED Requirements

### Requirement: File sender name display
群文件列表 SHALL 显示每个文件的上传者名称。

#### Scenario: Display file with sender name
- **WHEN** 用户查看群文件列表
- **THEN** 每个文件项显示上传者名称（在文件大小和时间之间）

### Requirement: File type icon color
群文件列表 SHALL 根据文件类型显示不同颜色的图标。

#### Scenario: Image file icon
- **WHEN** 文件类型为图片（image/*）
- **THEN** 显示蓝色图片图标

#### Scenario: Document file icon
- **WHEN** 文件类型为文档（pdf, doc, xls, txt）
- **THEN** 显示绿色文档图标

#### Scenario: Archive file icon
- **WHEN** 文件类型为压缩包（zip, rar, 7z）
- **THEN** 显示橙色压缩包图标

#### Scenario: Other file icon
- **WHEN** 文件类型为其他
- **THEN** 显示灰色文件图标

### Requirement: File time format
群文件列表 SHALL 使用友好的时间格式显示文件上传时间。

#### Scenario: Today's file
- **WHEN** 文件是今天上传的
- **THEN** 显示"今天 HH:mm"

#### Scenario: Yesterday's file
- **WHEN** 文件是昨天上传的
- **THEN** 显示"昨天 HH:mm"

#### Scenario: This week's file
- **WHEN** 文件是本周内上传的
- **THEN** 显示"X天前"

#### Scenario: Older file
- **WHEN** 文件是更早之前上传的
- **THEN** 显示完整日期"YYYY-MM-DD"
