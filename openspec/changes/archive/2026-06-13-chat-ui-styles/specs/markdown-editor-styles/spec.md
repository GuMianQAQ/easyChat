## ADDED Requirements

### Requirement: MarkdownEditor 完整样式

MarkdownEditor 组件 SHALL 具有完整的视觉样式，包含全屏遮罩、居中弹窗、工具栏、编辑区、预览区和底部栏。

#### Scenario: 弹窗遮罩渲染
- **WHEN** MarkdownEditor 打开
- **THEN** 显示半透明黑色遮罩覆盖全屏，弹窗居中显示

#### Scenario: 弹窗头部
- **WHEN** MarkdownEditor 弹窗渲染
- **THEN** 顶部左侧显示"Markdown 编辑"标题，右侧显示预览切换按钮和关闭按钮

#### Scenario: 工具栏渲染
- **WHEN** 编辑模式下
- **THEN** 显示 8 个格式化按钮（粗体、斜体、删除线、无序列表、有序列表、链接、代码、引用），带图标

#### Scenario: 文本编辑区
- **WHEN** 编辑模式下
- **THEN** 显示大面积文本输入框，等宽字体，带 placeholder

#### Scenario: 预览模式切换
- **WHEN** 用户点击预览按钮
- **THEN** 编辑区替换为 MarkdownContent 渲染预览区，按钮文字变为"编辑"

#### Scenario: 底部发送栏
- **WHEN** MarkdownEditor 弹窗渲染
- **THEN** 底部左侧显示"Ctrl+Enter 发送"提示，右侧显示"提交"按钮
