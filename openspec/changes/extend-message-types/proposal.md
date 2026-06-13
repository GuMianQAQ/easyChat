## Why

当前 easyChat 仅支持 4 种消息类型（text/image/file/voice），无法满足用户多样化的表达需求。在日常聊天中，用户经常需要分享代码片段、发送表情包、分享位置、预览链接等。扩展消息类型可以显著提升用户体验，使 easyChat 更接近主流聊天应用的功能水平。

## What Changes

新增 6 种消息类型，扩展聊天系统的表达能力：

- **名片分享 (contact)**: 分享其他用户的名片，接收者可直接添加好友
- **代码片段 (code)**: 发送带语法高亮的代码，支持多种编程语言
- **Markdown 消息 (markdown)**: 支持富文本格式，包括标题、列表、粗体、斜体等
- **链接预览 (link)**: 自动抓取链接的标题、描述和图片，生成预览卡片
- **收藏表情 (sticker)**: 支持收藏和发送自定义表情，类似微信表情面板
- **视频消息 (video)**: 发送视频，支持自动压缩和大小限制

## Capabilities

### New Capabilities

- `contact-message`: 名片分享功能，包括联系人选择器、名片卡片渲染、添加好友流程
- `code-message`: 代码片段功能，包括语法高亮、代码编辑器、复制功能
- `markdown-message`: Markdown 消息功能，包括 Markdown 渲染、安全过滤、编辑模式
- `link-preview`: 链接预览功能，包括 URL 检测、OG 标签抓取、预览卡片渲染
- `sticker-message`: 收藏表情功能，包括表情面板、收藏管理、Emoji 显示
- `video-message`: 视频消息功能，包括视频压缩、缩略图生成、播放器

### Modified Capabilities

- `chat-system`: 消息类型扩展，需要在现有聊天系统中集成新的消息类型处理逻辑

## Impact

**后端改动**:
- `internal/webchat/message.go`: 新增 6 种消息类型常量
- `internal/chatstore/messages.go`: 消息存储逻辑扩展
- 新增服务: `internal/linkpreview/` (链接预览爬虫)
- 新增服务: `internal/sticker/` (收藏表情管理)
- 新增服务: `internal/video/` (视频处理)
- 新增依赖: FFmpeg (视频压缩)
- 新增数据库表: `favorite_stickers`, `link_previews`

**前端改动**:
- `frontend/src/types/chat.ts`: 扩展消息类型定义
- `frontend/src/components/chat/MessageBubble.tsx`: 新增消息类型渲染分支
- 新增组件: `ContactCard.tsx`, `CodeBlock.tsx`, `MarkdownContent.tsx`, `LinkPreview.tsx`, `EmojiPanel.tsx`, `VideoContent.tsx`
- `frontend/src/components/chat/MessageComposer.tsx`: 重构工具栏，新增媒体菜单
- 新增依赖: `highlight.js`, `react-markdown`

**API 改动**:
- 新增: `GET /api/favorite-stickers` (获取收藏表情列表)
- 新增: `POST /api/favorite-stickers` (上传收藏表情)
- 新增: `DELETE /api/favorite-stickers/:id` (删除收藏表情)
- 新增: `POST /api/favorite-stickers/collect` (从聊天消息收藏表情)
- 新增: `GET /api/link-preview` (获取链接预览)
- 新增: `POST /api/upload/video` (上传视频)
- 现有消息发送接口扩展，支持新的 messageType

## Implementation Process

### Quality Gate: Task Review Protocol

**每个任务组完成后，必须调用 @explorer 进行代码审查，审查通过后才允许开始下一个任务。**

#### 审查内容

| 审查项 | 要求 |
|--------|------|
| 冗余代码 | 删除无用的 import、变量、函数、注释，禁止重复逻辑 |
| 兜底逻辑 | 禁止 fallback 兜底、临时兼容、TODO 占位、防御性空检查（除非必要） |
| 乱码/编码 | 检查中文注释、字符串、文件编码是否正确，无乱码 |
| 时空复杂度 | 算法和数据结构选择合理，无不必要的循环、拷贝、缓存 |

#### 审查流程

```
任务组 N 完成
      │
      ▼
┌─────────────────────────────┐
│  调用 @explorer 审查代码     │
│  • grep 冗余 import/变量     │
│  • grep TODO/FIXME/兜底逻辑  │
│  • 检查编码/乱码             │
│  • 评估复杂度               │
└─────────────────────────────┘
      │
      ▼
  审查通过？────否────→ 修复问题 → 重新审查
      │
      是
      │
      ▼
  任务组 N+1 开始
```

#### 审查失败处理

- 发现问题：@explorer 输出问题列表和具体位置
- 修复后：重新调用 @explorer 验证
- 连续 3 次审查失败：暂停实现，等待人工介入
