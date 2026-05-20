# MyChat

一个基于 Go、Gin、WebSocket、React、Vite 和 TypeScript 的聊天程序。

## 运行

开发：

```bash
go run .
cd frontend
npm.cmd install
npm.cmd run dev
```

生产：

```bash
cd frontend
npm.cmd install
npm.cmd run build
cd ..
go run .
```

默认地址：

- 前端开发服务器：`http://127.0.0.1:5173`
- Gin：`http://127.0.0.1:8080`

## 功能

- 登录、记住昵称、头像
- WebSocket 实时聊天
- 文本、截图、图片消息
- 引用、复制、收藏、本地删除、撤回
- 通讯录、收藏、文件、本地设置

## 说明

- 文件页只做本地预览，不上传。
- 通讯录和收藏数据保存在 `localStorage`。
- 登录页动画参考 `guohaolian/animatedlogin`，许可证为 MIT。

详见 [THIRD_PARTY_NOTICES.md](D:/GoItem/easyChat/THIRD_PARTY_NOTICES.md)。
