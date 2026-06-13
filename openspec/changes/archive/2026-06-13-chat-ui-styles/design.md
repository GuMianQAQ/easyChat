## Context

easyChat 前端项目中，6 个聊天 UI 组件（EmojiPanel、MarkdownEditor、ContactPicker、ContactCard、MediaMenu）的交互逻辑已实现，但 CSS 样式全部缺失。组件使用了约 60+ 个 CSS 类名，均未在任何 CSS 文件中定义。同时 MessageBubble 中 contact/markdown 消息只输出纯文本，未使用已有的 ContactCard/MarkdownContent 组件。

现有样式体系：
- 全局变量定义在 `styles/global.css`（`--bg-surface`、`--text-primary`、`--border-soft` 等）
- 消息相关样式在 `styles/chat/messages.css`（已有 `.emoji-picker`、`.composer-voice-recording`、`.voice-player` 等）

## Goals / Non-Goals

**Goals:**
- 为所有缺失样式的组件补齐 CSS，使其视觉效果与现有项目风格一致
- MessageBubble 中 contact 消息使用 ContactCard 组件渲染（白底卡片设计）
- MessageBubble 中 markdown 消息使用 MarkdownContent 组件渲染
- 样式遵循微信桌面端的简洁、紧凑风格

**Non-Goals:**
- 不重构现有组件逻辑
- 不修改已有的 voice-player/voice-recorder 样式
- 不添加新的 npm 依赖
- 不改动后端代码

## Decisions

### 1. CSS 文件归属

**决定：** 所有新增样式统一写入 `styles/chat/messages.css`。

**理由：** 现有消息相关样式已在该文件中，新组件属于同一聊天输入/展示域，保持在同一文件便于维护。

### 2. EmojiPanel 布局

**决定：** 固定高度 420px 容器 + 内部滚动的分类浏览模式，底部固定 tab 切换栏。

**理由：** 参考微信桌面端表情面板，分类标题固定、内容区滚动、底部 tab 切换（表情/收藏）。固定高度确保切换 tab 时面板大小不变。

### 3. MarkdownEditor 布局

**决定：** 全屏遮罩 + 居中弹窗，上方工具栏、中间编辑/预览区、下方发送栏。

### 4. ContactPicker 布局

**决定：** 全屏遮罩 + 居中弹窗，上方搜索、下方列表。

### 5. MediaMenu

**决定：** 向上弹出（`transform: translateY(-100%)`），使用 portal 固定定位，箭头使用 ChevronRight。

### 6. ContactCard 消息渲染

**决定：** 后端仅支持 `text`、`image`、`file`、`voice` 四种 messageType。名片消息以 `"text"` 类型发送，内容格式为 `[名片] 名字\nID: userId\n微信: wechatId`。MessageBubble 通过逐行解析识别名片消息，提取 name、userId 和 wechatId，用 ContactCard 组件渲染。名片采用白底卡片设计，与文件消息保持一致的设计语言。

### 7. Markdown 消息渲染

**决定：** markdown 消息以 `"text"` 类型发送，发送时在内容前加 `[MD]\n` 前缀标记。MessageBubble 检测到此前缀后剥离，将剩余内容传入 MarkdownContent 组件渲染。

## Risks / Trade-offs

- **[CSS 类名冲突]** → 使用 BEM-like 命名前缀避免冲突。
- **[Markdown 内容前缀]** → markdown 消息使用 `[MD]\n` 前缀标记，用户复制时会包含此前缀。可接受的 trade-off，后续可在复制时剥离。
- **[弹窗 z-index 层级]** → ContactPicker 和 MarkdownEditor 使用 `z-index: 1000` 统一值。
