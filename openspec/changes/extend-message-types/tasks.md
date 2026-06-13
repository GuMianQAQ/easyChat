## 1. 后端基础准备

- [x] 1.1 在 `internal/webchat/message.go` 新增消息类型常量: ChatMessageContact, ChatMessageCode, ChatMessageMarkdown, ChatMessageLink, ChatMessageSticker, ChatMessageVideo
- [x] 1.2 在 `internal/chatstore/service.go` 创建 favorite_stickers 数据库模型 (id, user_id, image_url, created_at)
- [x] 1.3 在 `internal/chatstore/service.go` 创建 link_previews 数据库模型 (url, title, description, image, favicon, created_at, expires_at)
- [x] 1.4 在 `internal/database/database.go` 添加 favorite_stickers 和 link_previews 表的自动迁移
- [x] 1.5 审查: 调用 @explorer 审查后端基础代码，检查冗余 import、兜底逻辑、编码问题、常量定义合理性

## 2. 后端链接预览服务

- [x] 2.1 创建 `internal/linkpreview/service.go`，实现 FetchPreview(url) 函数
- [x] 2.2 实现 OG 标签解析逻辑 (og:title, og:description, og:image, favicon)
- [x] 2.3 实现缓存机制，从数据库读取和存储预览数据
- [x] 2.4 创建 `internal/webserver/linkpreview.go`，添加 GET /api/link-preview 接口
- [x] 2.5 在消息发送流程中集成链接预览抓取 (检测 URL → 异步抓取 → 存储预览)
- [x] 2.6 审查: 调用 @explorer 审查链接预览服务，检查 HTML 解析性能、缓存策略、错误处理是否干净

## 3. 后端收藏表情服务

- [x] 3.1 创建 `internal/sticker/service.go`，实现收藏表情 CRUD 操作
- [x] 3.2 创建 `internal/webserver/sticker.go`，添加 GET /api/favorite-stickers 接口
- [x] 3.3 添加 POST /api/favorite-stickers 接口 (上传收藏表情)
- [x] 3.4 添加 DELETE /api/favorite-stickers/:id 接口 (删除收藏表情)
- [x] 3.5 添加 POST /api/favorite-stickers/collect 接口 (从聊天消息收藏表情)
- [x] 3.6 审查: 调用 @explorer 审查收藏表情服务，检查 CRUD 逻辑、数据库查询效率、接口幂等性

## 4. 后端视频处理服务

- [x] 4.1 创建 `internal/video/service.go`，实现视频处理逻辑
- [x] 4.2 实现 FFmpeg 可用性检测函数 CheckFFmpeg()
- [x] 4.3 实现视频压缩函数 CompressVideo(inputPath) (720p, H.264, 2Mbps)
- [x] 4.4 实现缩略图生成函数 GenerateThumbnail(videoPath) (截取第 1 秒)
- [x] 4.5 实现视频时长和大小校验 (最大 30 秒, 最大 50MB)
- [x] 4.6 创建 `internal/webserver/upload.go`，添加 POST /api/upload/video 接口
- [x] 4.7 实现上传进度反馈机制
- [x] 4.8 审查: 调用 @explorer 审查视频处理服务，检查 FFmpeg 调用安全性、压缩参数合理性、临时文件清理

## 5. 前端类型定义

- [x] 5.1 在 `frontend/src/types/chat.ts` 扩展 ChatMessageType 类型，新增: "contact" | "code" | "markdown" | "link" | "sticker" | "video"
- [x] 5.2 定义 ContactContent 接口: { userId: string, name: string, avatar: string, wechatId: string }
- [x] 5.3 定义 CodeContent 接口: { language: string, code: string }
- [x] 5.4 定义 LinkContent 接口: { text: string, url: string, preview?: { title: string, description: string, image: string, favicon: string } }
- [x] 5.5 定义 StickerContent 接口: { stickerId: string, url: string }
- [x] 5.6 定义 VideoContent 接口: { url: string, thumbnail: string, duration: number, width: number, height: number, size: number }
- [x] 5.7 审查: 调用 @explorer 审查类型定义，检查接口字段完整性、类型覆盖、是否有遗漏或冗余字段

## 6. 前端工具栏改造

- [x] 6.1 修改 `frontend/src/components/chat/MessageComposer.tsx`，移除图片、文件、截图独立按钮
- [x] 6.2 实现新的工具栏布局: [表情] [媒体] [截图] [语音]
- [x] 6.3 实现"媒体"下拉菜单组件，包含: 文件、名片、代码、Markdown
- [x] 6.4 实现菜单项点击事件：文件->文件选择器、名片->联系人选择器、代码->代码编辑器、Markdown->切换编辑模式
- [x] 6.5 审查: 调用 @explorer 审查工具栏改造，检查按钮布局、事件处理、下拉菜单逻辑是否简洁

## 7. 前端表情面板

- [x] 7.1 创建 `frontend/src/components/chat/EmojiPanel.tsx` 表情面板组件
- [x] 7.2 实现底部工具栏: [搜索] [Emoji] [收藏] [更多]
- [x] 7.3 实现 Emoji 分类，显示系统标准 Emoji 网格
- [x] 7.4 实现收藏分类，显示用户收藏的表情列表
- [x] 7.5 实现最近使用区域，记录最近使用的表情
- [x] 7.6 实现搜索功能，支持搜索 Emoji
- [x] 7.7 实现表情点击：Emoji 插入输入框，收藏表情直接发送
- [x] 7.8 实现收藏表情上传功能，点击"+"按钮打开文件选择器
- [x] 7.9 实现收藏表情删除功能，长按显示删除选项
- [x] 7.10 将现有的 EmojiPicker 替换为新的 EmojiPanel
- [x] 7.11 审查: 调用 @explorer 审查表情面板，检查渲染性能、内存泄漏、事件绑定、样式一致性

## 8. 前端名片组件

- [x] 8.1 创建 `frontend/src/components/chat/ContactCard.tsx` 组件
- [x] 8.2 实现名片卡片布局: 左侧头像 (48x48), 右侧昵称和微信号, 底部操作按钮
- [x] 8.3 实现"添加好友"按钮，点击跳转到好友申请页面
- [x] 8.4 实现"发消息"按钮 (已是好友时显示)，点击跳转到与该用户的聊天
- [x] 8.5 创建 `frontend/src/components/chat/ContactPicker.tsx` 联系人选择器组件
- [x] 8.6 实现联系人列表，支持搜索过滤
- [x] 8.7 在 MessageBubble.tsx 中添加 contact 类型渲染分支
- [x] 8.8 审查: 调用 @explorer 审查名片组件，检查卡片布局、跳转逻辑、联系人选择器搜索性能

## 9. 前端代码片段组件

- [x] 9.1 安装依赖: npm install highlight.js @types/highlight.js
- [x] 9.2 创建 `frontend/src/components/chat/CodeBlock.tsx` 组件
- [x] 9.3 实现代码块布局: 顶部语言标签和复制按钮, 代码区域带行号和语法高亮
- [x] 9.4 实现语法高亮，按需加载语言包 (JavaScript, Python, Go, Java, TypeScript, Rust, SQL, HTML, CSS, JSON, YAML, Shell)
- [x] 9.5 实现行号显示，使用等宽字体 (Fira Code, Monaco, Consolas)
- [x] 9.6 实现复制功能，点击复制按钮将代码复制到剪贴板
- [x] 9.7 实现长代码处理，超过 20 行显示滚动区域和展开按钮
- [x] 9.8 创建 `frontend/src/components/chat/CodeEditor.tsx` 代码编辑器弹窗组件
- [x] 9.9 实现语言选择下拉框，支持 20+ 种语言
- [x] 9.10 实现代码输入区域，带行号显示
- [x] 9.11 在 MessageBubble.tsx 中添加 code 类型渲染分支
- [x] 9.12 审查: 调用 @explorer 审查代码片段组件，检查语法高亮性能、语言包按需加载、长代码滚动逻辑

## 10. 前端 Markdown 组件

- [x] 10.1 安装依赖: npm install react-markdown remark-gfm @types/react-markdown
- [x] 10.2 创建 `frontend/src/components/chat/MarkdownContent.tsx` 组件
- [x] 10.3 实现 Markdown 渲染，支持 GFM 语法 (标题, 粗体, 斜体, 列表, 链接, 代码块, 表格, 引用)
- [x] 10.4 实现安全过滤，使用 react-markdown 默认的 XSS 防护
- [x] 10.5 实现链接可点击，点击在新窗口打开
- [x] 10.6 实现代码块语法高亮 (复用 CodeBlock 组件)
- [x] 10.7 创建 `frontend/src/components/chat/MarkdownEditor.tsx` Markdown 编辑器组件
- [x] 10.8 实现工具栏，包含粗体、斜体、列表、链接、代码等按钮
- [x] 10.9 实现工具栏点击插入 Markdown 语法
- [x] 10.10 在 MessageBubble.tsx 中添加 markdown 类型渲染分支
- [x] 10.11 审查: 调用 @explorer 审查 Markdown 组件，检查 XSS 防护、渲染性能、编辑器插入逻辑

## 11. 前端链接预览组件

- [x] 11.1 创建 `frontend/src/components/chat/LinkPreview.tsx` 组件
- [x] 11.2 实现预览卡片布局: 左侧图片 (120x80), 右侧标题、描述、域名
- [x] 11.3 实现卡片点击事件，点击在浏览器打开链接
- [x] 11.4 实现图片缺失处理，无图片时只显示文字
- [x] 11.5 实现移动端适配，小屏幕改为上下布局
- [x] 11.6 在 MessageBubble.tsx 中添加 link 类型渲染分支
- [x] 11.7 审查: 调用 @explorer 审查链接预览组件，检查图片加载失败处理、响应式布局、点击事件

## 12. 前端视频组件

- [x] 12.1 创建 `frontend/src/components/chat/VideoContent.tsx` 视频消息组件
- [x] 12.2 实现视频缩略图显示，叠加播放按钮和时长标签
- [x] 12.3 实现点击播放，弹窗显示视频播放器
- [x] 12.4 创建 `frontend/src/components/chat/VideoPlayer.tsx` 视频播放器组件
- [x] 12.5 实现播放器控件: 播放/暂停、进度条、音量、全屏
- [x] 12.6 实现视频上传功能，在媒体菜单中添加视频选项
- [x] 12.7 实现上传进度条显示
- [x] 12.8 在 MessageBubble.tsx 中添加 video 类型渲染分支
- [x] 12.9 审查: 调用 @explorer 审查视频组件，检查播放器内存管理、上传进度逻辑、缩略图加载

## 13. 前端消息渲染集成

- [x] 13.1 修改 `frontend/src/components/chat/MessageBubble.tsx`，扩展渲染分支
- [x] 13.2 实现未知消息类型降级处理，显示为文本消息
- [x] 13.3 对非核心组件使用 React.lazy 懒加载
- [x] 13.4 实现各消息类型的样式统一，保持聊天气泡风格一致
- [x] 13.5 审查: 调用 @explorer 审查消息渲染集成，检查分发逻辑、懒加载配置、未知类型降级处理

## 14. API 工具函数

- [x] 14.1 在 `frontend/src/utils/chatApi.ts` 添加 fetchLinkPreview(url) 函数
- [x] 14.2 添加 fetchFavoriteStickers() 函数
- [x] 14.3 添加 uploadFavoriteSticker(file) 函数
- [x] 14.4 添加 deleteFavoriteSticker(id) 函数
- [x] 14.5 添加 collectSticker(messageId) 函数 (从聊天消息收藏)
- [x] 14.6 添加 uploadVideo(file, onProgress) 函数
- [x] 14.7 审查: 调用 @explorer 审查 API 工具函数，检查错误处理、请求取消逻辑、类型安全

## 15. 测试和优化

- [ ] 15.1 测试表情面板: Emoji 显示、收藏上传/删除、最近使用
- [ ] 15.2 测试名片消息: 发送、接收、添加好友流程
- [ ] 15.3 测试代码消息: 发送、语法高亮、复制、长代码滚动
- [ ] 15.4 测试 Markdown 消息: 发送、渲染、工具栏
- [ ] 15.5 测试链接预览: URL 检测、抓取、缓存、卡片显示
- [ ] 15.6 测试视频消息: 上传、压缩、播放、大小限制
- [ ] 15.7 测试媒体菜单: 文件、名片、代码、Markdown 入口
- [x] 15.8 性能优化: 组件懒加载、图片压缩、请求节流
- [x] 15.9 样式优化: 各消息类型在不同屏幕尺寸下的显示
- [x] 15.10 最终审查: 调用 @explorer 进行全局代码审查，检查跨组件一致性、整体性能、代码整洁度
