## ADDED Requirements

### Requirement: MediaMenu 完整样式

MediaMenu 组件 SHALL 具有完整的视觉样式，包含容器按钮和下拉菜单。

#### Scenario: 触发按钮渲染
- **WHEN** MediaMenu 渲染
- **THEN** 工具栏中显示文件图标 + 下箭头按钮，与相邻按钮风格一致

#### Scenario: 下拉菜单渲染
- **WHEN** 用户点击触发按钮
- **THEN** 向上弹出白色圆角菜单，带阴影，包含三个菜单项

#### Scenario: 菜单项渲染
- **WHEN** 下拉菜单打开
- **THEN** 每项显示图标 + 文字（"文件"、"名片"、"Markdown"），hover 时有背景高亮
