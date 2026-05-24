# easyChat

一个基于 **Go + Gin + WebSocket + React + Vite + TypeScript + Electron** 构建的实时聊天项目。

项目支持账号登录、好友系统、私聊、群聊、消息收藏、消息搜索、文件中心、头像资料卡、黑名单管理、本地化设置以及桌面端运行，适合作为 Go 后端、WebSocket 通信、前后端分离和 Electron 桌面端开发的综合练习项目。

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

### 本地体验

- 前端本地设置
- 桌面端运行
- Web 端和桌面端可同时连接同一个后端，便于使用不同账号联调测试

## 项目结构

```text
easyChat
├── main.go                 # 后端启动入口
├── API.md                  # 接口文档
├── internal
│   ├── auth                # 认证与用户资料
│   ├── chatstore           # 会话、消息、群聊、收藏、文件等核心数据逻辑
│   ├── database            # SQLite 初始化与数据库连接
│   ├── social              # 好友与黑名单相关逻辑
│   ├── webchat             # WebSocket Hub 与连接管理
│   └── webserver           # HTTP 路由、接口处理与静态资源服务
└── frontend
    ├── src                 # React 前端源码
    ├── electron            # Electron 桌面端入口与打包脚本
    └── package.json
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

接口文档包括认证、用户资料、好友系统、会话系统、消息系统、WebSocket、文件上传、文件中心、收藏系统等模块。

## 开发说明

- 除登录、注册、验证码等接口外，大部分接口需要携带 JWT。
- WebSocket 连接通过 token 识别当前用户，不再使用昵称作为身份凭证。
- 清空聊天记录只影响当前用户，不会删除全局消息，也不会影响对方。
- 拉黑不会删除好友关系和历史消息，只会影响后续私聊权限。
- 群成员退出群聊只影响当前成员，群主解散群聊会删除群聊相关数据。

## 第三方说明

登录页动画参考 `guohaolian/animatedlogin`，许可证为 MIT。

详见：

```text
THIRD_PARTY_NOTICES.md
```
