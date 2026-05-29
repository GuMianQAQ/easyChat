## ADDED Requirements

### Requirement: 群相册

群聊 SHALL 提供相册功能，集中展示群内所有图片。

#### Scenario: 查看群相册

- **WHEN** 用户进入群设置，点击"群相册"
- **THEN** 系统以网格形式展示群内所有图片

#### Scenario: 按时间分组

- **WHEN** 系统显示群相册
- **THEN** 图片按发送日期分组显示

#### Scenario: 查看大图

- **WHEN** 用户点击相册中的某张图片
- **THEN** 系统显示大图预览，支持左右切换

#### Scenario: 相册为空

- **WHEN** 群聊没有图片
- **THEN** 系统显示"暂无图片"提示
