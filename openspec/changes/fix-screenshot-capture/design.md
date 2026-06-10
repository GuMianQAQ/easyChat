## Context

当前截图功能实现位于 `frontend/src/utils/media.ts` 的 `captureDisplayFrame()` 函数，使用浏览器标准 API `navigator.mediaDevices.getDisplayMedia()`。该 API 在 Electron 渲染进程中不可用（即使 `sandbox: false`），导致截图功能完全失效。

现有架构：
- 主进程：`electron/main.ts` - 窗口管理、IPC handler
- 预加载：`electron/preload.ts` - 通过 contextBridge 暴露 API
- 渲染进程：`frontend/src/` - React UI
- 设置系统：`UserSettings` 对象，存储在 localStorage

## Goals / Non-Goals

**Goals:**
- 修复截图功能，使用 Electron desktopCapturer API
- 支持区域选择（全屏选择器框选）
- 截图后在聊天框预览，可继续输入文字一起发送
- 支持隐藏窗口截图（设置开关）
- 仅支持主显示器

**Non-Goals:**
- 多显示器支持
- 截图编辑（标注、画笔）
- 视频录制
- 滚动截图

## Decisions

### 1. 使用 desktopCapturer 而非 getDisplayMedia

**决策**: 使用 Electron 的 `desktopCapturer.getSources({ types: ['screen'] })` 获取屏幕图片

**原因**: 
- `getDisplayMedia` 在 Electron 渲染进程中不可靠
- `desktopCapturer` 是 Electron 官方推荐方案
- 可以在主进程中完全控制捕获流程

**替代方案**: 
- 注册全局快捷键 + 系统截图 API → 复杂度高，跨平台兼容性差
- 使用第三方截图库 → 增加依赖，不必要

### 2. 全屏选择器使用独立 BrowserWindow

**决策**: 创建一个新的无边框透明窗口作为区域选择器

**原因**:
- 可以覆盖整个屏幕，不受主窗口大小限制
- 独立窗口不会与主窗口 UI 冲突
- 选择完成后直接关闭，干净利落

**替代方案**:
- 在主窗口内用 CSS 覆盖层 → 主窗口不是全屏时会有问题
- 使用 HTML5 Canvas 在渲染进程中处理 → 需要传递大量图片数据

### 3. 预览状态管理在 MessageComposer 组件内

**决策**: 在 MessageComposer 组件内新增 `screenshotPreview` 状态

**原因**:
- 预览只与当前输入框相关，不需要全局状态
- 与现有的 quote 预览模式一致
- 切换会话时自动清除预览

**替代方案**:
- 全局状态管理 → 过度设计
- 在 createConversationActions 中管理 → 职责不清

### 4. 隐藏窗口截图通过设置控制

**决策**: 在 UserSettings 中增加 `hideWindowOnCapture` 布尔字段，默认 false

**原因**: 
- 用户可能不想每次都隐藏窗口
- 与现有的设置风格一致（Switch 开关）

### 5. 截图后直接发送 vs 预览后发送

**决策**: 截图后显示预览，用户可以继续输入文字，回车时一起发送

**原因**:
- 用户明确要求此交互方式
- 更灵活，可以先截图再补充说明

## Risks / Trade-offs

**[风险] desktopCapturer 权限问题** 
→ Electron 默认允许 desktopCapturer，无需额外权限请求。如果用户系统有特殊限制，会在调用时报错，可以捕获并提示。

**[风险] 全屏选择器窗口与截图时序**
→ 隐藏窗口后需要延迟一小段时间（300ms）再截图，确保窗口完全隐藏。选择器窗口创建时不能截到自己。

**[风险] 大图片传输性能**
→ 屏幕截图可能很大（1920x1080），通过 IPC 传输 base64 字符串可能较慢。
→ 缓解：desktopCapturer 支持指定 thumbnailSize，可以先获取较小尺寸，选择区域后再获取原始尺寸。

**[权衡] 区域选择器的用户体验**
→ 全屏选择器需要用户学习如何使用（拖拽选择）
→ 缓解：提供清晰的视觉提示和操作说明

## Migration Plan

1. 修改 UserSettings 类型，增加 `hideWindowOnCapture` 字段
2. 实现主进程 desktopCapturer 调用
3. 实现全屏选择器窗口
4. 修改渲染进程截图流程
5. 增加预览 UI
6. 设置页面增加开关

无需数据迁移，新字段有默认值。

## Open Questions

无
