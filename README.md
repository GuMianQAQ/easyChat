# easyChat

一个基于 **Go + Gin + WebSocket + React + Vite + TypeScript + Electron** 构建的实时聊天项目。

项目支持账号登录、好友系统、私聊、群聊、消息收藏、消息搜索、文件中心、头像资料卡、黑名单管理、朋友圈、AI 助手、本地化设置以及桌面端运行，适合作为 Go 后端、WebSocket 通信、前后端分离和 Electron 桌面端开发的综合练习项目。

## 技术栈

### 后端

- Go
- Gin
- GORM
- SQLite
- WebSocket
- JWT 鉴权

### 前端

- React
- TypeScript
- Vite
- Electron

## 功能特性

### 用户与认证

- 用户注册、登录
- JWT 身份认证
- 用户资料修改
- 头像设置
- 登录状态保持

### 好友系统

- 搜索用户
- 添加好友
- 删除好友
- 好友资料卡
- 黑名单管理
- 私聊权限校验

### 聊天系统

- WebSocket 实时通信
- 私聊
- 群聊
- 文本消息
- 图片消息
- 截图消息
- 文件消息
- 引用消息
- 消息复制
- 消息撤回
- 消息搜索
- 查看目标消息附近上下文

### 群聊系统

- 创建群聊
- 群成员管理
- 修改群名称
- 修改群头像
- 修改群公告
- 普通成员退出群聊
- 群主解散群聊

### 收藏与文件

- 收藏消息
- 取消收藏
- 收藏列表
- 文件上传
- 文件中心
- 从收藏或文件记录跳转回原消息

### 朋友圈

- 发布动态（文字 + 图片）
- 查看好友动态流
- 点赞 / 取消点赞
- 评论 / 删除评论
- 删除自己的动态
- 查看指定用户的朋友圈

### AI 助手

- AI 对话（同步 / SSE 流式）
- 文本翻译
- 消息摘要
- 回复建议生成
- 代码生成
- 语义搜索
- 使用统计
- 群聊 AI 机器人开关
- 支持 OpenAI 和 Ollama 两种后端

### 本地体验

- 前端本地设置
- 桌面端运行
- Web 端和桌面端可同时连接同一个后端，便于使用不同账号联调测试

## 项目结构

```text
easyChat
├── main.go                 # 后端启动入口
├── API.md                  # 接口文档
├── .env.example            # AI 服务配置模板
├── internal
│   ├── ai                  # AI 助手服务（对话、翻译、摘要、代码生成）
│   ├── auth                # 认证与用户资料
│   ├── chatstore           # 会话、消息、群聊、收藏、文件等核心数据逻辑
│   ├── database            # SQLite 初始化与数据库连接
│   ├── moments             # 朋友圈（动态、点赞、评论）
│   ├── social              # 好友与黑名单相关逻辑
│   ├── webchat             # WebSocket Hub 与连接管理
│   └── webserver           # HTTP 路由、接口处理与静态资源服务
├── frontend
│   ├── src
│   │   ├── components
│   │   │   ├── chat        # 聊天界面
│   │   │   ├── contacts    # 通讯录
│   │   │   ├── favorites   # 收藏
│   │   │   ├── files       # 文件中心
│   │   │   ├── moments     # 朋友圈
│   │   │   ├── settings    # 设置
│   │   │   └── login       # 登录注册
│   │   ├── hooks           # 自定义 Hooks
│   │   ├── utils           # 工具函数
│   │   └── types           # TypeScript 类型定义
│   ├── electron            # Electron 桌面端入口与打包脚本
│   └── package.json
└── data                    # SQLite 数据库文件（运行时生成）
```

## 运行环境

需要提前安装：

- Go
- Node.js
- npm

推荐在 Windows 环境下使用 PowerShell 或 CMD 运行命令。

## 后端启动

在项目根目录执行：

```powershell
go run .
```

默认后端地址：

```text
http://127.0.0.1:8080
```

也可以通过 `-addr` 指定监听地址：

```powershell
go run . -addr 127.0.0.1:8080
```

项目默认使用 SQLite，数据库文件会保存在：

```text
data/chat.db
```

## AI 功能配置

AI 功能需要配置后端服务。复制配置模板并填入真实信息：

```powershell
cp .env.example .env
```

`.env` 文件说明：

```text
# AI 服务商：openai / ollama
EASYCHAT_AI_PROVIDER=openai

# API Key
EASYCHAT_AI_API_KEY=your-api-key-here

# 模型名称
EASYCHAT_AI_MODEL=gpt-3.5-turbo

# API 地址（留空使用默认值）
EASYCHAT_AI_BASE_URL=

# 功能开关（设为 false 关闭对应功能）
EASYCHAT_AI_ENABLE_CHAT=true
EASYCHAT_AI_ENABLE_STREAM=true
EASYCHAT_AI_ENABLE_TOOLS=true
EASYCHAT_AI_ENABLE_SEARCH=true
```

使用 Ollama 本地模型时：

```text
EASYCHAT_AI_PROVIDER=ollama
EASYCHAT_AI_BASE_URL=http://localhost:11434/v1
EASYCHAT_AI_MODEL=qwen2.5
```

AI 功能不配置时不影响其他功能正常使用。注册新账号后会自动添加 AI 好友。

## Web 前端开发运行

打开一个新的终端：

```powershell
cd frontend
npm install
npm run dev
```

默认前端开发地址：

```text
http://127.0.0.1:5173
```

开发时后端和前端需要分别启动：

```text
后端：go run .
前端：npm run dev
```

## 桌面端开发运行

桌面端不会自动启动 Go 后端。
这样可以让 Web 端和桌面端同时连接同一个后端，方便使用不同账号进行聊天测试。

先启动后端：

```powershell
go run .
```

再启动桌面端：

```powershell
cd frontend
npm install
npm run desktop:dev
```

## 构建前端

```powershell
cd frontend
npm run build
```

构建完成后，后端会在生产模式下提供前端静态资源。

```powershell
cd ..
go run .
```

## 构建桌面端

```powershell
cd frontend
npm run desktop:build
```

构建产物会输出到桌面端打包目录中。

## 接口文档

接口说明见：

```text
API.md
```

接口文档包括认证、用户资料、好友系统、会话系统、消息系统、WebSocket、文件上传、文件中心、收藏系统、朋友圈、AI 助手等模块。

## 开发说明

- 除登录、注册、验证码等接口外，大部分接口需要携带 JWT。
- WebSocket 连接通过 token 识别当前用户，不再使用昵称作为身份凭证。
- 清空聊天记录只影响当前用户，不会删除全局消息，也不会影响对方。
- 拉黑不会删除好友关系和历史消息，只会影响后续私聊权限。
- 群成员退出群聊只影响当前成员，群主解散群聊会删除群聊相关数据。
- 朋友圈动态仅对好友可见，拉黑后双方互相不可见对方动态。
- AI 助手作为系统内置好友存在，注册时自动添加，无需手动配置。
- `.env` 文件已加入 `.gitignore`，不会提交到仓库。

## 第三方说明

登录页动画参考 `guohaolian/animatedlogin`，许可证为 MIT。

详见：

```text
THIRD_PARTY_NOTICES.md
```
