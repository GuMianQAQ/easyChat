## ADDED Requirements

### Requirement: ContactPicker 完整样式

ContactPicker 组件 SHALL 具有完整的视觉样式，包含全屏遮罩、居中弹窗、搜索栏和联系人列表。

#### Scenario: 弹窗遮罩渲染
- **WHEN** ContactPicker 打开
- **THEN** 显示半透明黑色遮罩覆盖全屏，弹窗居中显示

#### Scenario: 弹窗头部
- **WHEN** ContactPicker 弹窗渲染
- **THEN** 顶部显示"选择联系人"标题和关闭按钮

#### Scenario: 搜索栏渲染
- **WHEN** ContactPicker 弹窗渲染
- **THEN** 显示搜索输入框，带搜索图标，自动聚焦

#### Scenario: 联系人列表项
- **WHEN** 联系人列表渲染
- **THEN** 每项显示头像（Avatar）、昵称、微信号，hover 时有背景高亮

#### Scenario: 空状态
- **WHEN** 无匹配联系人
- **THEN** 显示"暂无联系人"空状态文字
