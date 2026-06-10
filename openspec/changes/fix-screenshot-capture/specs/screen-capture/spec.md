## ADDED Requirements

### Requirement: 截图功能可用
系统 SHALL 使用 Electron desktopCapturer API 实现截图功能，替代不可用的浏览器 getDisplayMedia API。

#### Scenario: 点击截图按钮触发截图
- **WHEN** 用户点击聊天工具栏的截图按钮
- **THEN** 系统调用 desktopCapturer 捕获主显示器屏幕，显示全屏区域选择器

#### Scenario: 截图功能不可用时的错误提示
- **WHEN** desktopCapturer 调用失败
- **THEN** 系统显示错误通知，提示"截图失败"

### Requirement: 区域选择
系统 SHALL 提供全屏选择器，允许用户框选要截取的屏幕区域。

#### Scenario: 显示全屏选择器
- **WHEN** 截图成功捕获屏幕
- **THEN** 系统创建覆盖整个主显示器的无边框透明窗口，显示屏幕截图作为背景，带深色半透明遮罩

#### Scenario: 用户拖拽选择区域
- **WHEN** 用户在选择器窗口中按住鼠标拖拽
- **THEN** 系统绘制选框，选框内区域透明高亮显示原图

#### Scenario: 确认选区
- **WHEN** 用户点击确认按钮或双击选区
- **THEN** 系统裁剪选中区域的图片，关闭选择器窗口，返回裁剪后的图片数据

#### Scenario: 取消截图
- **WHEN** 用户点击取消按钮或按 ESC 键
- **THEN** 系统关闭选择器窗口，不返回图片

### Requirement: 截图预览
系统 SHALL 在截图后在聊天框上方显示图片预览，而不是直接发送。

#### Scenario: 显示截图预览
- **WHEN** 截图完成并返回图片数据
- **THEN** 在聊天输入框上方显示图片缩略图预览，带发送和取消按钮

#### Scenario: 继续输入文字
- **WHEN** 截图预览显示时
- **THEN** 用户可以在输入框中继续输入文字

#### Scenario: 发送截图和文字
- **WHEN** 用户按回车键且有截图预览
- **THEN** 系统发送图片，如果同时有文字则一起发送

#### Scenario: 取消截图预览
- **WHEN** 用户点击预览的关闭按钮
- **THEN** 系统清除截图预览，不发送图片

### Requirement: 隐藏窗口截图
系统 SHALL 支持截图前隐藏主窗口，以便截取被遮挡的内容。

#### Scenario: 设置开关控制
- **WHEN** 用户在设置页面切换"隐藏窗口截图"开关
- **THEN** 系统保存设置到 UserSettings.hideWindowOnCapture

#### Scenario: 隐藏窗口截图开启时的行为
- **WHEN** hideWindowOnCapture 为 true 且用户点击截图
- **THEN** 主进程隐藏主窗口，等待 300ms 后截取屏幕，截图完成后恢复主窗口

#### Scenario: 隐藏窗口截图关闭时的行为
- **WHEN** hideWindowOnCapture 为 false 且用户点击截图
- **THEN** 系统直接截取屏幕，不隐藏主窗口

### Requirement: 设置页面集成
系统 SHALL 在设置页面的偏好区域提供截图相关设置。

#### Scenario: 显示隐藏窗口截图开关
- **WHEN** 用户打开设置页面的偏好区域
- **THEN** 显示"隐藏窗口截图"开关，描述为"截图前自动隐藏窗口，可截取被遮挡内容"

