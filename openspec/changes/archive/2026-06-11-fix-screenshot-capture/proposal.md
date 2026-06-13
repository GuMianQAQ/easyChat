## Why

当前截图功能使用浏览器标准 API `navigator.mediaDevices.getDisplayMedia()`，但 Electron 渲染进程中该 API 不可用，导致截图功能完全无法使用。需要改用 Electron 的 `desktopCapturer` API 实现截图，并增加区域选择和预览功能。

## What Changes

- 修复截图功能：改用 Electron `desktopCapturer` API 替代浏览器 `getDisplayMedia`
- 新增区域选择：截取屏幕后显示全屏选择器，用户可框选要截取的区域
- 新增截图预览：截图后在聊天框显示预览，用户可继续输入文字，回车一起发送
- 新增隐藏窗口截图：设置中增加开关，截图前自动隐藏主窗口，支持截取被遮挡内容
- 仅支持主显示器截图

## Capabilities

### New Capabilities

- `screen-capture`: 截图功能核心能力，包括屏幕捕获、区域选择、图片预览和发送

### Modified Capabilities

（无）

## Impact

- **主进程** (`electron/main.ts`): 新增 IPC handler，desktopCapturer 调用，选择器窗口管理
- **预加载脚本** (`electron/preload.ts`): 暴露截图 API 给渲染进程
- **媒体工具** (`frontend/src/utils/media.ts`): 新增使用 IPC 的截图函数
- **聊天输入框** (`frontend/src/components/chat/MessageComposer.tsx`): 增加预览状态和 UI
- **设置页面** (`frontend/src/components/settings/SettingsDetail.tsx`): 增加隐藏窗口截图开关
- **类型定义** (`frontend/src/types/chat.ts`): UserSettings 增加字段
