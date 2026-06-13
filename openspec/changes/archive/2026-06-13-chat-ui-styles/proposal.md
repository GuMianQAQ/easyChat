## Why

Chat UI 组件（EmojiPanel、MarkdownEditor、ContactPicker、ContactCard、MediaMenu）已实现交互逻辑，但全部缺少 CSS 样式定义，导致渲染为无样式的原始 HTML。同时 MessageBubble 中名片和 Markdown 消息未使用对应组件（ContactCard、MarkdownContent）渲染，只输出纯文本。

## What Changes

- 为 EmojiPanel 补齐完整样式（面板布局、分类标题、表情网格、搜索栏、底部工具栏、收藏表情网格）
- 为 MarkdownEditor 补齐完整样式（遮罩层、弹窗、工具栏、文本区、预览区、底部栏）
- 为 ContactPicker 补齐完整样式（遮罩层、弹窗、搜索栏、联系人列表项）
- 为 ContactCard 补齐完整样式（白底卡片、头像区、信息区、分隔线、操作按钮）
- 为 MediaMenu 补齐完整样式（容器、下拉菜单、菜单项）
- MessageBubble 中名片消息集成 ContactCard 组件渲染
- MessageBubble 中 Markdown 消息集成 MarkdownContent 组件渲染
- 补齐 `.message-contact` 和 `.message-markdown` 气泡样式
- EmojiPanel 固定高度 420px，切换 tab 大小不变
- MediaMenu 下拉箭头改为 ChevronRight

## Capabilities

### New Capabilities
- `emoji-panel-styles`: EmojiPanel 组件完整样式，含分类浏览、搜索、最近使用、收藏表情
- `markdown-editor-styles`: MarkdownEditor 弹窗完整样式，含工具栏、编辑区、预览切换
- `contact-picker-styles`: ContactPicker 弹窗完整样式，含搜索和联系人列表
- `contact-card-styles`: ContactCard 卡片样式，用于消息气泡内展示名片信息
- `media-menu-styles`: MediaMenu 下拉菜单样式
- `message-bubble-extensions`: MessageBubble 中 contact/markdown 消息类型渲染逻辑

### Modified Capabilities

（无已有 spec 需要修改）

## Impact

- `frontend/src/styles/chat/messages.css` — 新增约 80+ 个 CSS 类名
- `frontend/src/components/chat/MessageBubble.tsx` — 集成 ContactCard 和 MarkdownContent
- `frontend/src/components/chat/MediaMenu.tsx` — ChevronDown → ChevronRight
- `frontend/src/app/createConversationActions.ts` — 名片消息格式加入 wechatId，Markdown 加 `[MD]` 前缀
- `frontend/src/components/chat/MessageComposer.tsx`、`ChatView.tsx`、`AppShell.tsx` — onSendContact 类型加 wechatId
- 不涉及后端改动
- 不涉及 breaking changes
