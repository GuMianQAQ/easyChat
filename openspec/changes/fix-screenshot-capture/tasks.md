## 1. 类型定义与设置

- [x] 1.1 在 UserSettings 接口中增加 hideWindowOnCapture 字段
- [x] 1.2 在设置页面偏好区域增加"隐藏窗口截图"开关

## 2. 主进程截图能力

- [x] 2.1 在 main.ts 中实现 desktopCapturer 截图函数
- [x] 2.2 新增 IPC handler: mychat-capture:screenshot
- [x] 2.3 实现隐藏窗口逻辑（根据设置决定是否隐藏）

## 3. 全屏选择器窗口

- [x] 3.1 创建选择器窗口配置（无边框、透明、全屏、置顶）
- [x] 3.2 实现选择器 HTML/CSS/JS（背景图、遮罩、选框绘制）
- [x] 3.3 实现鼠标拖拽选择区域交互
- [x] 3.4 实现确认/取消按钮和 ESC 快捷键
- [x] 3.5 新增 IPC handler: mychat-capture:confirm-region 和 cancel-capture
- [x] 3.6 实现选区裁剪图片逻辑

## 4. 预加载脚本

- [x] 4.1 在 preload.ts 中暴露 window.myChatCapture API
- [x] 4.2 实现 takeScreenshot 方法调用主进程 IPC

## 5. 渲染进程媒体工具

- [x] 5.1 在 media.ts 中新增 captureScreen 函数使用 IPC
- [x] 5.2 移除旧的 captureDisplayFrame 函数

## 6. 聊天框预览 UI

- [x] 6.1 在 MessageComposer 中增加 screenshotPreview 状态
- [x] 6.2 实现截图预览组件（缩略图、发送按钮、关闭按钮）
- [x] 6.3 修改截图按钮逻辑：调用 captureScreen 并设置预览
- [x] 6.4 修改发送逻辑：回车时同时发送图片和文字
- [x] 6.5 修改 handleCaptureScreen 返回 dataUrl 而不是直接发送

## 7. 测试与验证

- [ ] 7.1 测试基本截图流程（不隐藏窗口）
- [ ] 7.2 测试隐藏窗口截图
- [ ] 7.3 测试区域选择和裁剪
- [ ] 7.4 测试预览和发送（纯图片、纯文字、图片+文字）
- [ ] 7.5 测试取消截图和关闭预览
