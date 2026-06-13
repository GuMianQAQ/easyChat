## Why

当前截图功能只支持选择区域后直接发送，无法对截图进行标注、文字说明、马赛克处理等操作。用户在分享截图时经常需要额外工具进行二次编辑，体验不连贯。需要在截图选择区域后提供图片编辑能力，让用户在一个流程内完成截图、标注、发送。

## What Changes

- 新增截图编辑器窗口，选择区域后自动打开，支持画笔、文字、箭头、矩形、圆形、马赛克等编辑工具
- 编辑器支持撤销/重做操作
- 编辑完成后导出图片返回聊天界面预览，保留原有 1MB 大小限制
- 选择器窗口选区完成后通过 IPC 将截图数据传递给编辑器窗口
- 编辑器窗口复用项目现有的 React + TypeScript 架构（通过 URL 参数 `?window=editor` 区分）

## Capabilities

### New Capabilities
- `screen-editor`: 截图编辑器，包含画笔、文字、形状、马赛克等标注工具，以及撤销/重做、导出功能

### Modified Capabilities
- `screen-capture`: 截图流程变更，选择区域后不再直接返回预览，而是先打开编辑器窗口

## Impact

- `electron/main.ts`: 新增编辑器窗口创建、IPC 通信（截图数据传递、编辑完成/取消）
- `electron/preload.ts`: 新增编辑器相关 IPC 方法暴露
- `src/App.tsx`: 新增 `?window=editor` 路由判断，渲染编辑器组件
- `src/components/ScreenEditor.tsx`: 新增编辑器主组件
- `src/components/editor/`: 新增编辑器子组件（工具栏、画布、颜色选择器等）
- 新增依赖: `fabric.js`（Canvas 编辑框架）
- `src/styles/editor.css`: 新增编辑器样式
