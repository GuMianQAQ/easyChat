## Context

easyChat 是一个基于 Go + React + WebSocket + Electron 的聊天应用，当前支持 4 种消息类型：text、image、file、voice。本次扩展将新增 6 种消息类型，涵盖代码分享、富文本、多媒体等场景。

### 当前架构

```
消息发送流程:
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   前端发送    │ ───▶ │  WebSocket   │ ───▶ │   后端存储    │
│              │      │   协议传输    │      │              │
│ messageType  │      │ messageType  │      │ MessageType  │
│   字段       │      │   字段       │      │   字段       │
└──────────────┘      └──────────────┘      └──────────────┘

渲染流程 (MessageBubble.tsx):
switch (message.messageType) {
  case "text":   → <TextContent />
  case "image":  → <ImageContent />
  case "file":   → <FileContent />
  case "voice":  → <VoicePlayer />
}
```

### 约束条件

- 后端使用 SQLite，单机部署，无外部数据库依赖
- 前端使用 React 18 + TypeScript，需要保持类型安全
- WebSocket 消息格式需要向后兼容
- 视频处理需要 FFmpeg，需要在部署环境中安装

## Goals / Non-Goals

**Goals:**

- 新增 6 种消息类型，覆盖主流聊天场景
- 保持现有消息系统的稳定性，新功能可选启用
- 前端组件可复用，易于扩展新消息类型
- 视频自动压缩，控制存储和带宽消耗

**Non-Goals:**

- 不实现小程序或嵌入式应用平台
- 不实现消息编辑功能（仅支持撤回）
- 不实现消息回复线程（Thread）
- 不实现表情回应（Reactions）
- 不实现输入状态指示（Typing Indicator）
- 不实现视频转码（仅压缩，不改变格式）

## Decisions

### Decision 1: 消息类型存储方式

**选择**: 在现有 Message 表的 `message_type` 字段中扩展新值

**理由**:
- 保持数据模型简单，无需新增表
- 查询逻辑统一，无需 JOIN
- 向后兼容，旧消息不受影响

**备选方案**:
- 新增 MessageExtension 表存储额外数据 → 过度设计，增加查询复杂度

### Decision 2: 工具栏布局

**选择**: 简化为 4 个按钮：表情、媒体、截图、语音

**理由**:
- 按钮过多会拥挤，影响用户体验
- 将功能相近的入口合并，减少按钮数量
- 保持核心功能独立（截图、语音使用频率高）

**工具栏布局**:
```
[表情] [媒体] [截图] [语音]
```

**表情面板** (参考微信):
```
┌─────────────────────────────────────────┐
│  [最近使用]                             │
│  [表情列表]                             │
│  ─────────────────────────────────────  │
│  [🔍] [😊] [❤️] [更多 >]               │
│   搜索  Emoji 收藏  扩展               │
└─────────────────────────────────────────┘
```

**媒体菜单**:
```
┌─────────────────────────────────────┐
│  📁 文件                            │
│  👤 名片                            │
│  💻 代码                            │
│  📝 Markdown                        │
└─────────────────────────────────────┘
```

### Decision 3: 前端组件架构

**选择**: 每种消息类型一个独立组件，MessageBubble 统一分发

**理由**:
- 职责清晰，每种类型独立开发和测试
- 便于后续扩展新类型
- 组件可复用

**组件架构**:
```
MessageBubble.tsx (分发器)
├── TextContent.tsx      (现有)
├── ImageContent.tsx     (现有)
├── FileContent.tsx      (现有)
├── VoicePlayer.tsx      (现有)
├── ContactCard.tsx      (新增)
├── CodeBlock.tsx        (新增)
├── MarkdownContent.tsx  (新增)
├── LinkPreview.tsx      (新增)
├── StickerContent.tsx   (新增)
└── VideoContent.tsx     (新增)
```

### Decision 4: 收藏表情方案

**选择**: 用户可收藏他人发送的表情，或上传自定义表情

**理由**:
- 参考微信表情面板设计
- 无需集成第三方 API
- 用户自主管理收藏内容

**功能设计**:
- 底部工具栏：搜索 | Emoji | 收藏 | 更多
- Emoji：系统标准 Unicode Emoji
- 收藏：用户收藏的表情图片，支持上传和删除
- 更多：预留扩展，后续可添加表情包系列

**数据模型**:
```go
// 用户收藏表情表
type FavoriteSticker struct {
    ID        string    `json:"id"`
    UserID    string    `json:"userId"`
    ImageURL  string    `json:"imageUrl"`
    CreatedAt time.Time `json:"createdAt"`
}
```

### Decision 5: 视频压缩方案

**选择**: 使用 FFmpeg 进行服务端压缩，限制时长和大小

**理由**:
- FFmpeg 是行业标准，压缩质量好
- 服务端压缩对客户端透明
- 可以生成缩略图

**压缩策略**:
- 最大时长: 30 秒
- 最大大小: 50MB
- 目标分辨率: 720p (1280x720)
- 编码: H.264 + AAC
- 码率: 2Mbps (视频) + 128kbps (音频)

**实现细节**:
```go
// video_service.go
func CompressVideo(inputPath string) (string, error) {
    cmd := exec.Command("ffmpeg",
        "-i", inputPath,
        "-vf", "scale=-2:720",           // 720p
        "-c:v", "libx264",               // H.264
        "-preset", "medium",             // 压缩速度
        "-crf", "23",                    // 质量
        "-c:a", "aac",                   // AAC 音频
        "-b:a", "128k",                  // 音频码率
        "-movflags", "+faststart",       // 快速播放
        "-y",                            // 覆盖输出
        outputPath,
    )
    return outputPath, cmd.Run()
}
```

### Decision 6: 链接预览方案

**选择**: 发送时抓取 OG 标签，缓存到数据库

**理由**:
- 发送时抓取，接收者无需等待
- 缓存到数据库，避免重复抓取
- 支持离线查看

**抓取策略**:
- 只抓取 HTTP/HTTPS 链接
- 超时 5 秒，失败不阻塞发送
- 缓存 7 天，过期重新抓取

**实现细节**:
```go
// link_preview.go
type LinkPreview struct {
    URL         string    `json:"url"`
    Title       string    `json:"title"`
    Description string    `json:"description"`
    Image       string    `json:"image"`
    Favicon     string    `json:"favicon"`
    CreatedAt   time.Time `json:"created_at"`
}

func FetchPreview(url string) (*LinkPreview, error) {
    // 1. 检查缓存
    // 2. 发起 HTTP 请求
    // 3. 解析 OG 标签
    // 4. 存入数据库
}
```

### Decision 7: 表情存储方案

**选择**: 存储在服务器本地，提供上传和管理接口

**理由**:
- 简单可靠，无外部依赖
- 支持自定义表情包
- 便于管理和分类

**存储结构**:
```
uploads/
├── stickers/
│   ├── default/        # 系统默认表情包
│   │   ├── 001.webp
│   │   ├── 002.webp
│   │   └── ...
│   └── custom/         # 用户自定义表情包
│       ├── user-123/
│       │   ├── 001.webp
│       │   └── ...
│       └── ...
└── ...
```

## Risks / Trade-offs

### Risk 1: 视频压缩失败

**风险**: FFmpeg 未安装或压缩失败

**缓解**:
- 启动时检测 FFmpeg 可用性
- 压缩失败时允许发送原始视频（但限制大小）
- 提供清晰的错误提示

### Risk 3: 链接预览抓取失败

**风险**: 目标网站禁止爬虫或返回异常内容

**缓解**:
- 抓取失败时静默处理，不影响消息发送
- 设置超时，避免阻塞
- 只抓取标准 OG 标签，不解析复杂页面

### Risk 4: 消息大小膨胀

**风险**: 视频、图片等大文件增加存储和带宽压力

**缓解**:
- 视频强制压缩，限制 50MB
- 图片保持现有压缩策略

### Risk 5: 前端包体积增大

**风险**: 新增依赖 (highlight.js, react-markdown 等) 增加打包体积

**缓解**:
- highlight.js 按需加载语言包
- react-markdown 使用轻量配置

## Migration Plan

### 阶段 1: 后端准备 (2天)

1. 新增消息类型常量
2. 创建新服务 (linkpreview, sticker, video)
3. 创建新数据库表
4. 安装 FFmpeg 依赖

### 阶段 2: 前端组件开发 (5天)

1. 新增消息类型组件
2. 扩展 MessageComposer
3. 集成第三方 SDK
4. 样式和交互优化

### 阶段 3: 集成测试 (2天)

1. 各消息类型端到端测试
2. 边界条件测试
3. 性能测试

### Rollback 策略

- 新消息类型与旧类型完全独立，可随时禁用
- 前端通过 feature flag 控制显示
- 后端通过配置开关控制功能

## Open Questions

1. **视频存储策略**: 是否需要定期清理旧视频？
   - 建议: 初期不清理，后续根据存储压力决定

2. **表情审核**: 用户上传的收藏表情是否需要审核？
   - 建议: 初期不审核，后续可添加举报机制

3. **链接预览隐私**: 是否需要考虑用户隐私？
   - 建议: 只在发送时抓取，不跟踪用户点击
