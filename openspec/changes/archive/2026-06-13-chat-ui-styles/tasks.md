## 1. MediaMenu 样式

- [x] 1.1 在 `styles/chat/messages.css` 中添加 `.media-menu-container`、`.media-menu-dropdown`、`.media-menu-item` 样式

## 2. EmojiPanel 样式

- [x] 2.1 添加 `.emoji-panel` 容器样式（400px × 420px 固定尺寸）
- [x] 2.2 添加 `.emoji-panel-search` 搜索栏样式
- [x] 2.3 添加 `.emoji-panel-content` 内容区样式（固定高度可滚动）
- [x] 2.4 添加 `.emoji-category` 分类标题和 `.emoji-grid` 网格布局（每行 8 列）、`.emoji-item` 按钮样式
- [x] 2.5 添加 `.emoji-panel-footer` 和 `.emoji-toolbar-btn` 底部工具栏样式
- [x] 2.6 添加 `.sticker-grid` 收藏表情网格（每行 4 列）、`.sticker-item`、`.sticker-add`、`.sticker-delete-overlay` 样式
- [x] 2.7 添加 `.emoji-empty` 空状态和 `.emoji-search-clear` 清除按钮样式

## 3. MarkdownEditor 样式

- [x] 3.1 添加 `.markdown-editor-overlay` 遮罩层样式
- [x] 3.2 添加 `.markdown-editor` 弹窗样式（居中、白色背景、圆角阴影）
- [x] 3.3 添加 `.markdown-editor-header` 头部样式
- [x] 3.4 添加 `.markdown-editor-toolbar` 工具栏和 `.markdown-toolbar-btn` 按钮样式
- [x] 3.5 添加 `.markdown-editor-body` 和 `.markdown-editor-textarea` 编辑区样式
- [x] 3.6 添加 `.markdown-editor-preview` 预览区样式
- [x] 3.7 添加 `.markdown-editor-footer` 底部栏样式及 `.markdown-editor-send`、`.markdown-editor-preview-btn`、`.markdown-editor-close`、`.markdown-editor-hint`、`.markdown-editor-actions` 样式

## 4. ContactPicker 样式

- [x] 4.1 添加 `.contact-picker-overlay` 遮罩层样式
- [x] 4.2 添加 `.contact-picker` 弹窗样式
- [x] 4.3 添加 `.contact-picker-header` 头部样式
- [x] 4.4 添加 `.contact-picker-search` 搜索栏样式
- [x] 4.5 添加 `.contact-picker-list`、`.contact-picker-item`、`.contact-picker-info`、`.contact-picker-name`、`.contact-picker-wechatid`、`.contact-picker-empty` 样式

## 5. ContactCard 样式

- [x] 5.1 添加 `.contact-card` 白底卡片样式（圆角边框）
- [x] 5.2 添加 `.contact-card-header` 头像信息区样式及 `.contact-card-info`、`.contact-card-name`、`.contact-card-id` 样式
- [x] 5.3 添加 `.contact-card-footer` 操作区样式（含分隔线）及 `.contact-card-btn`、`.contact-card-btn-send`、`.contact-card-btn-add` 样式

## 6. MessageBubble 集成

- [x] 6.1 在 `MessageBubble.tsx` 中 import ContactCard 和 MarkdownContent 组件
- [x] 6.2 实现 contact 消息渲染逻辑：逐行解析 `[名片] name\nID: userId\n微信: wechatId`，渲染 ContactCard
- [x] 6.3 实现 markdown 消息渲染逻辑：检测 `[MD]\n` 前缀，剥离后用 MarkdownContent 渲染
- [x] 6.4 在 `styles/chat/messages.css` 中添加 `.message-contact` 和 `.message-markdown` 样式
- [x] 6.5 更新 prop chain（MessageComposer → ChatView → AppShell → createConversationActions）传递 wechatId

## 7. 整体验证

- [x] 7.1 运行 `npx tsc --noEmit -p tsconfig.app.json` 确认无类型错误
- [x] 7.2 运行 `npm run desktop:build` 确认打包成功
