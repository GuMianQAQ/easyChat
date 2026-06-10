# easyChat 接口文档

## 1. 基本说明

本项目后端基于 **Go + Gin**，接口默认返回 JSON。

### 开发环境地址

```text
http://127.0.0.1:8080
```

启动方式：

```powershell
go run .
```

可通过 `-addr` 指定监听地址：

```powershell
go run . -addr 127.0.0.1:8080
```

### 认证方式

除登录、注册、验证码外，大部分接口都需要携带 JWT：

```http
Authorization: Bearer <token>
```

### 通用返回格式

成功响应：

```json
{
  "message": "操作成功",
  "data": {}
}
```

列表接口：

```json
{
  "items": [],
  "total": 0
}
```

失败响应：

```json
{
  "error": "错误信息"
}
```

### 通用状态码

| 状态码 | 含义 | 说明 |
|--------|------|------|
| 200 | 请求成功 | - |
| 400 | 请求参数错误 | 参数校验失败或业务逻辑错误 |
| 401 | 未登录或登录已过期 | 需要重新登录或刷新 token |
| 403 | 无权限 | 没有访问该资源的权限 |
| 404 | 资源不存在 | - |
| 500 | 服务器错误 | 服务端内部错误 |

### 主要模块

- 用户认证
- 用户资料
- 好友系统
- 会话系统
- 消息系统
- 群聊管理
- WebSocket
- 文件上传
- 文件中心
- 收藏系统
- 朋友圈
- 投票系统
- 接龙系统
- AI 助手

---

## 2. 路由清单

### 认证相关

| 功能 | 方法 | 路径 | 是否登录 | 说明 |
|------|------|------|----------|------|
| 获取验证码 | GET | /api/captcha | 否 | 获取图片验证码 |
| 用户注册 | POST | /api/auth/register | 否 | 注册新账号 |
| 用户登录 | POST | /api/auth/login | 否 | 登录获取 token |

### 用户相关

| 功能 | 方法 | 路径 | 是否登录 | 说明 |
|------|------|------|----------|------|
| 获取用户资料 | GET | /api/users/me/profile | 是 | 获取当前用户详细资料 |
| 修改用户资料 | PUT | /api/users/me/profile | 是 | 修改当前用户资料 |
| 修改密码 | PUT | /api/users/me/password | 是 | 修改密码后需要重新登录 |
| 搜索用户 | GET | /api/users/search?username=xxx | 是 | 通过账号精确搜索 |
| 获取指定用户资料 | GET | /api/users/:id/profile | 是 | 获取指定用户资料 |
| 获取隐私设置 | GET | /api/users/me/privacy | 是 | 获取当前用户隐私设置 |
| 修改隐私设置 | PUT | /api/users/me/privacy | 是 | 修改隐私设置 |

### 好友相关

| 功能 | 方法 | 路径 | 是否登录 | 说明 |
|------|------|------|----------|------|
| 发送好友申请 | POST | /api/friend-requests | 是 | 向其他用户发送好友申请 |
| 获取好友申请列表 | GET | /api/friend-requests | 是 | 获取收到的好友申请 |
| 接受好友申请 | POST | /api/friend-requests/:id/accept | 是 | 接受好友申请 |
| 拒绝好友申请 | POST | /api/friend-requests/:id/reject | 是 | 拒绝好友申请 |
| 获取好友列表 | GET | /api/friends | 是 | 获取所有好友 |
| 修改好友信息 | PUT | /api/friends/:friendId | 是 | 修改好友备注、标签等 |
| 删除好友 | DELETE | /api/friends/:friendId | 是 | 删除好友关系 |
| 拉黑好友 | POST | /api/friends/:friendId/block | 是 | 将好友加入黑名单 |
| 解除拉黑 | POST | /api/friends/:friendId/unblock | 是 | 将好友移出黑名单 |
| 获取黑名单 | GET | /api/friends/blocked | 是 | 获取拉黑的好友列表 |

### 会话相关

| 功能 | 方法 | 路径 | 是否登录 | 说明 |
|------|------|------|----------|------|
| 获取会话列表 | GET | /api/conversations | 是 | 获取所有会话 |
| 创建私聊会话 | POST | /api/conversations/private | 是 | 创建或打开私聊会话 |
| 创建群聊会话 | POST | /api/conversations/group | 是 | 创建群聊会话 |
| 获取群聊信息 | GET | /api/conversations/:id/group | 是 | 获取群聊详细信息 |
| 修改群聊设置 | PATCH | /api/conversations/:id/group | 是 | 修改群名称、公告等 |
| 删除会话 | DELETE | /api/conversations/:id | 是 | 删除会话（仅自己） |
| 清空聊天记录 | POST | /api/conversations/:id/clear | 是 | 清空聊天记录（仅自己） |
| 标为已读 | POST | /api/conversations/:id/read | 是 | 标记会话为已读 |
| 修改会话设置 | PATCH | /api/conversations/:id/settings | 是 | 修改置顶、免打扰等 |

### 群聊管理

| 功能 | 方法 | 路径 | 是否登录 | 说明 |
|------|------|------|----------|------|
| 退出群聊 | POST | /api/conversations/:id/group/leave | 是 | 普通成员退出群聊 |
| 解散群聊 | DELETE | /api/conversations/:id/group | 是 | 群主解散群聊 |
| 设置管理员 | POST | /api/conversations/:id/group/admin | 是 | 群主设置管理员 |
| 撤销管理员 | DELETE | /api/conversations/:id/group/admin/:userId | 是 | 群主撤销管理员 |
| 转让群主 | POST | /api/conversations/:id/group/transfer | 是 | 群主转让群主 |
| 禁言成员 | POST | /api/conversations/:id/group/mute | 是 | 管理员禁言成员 |
| 解除禁言 | POST | /api/conversations/:id/group/unmute | 是 | 管理员解除禁言 |
| 获取群权限 | GET | /api/conversations/:id/group/permissions | 是 | 获取群聊权限设置 |
| 修改群权限 | PUT | /api/conversations/:id/group/permissions | 是 | 群主修改群权限 |
| 置顶消息 | POST | /api/conversations/:id/group/pin | 是 | 管理员置顶消息 |
| 取消置顶 | DELETE | /api/conversations/:id/group/pin/:messageId | 是 | 管理员取消置顶 |
| 获取置顶消息 | GET | /api/conversations/:id/group/pins | 是 | 获取置顶消息列表 |
| 获取群文件 | GET | /api/conversations/:id/files | 是 | 获取群内文件列表 |
| 获取群图片 | GET | /api/conversations/:id/images | 是 | 获取群内图片列表 |
| 生成邀请链接 | POST | /api/conversations/:id/group/invites | 是 | 生成群邀请链接 |
| 获取邀请链接 | GET | /api/conversations/:id/group/invites | 是 | 获取邀请链接列表 |
| 删除邀请链接 | DELETE | /api/conversations/:id/group/invites/:inviteId | 是 | 删除邀请链接 |
| 通过邀请加入 | POST | /api/conversations/group/join/:code | 是 | 通过邀请码加入群聊 |
| 添加群成员 | POST | /api/conversations/:id/group/members | 是 | 邀请好友加入群聊 |
| 群机器人开关 | PATCH | /api/groups/:id/bot | 是 | 开关群 AI 机器人 |

### 消息相关

| 功能 | 方法 | 路径 | 是否登录 | 说明 |
|------|------|------|----------|------|
| 获取消息历史 | GET | /api/messages | 是 | 获取会话消息列表 |
| 获取目标消息附近记录 | GET | /api/messages/around | 是 | 获取指定消息附近的消息 |
| 撤回消息 | POST | /api/messages/:messageId/revoke | 是 | 撤回自己发送的消息 |

### 文件相关

| 功能 | 方法 | 路径 | 是否登录 | 说明 |
|------|------|------|----------|------|
| 上传图片 | POST | /api/upload | 是 | 上传图片文件 |
| 上传文件 | POST | /api/upload/file | 是 | 上传普通文件 |
| 获取文件列表 | GET | /api/files | 是 | 获取文件中心列表 |

### 收藏相关

| 功能 | 方法 | 路径 | 是否登录 | 说明 |
|------|------|------|----------|------|
| 收藏消息 | POST | /api/favorites | 是 | 收藏一条消息 |
| 取消收藏 | DELETE | /api/favorites/:id | 是 | 通过收藏 ID 取消收藏 |
| 取消收藏 | DELETE | /api/favorites/message/:messageId | 是 | 通过消息 ID 取消收藏 |
| 获取收藏列表 | GET | /api/favorites | 是 | 获取收藏列表 |

### 朋友圈

| 功能 | 方法 | 路径 | 是否登录 | 说明 |
|------|------|------|----------|------|
| 获取动态流 | GET | /api/moments/feed | 是 | 获取朋友圈动态 |
| 发布动态 | POST | /api/moments | 是 | 发布新动态 |
| 删除动态 | DELETE | /api/moments/:id | 是 | 删除自己的动态 |
| 点赞 | POST | /api/moments/:id/like | 是 | 点赞动态 |
| 取消点赞 | DELETE | /api/moments/:id/like | 是 | 取消点赞 |
| 评论 | POST | /api/moments/:id/comments | 是 | 评论动态 |
| 删除评论 | DELETE | /api/moments/comments/:id | 是 | 删除评论 |

### 投票系统

| 功能 | 方法 | 路径 | 是否登录 | 说明 |
|------|------|------|----------|------|
| 获取投票列表 | GET | /api/conversations/:id/votes | 是 | 获取会话中的投票列表 |
| 创建投票 | POST | /api/conversations/:id/votes | 是 | 在会话中创建投票 |
| 获取投票详情 | GET | /api/votes/:voteId | 是 | 获取投票详情 |
| 投票 | POST | /api/votes/:voteId/vote | 是 | 参与投票 |
| 取消投票 | DELETE | /api/votes/:voteId/vote | 是 | 取消投票 |

### 接龙系统

| 功能 | 方法 | 路径 | 是否登录 | 说明 |
|------|------|------|----------|------|
| 获取接龙列表 | GET | /api/conversations/:id/solitaires | 是 | 获取会话中的接龙列表 |
| 创建接龙 | POST | /api/conversations/:id/solitaires | 是 | 在会话中创建接龙 |
| 获取接龙详情 | GET | /api/solitaires/:solitaireId | 是 | 获取接龙详情 |
| 参与接龙 | POST | /api/solitaires/:solitaireId/join | 是 | 参与接龙 |
| 修改接龙条目 | PUT | /api/solitaires/:solitaireId/items/:itemId | 是 | 修改自己的接龙内容 |

### 群相册

| 功能 | 方法 | 路径 | 是否登录 | 说明 |
|------|------|------|----------|------|
| 创建相册 | POST | /api/conversations/:id/albums | 是 | 创建群相册 |
| 获取相册列表 | GET | /api/conversations/:id/albums | 是 | 获取群内所有相册 |
| 获取相册详情 | GET | /api/conversations/:id/albums/:albumId | 是 | 获取相册详细信息 |
| 修改相册 | PUT | /api/conversations/:id/albums/:albumId | 是 | 修改相册名称等 |
| 删除相册 | DELETE | /api/conversations/:id/albums/:albumId | 是 | 删除相册 |
| 上传照片 | POST | /api/conversations/:id/albums/:albumId/photos | 是 | 向相册上传照片 |
| 获取相册照片 | GET | /api/conversations/:id/albums/:albumId/photos | 是 | 获取相册内照片 |
| 删除照片 | DELETE | /api/conversations/:id/albums/:albumId/photos/:photoId | 是 | 删除相册中的照片 |
| 批量删除照片 | POST | /api/conversations/:id/albums/:albumId/photos/batch-delete | 是 | 批量删除相册照片 |
| 获取会话全部相册照片 | GET | /api/conversations/:id/album-photos | 是 | 获取会话所有相册照片 |
| 获取我的相册照片 | GET | /api/conversations/:id/album-photos/mine | 是 | 获取自己上传的相册照片 |

### AI 助手

| 功能 | 方法 | 路径 | 是否登录 | 说明 |
|------|------|------|----------|------|
| SSE 流式对话 | GET | /api/ai/stream | 是 | 流式 AI 对话 |
| 同步对话 | POST | /api/ai/chat | 是 | 同步 AI 对话 |
| 翻译 | POST | /api/ai/translate | 是 | AI 翻译 |
| 摘要 | POST | /api/ai/summarize | 是 | AI 生成摘要 |
| 补全 | POST | /api/ai/complete | 是 | AI 文本补全 |
| 预测问题 | POST | /api/ai/predict-question | 是 | AI 预测问题 |
| 语义搜索 | GET | /api/ai/search | 是 | AI 语义搜索 |
| 使用统计 | GET | /api/ai/stats | 是 | 获取 AI 使用统计 |

### WebSocket

| 功能 | 方法 | 路径 | 是否登录 | 说明 |
|------|------|------|----------|------|
| 建立连接 | GET | /ws?token=xxx | 是 | WebSocket 连接 |

---

## 3. 用户认证接口

### 3.1 获取图片验证码

- **接口地址**：`GET /api/captcha`
- **是否鉴权**：否

##### 入参

无参数

##### 出参

```json
{
  "captchaId": "xxx",
  "image": "data:image/png;base64,..."
}
```

| 字段 | 类型 | 中文名称 | 说明 |
|------|------|----------|------|
| captchaId | string | 验证码 ID | 注册时需要提交 |
| image | string | 验证码图片 | Base64 编码的图片 |

##### curl 示例

```bash
curl -X GET 'http://127.0.0.1:8080/api/captcha'
```

---

### 3.2 用户注册

- **接口地址**：`POST /api/auth/register`
- **是否鉴权**：否

##### 入参

```json
{
  "username": "test001",
  "password": "123456",
  "confirmPassword": "123456",
  "nickname": "顾眠",
  "avatar": "/uploads/avatar.png",
  "captchaId": "xxx",
  "captchaCode": "abcd"
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| username | string | 是 | test001 | 用户名 | 登录账号 | 必须唯一，建议 3-20 位字母数字 |
| password | string | 是 | 123456 | 密码 | 登录密码 | 建议 6-32 位，后端使用 bcrypt 加密 |
| confirmPassword | string | 是 | 123456 | 确认密码 | 再次输入密码 | 必须与 password 一致 |
| nickname | string | 是 | 顾眠 | 显示昵称 | 用户昵称 | 建议 1-20 位 |
| avatar | string | 否 | /uploads/avatar.png | 头像 | 头像地址 | 为空时使用默认头像 |
| captchaId | string | 是 | xxx | 验证码 ID | 从 /api/captcha 获取 | 验证成功后失效 |
| captchaCode | string | 是 | abcd | 验证码 | 图片中的文字 | 大小写敏感 |

##### 出参

```json
{
  "token": "jwt-token",
  "user": {
    "id": "u1",
    "username": "test001",
    "nickname": "顾眠",
    "avatar": "/uploads/avatar.png"
  }
}
```

| 字段 | 类型 | 中文名称 | 说明 |
|------|------|----------|------|
| token | string | 访问令牌 | JWT token，后续请求需要携带 |
| user | object | 用户信息 | 注册成功的用户信息 |
| user.id | string | 用户 ID | 用户唯一标识 |
| user.username | string | 用户名 | 登录账号 |
| user.nickname | string | 显示昵称 | 用户昵称 |
| user.avatar | string | 头像 | 头像地址 |

##### 常见错误

| 错误信息 | 原因 | 处理建议 |
|----------|------|----------|
| 用户名已存在 | username 重复 | 提示用户更换用户名 |
| 验证码错误 | captchaCode 不正确 | 刷新验证码重新输入 |
| 请求格式错误 | JSON 格式错误 | 检查请求体格式 |

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/auth/register' \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "test001",
    "password": "123456",
    "confirmPassword": "123456",
    "nickname": "顾眠",
    "captchaId": "xxx",
    "captchaCode": "abcd"
  }'
```

---

### 3.3 用户登录

- **接口地址**：`POST /api/auth/login`
- **是否鉴权**：否

##### 入参

```json
{
  "username": "test001",
  "password": "123456"
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| username | string | 是 | test001 | 用户名 | 登录账号 | - |
| password | string | 是 | 123456 | 密码 | 登录密码 | 不要打印到日志 |

##### 出参

```json
{
  "token": "jwt-token",
  "user": {
    "id": "u1",
    "username": "test001",
    "nickname": "顾眠",
    "avatar": "/uploads/avatar.png"
  }
}
```

| 字段 | 类型 | 中文名称 | 说明 |
|------|------|----------|------|
| token | string | 访问令牌 | JWT token，有效期见配置 |
| user | object | 用户信息 | 登录成功的用户信息 |

##### 常见错误

| 错误信息 | 原因 | 处理建议 |
|----------|------|----------|
| 用户名或密码错误 | 账号密码不匹配 | 提示用户检查输入 |
| 请求格式错误 | JSON 格式错误 | 检查请求体格式 |

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "test001",
    "password": "123456"
  }'
```

---

### 3.4 获取当前用户资料

- **接口地址**：`GET /api/users/me/profile`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 出参

```json
{
  "user": {
    "id": "u1",
    "username": "test001",
    "nickname": "顾眠",
    "avatar": "/uploads/avatar.png",
    "gender": "unknown",
    "region": "广东 深圳",
    "signature": "个性签名"
  }
}
```

| 字段 | 类型 | 中文名称 | 说明 |
|------|------|----------|------|
| user.id | string | 用户 ID | 用户唯一标识 |
| user.username | string | 用户名 | 登录账号 |
| user.nickname | string | 显示昵称 | 用户昵称 |
| user.avatar | string | 头像 | 头像地址 |
| user.gender | string | 性别 | male/female/unknown |
| user.region | string | 地区 | 用户设置的地区 |
| user.signature | string | 个性签名 | 用户签名 |

##### curl 示例

```bash
curl -X GET 'http://127.0.0.1:8080/api/users/me/profile' \
  -H 'Authorization: Bearer <token>'
```

---

### 3.5 修改密码

- **接口地址**：`PUT /api/users/me/password`
- **是否鉴权**：是
- **使用场景**：用户修改密码，修改后需要重新登录

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 入参

```json
{
  "oldPassword": "123456",
  "newPassword": "abcdef123",
  "confirmPassword": "abcdef123"
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| oldPassword | string | 是 | 123456 | 旧密码 | 当前密码 | 不要打印到日志 |
| newPassword | string | 是 | abcdef123 | 新密码 | 新设置的密码 | 建议 6-32 位，不能与旧密码相同 |
| confirmPassword | string | 是 | abcdef123 | 确认密码 | 再次输入新密码 | 必须与 newPassword 一致 |

##### 出参

```json
{
  "message": "密码修改成功，请重新登录"
}
```

##### 常见错误

| 错误信息 | 原因 | 处理建议 |
|----------|------|----------|
| 旧密码错误 | 旧密码不正确 | 提示用户检查旧密码 |
| 新密码不能与旧密码相同 | 新旧密码相同 | 提示用户更换新密码 |
| 登录已过期，请重新登录 | token 过期 | 跳转到登录页 |

##### curl 示例

```bash
curl -X PUT 'http://127.0.0.1:8080/api/users/me/password' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "oldPassword": "123456",
    "newPassword": "abcdef123",
    "confirmPassword": "abcdef123"
  }'
```

---

### 3.6 修改用户资料

- **接口地址**：`PUT /api/users/me/profile`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 入参

```json
{
  "nickname": "新昵称",
  "avatar": "/uploads/new-avatar.png",
  "gender": "male",
  "region": "北京 海淀",
  "signature": "新的个性签名"
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| nickname | string | 否 | 新昵称 | 显示昵称 | 用户昵称 | 1-20 位 |
| avatar | string | 否 | /uploads/new-avatar.png | 头像 | 头像地址 | 先上传获取地址 |
| gender | string | 否 | male | 性别 | male/female/unknown | - |
| region | string | 否 | 北京 海淀 | 地区 | 用户地区 | - |
| signature | string | 否 | 新的个性签名 | 个性签名 | 用户签名 | - |

##### 出参

```json
{
  "user": {
    "id": "u1",
    "username": "test001",
    "nickname": "新昵称",
    "avatar": "/uploads/new-avatar.png",
    "gender": "male",
    "region": "北京 海淀",
    "signature": "新的个性签名"
  }
}
```

##### curl 示例

```bash
curl -X PUT 'http://127.0.0.1:8080/api/users/me/profile' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "nickname": "新昵称",
    "gender": "male",
    "region": "北京 海淀"
  }'
```

---

## 4. 用户搜索接口

### 4.1 通过账号精确搜索用户

- **接口地址**：`GET /api/users/search?username=test001`
- **是否鉴权**：是
- **使用场景**：添加好友时搜索用户

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### Query 参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| username | 是 | test001 | 要搜索的用户名 |

##### 出参

```json
{
  "user": {
    "id": "u1",
    "username": "test001",
    "nickname": "顾眠",
    "avatar": "/uploads/avatar.png",
    "region": "广东 深圳",
    "isSelf": false,
    "isFriend": false,
    "requestStatus": "none",
    "requestId": ""
  }
}
```

| 字段 | 类型 | 中文名称 | 说明 |
|------|------|----------|------|
| user.id | string | 用户 ID | 用户唯一标识 |
| user.username | string | 用户名 | 登录账号 |
| user.nickname | string | 显示昵称 | 用户昵称 |
| user.avatar | string | 头像 | 头像地址 |
| user.region | string | 地区 | 用户地区 |
| user.isSelf | boolean | 是否是自己 | 是否为当前登录用户 |
| user.isFriend | boolean | 是否是好友 | 是否已经是好友 |
| user.requestStatus | string | 申请状态 | none/pending/accepted |
| user.requestId | string | 申请 ID | 好友申请 ID |

##### 常见错误

| 错误信息 | 原因 | 处理建议 |
|----------|------|----------|
| 未找到该用户 | 用户不存在或关闭搜索 | 提示用户检查用户名 |

##### curl 示例

```bash
curl -X GET 'http://127.0.0.1:8080/api/users/search?username=test001' \
  -H 'Authorization: Bearer <token>'
```

---

## 5. 好友申请接口

### 5.1 发送好友申请

- **接口地址**：`POST /api/friend-requests`
- **是否鉴权**：是
- **使用场景**：向其他用户发送好友申请

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 入参

```json
{
  "toUserId": "u2",
  "message": "你好，我是顾眠"
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| toUserId | string | 是 | u2 | 目标用户 ID | 要添加的用户 ID | 不能是自己 |
| message | string | 否 | 你好，我是顾眠 | 验证消息 | 好友申请附带的消息 | 可以为空 |

##### 出参

```json
{
  "requestId": "r1",
  "fromUserId": "u1",
  "toUserId": "u2",
  "message": "你好，我是顾眠",
  "status": "pending",
  "createdAt": "2026-05-19T12:00:00Z"
}
```

| 字段 | 类型 | 中文名称 | 说明 |
|------|------|----------|------|
| requestId | string | 申请 ID | 好友申请唯一标识 |
| fromUserId | string | 发起者 ID | 发送申请的用户 ID |
| toUserId | string | 目标用户 ID | 接收申请的用户 ID |
| message | string | 验证消息 | 申请附带的消息 |
| status | string | 状态 | pending/accepted/rejected |
| createdAt | string | 创建时间 | ISO 8601 格式 |

##### 常见错误

| 错误信息 | 原因 | 处理建议 |
|----------|------|----------|
| 不能添加自己 | toUserId 是自己 | 提示用户 |
| 对方不允许添加 | 对方关闭了好友申请 | 提示用户 |
| 已经是好友 | 双方已经是好友 | 提示用户 |

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/friend-requests' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "toUserId": "u2",
    "message": "你好，我是顾眠"
  }'
```

---

### 5.2 获取好友申请列表

- **接口地址**：`GET /api/friend-requests`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 出参

```json
{
  "items": [
    {
      "requestId": "r1",
      "fromUserId": "u1",
      "fromUsername": "test001",
      "fromNickname": "顾眠",
      "fromAvatar": "/uploads/a.png",
      "message": "你好，我是顾眠",
      "status": "pending",
      "direction": "received",
      "createdAt": "2026-05-19T12:00:00Z"
    }
  ]
}
```

| 字段 | 类型 | 中文名称 | 说明 |
|------|------|----------|------|
| items | array | 申请列表 | 好友申请列表 |
| items[].requestId | string | 申请 ID | 好友申请唯一标识 |
| items[].fromUserId | string | 发起者 ID | 发送申请的用户 ID |
| items[].fromUsername | string | 发起者用户名 | 发送申请的用户名 |
| items[].fromNickname | string | 发起者昵称 | 发送申请的用户昵称 |
| items[].fromAvatar | string | 发起者头像 | 发送申请的用户头像 |
| items[].message | string | 验证消息 | 申请附带的消息 |
| items[].status | string | 状态 | pending/accepted/rejected |
| items[].direction | string | 方向 | received/sent |
| items[].createdAt | string | 创建时间 | ISO 8601 格式 |

##### curl 示例

```bash
curl -X GET 'http://127.0.0.1:8080/api/friend-requests' \
  -H 'Authorization: Bearer <token>'
```

---

### 5.3 接受好友申请

- **接口地址**：`POST /api/friend-requests/:id/accept`
- **是否鉴权**：是
- **使用场景**：接受收到的好友申请

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| id | 是 | r1 | 好友申请 ID |

##### 出参

```json
{
  "friend": {
    "friendId": "u2",
    "username": "test002",
    "nickname": "小明",
    "avatar": "/uploads/b.png",
    "remark": "",
    "tags": "",
    "permission": "聊天",
    "isStarred": false,
    "isBlocked": false,
    "createdAt": "2026-05-19T12:00:00Z"
  }
}
```

##### 常见错误

| 错误信息 | 原因 | 处理建议 |
|----------|------|----------|
| 申请不存在 | requestId 错误 | 刷新列表重新操作 |
| 申请已处理 | 申请已被接受或拒绝 | 刷新列表 |

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/friend-requests/r1/accept' \
  -H 'Authorization: Bearer <token>'
```

---

### 5.4 拒绝好友申请

- **接口地址**：`POST /api/friend-requests/:id/reject`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| id | 是 | r1 | 好友申请 ID |

##### 出参

```json
{
  "ok": true
}
```

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/friend-requests/r1/reject' \
  -H 'Authorization: Bearer <token>'
```

---

## 6. 好友接口

### 6.1 获取好友列表

- **接口地址**：`GET /api/friends`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 出参

```json
{
  "items": [
    {
      "friendId": "u2",
      "username": "test002",
      "nickname": "小明",
      "avatar": "/uploads/b.png",
      "remark": "后端组长",
      "tags": "同学",
      "permission": "聊天",
      "isStarred": false,
      "isBlocked": false,
      "createdAt": "2026-05-19T12:00:00Z"
    }
  ]
}
```

| 字段 | 类型 | 中文名称 | 说明 |
|------|------|----------|------|
| items | array | 好友列表 | 所有好友信息 |
| items[].friendId | string | 好友 ID | 好友的用户 ID |
| items[].username | string | 用户名 | 好友的用户名 |
| items[].nickname | string | 昵称 | 好友的昵称 |
| items[].avatar | string | 头像 | 好友的头像 |
| items[].remark | string | 备注 | 当前用户给好友设置的备注 |
| items[].tags | string | 标签 | 好友标签 |
| items[].permission | string | 权限 | 聊天权限 |
| items[].isStarred | boolean | 是否星标 | 是否为星标好友 |
| items[].isBlocked | boolean | 是否拉黑 | 是否在黑名单中 |
| items[].createdAt | string | 创建时间 | 成为好友的时间 |

##### curl 示例

```bash
curl -X GET 'http://127.0.0.1:8080/api/friends' \
  -H 'Authorization: Bearer <token>'
```

---

### 6.2 修改好友信息

- **接口地址**：`PUT /api/friends/:friendId`
- **是否鉴权**：是
- **使用场景**：修改好友备注、标签、权限等

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| friendId | 是 | u2 | 好友的用户 ID |

##### 入参

```json
{
  "remark": "后端组长",
  "tags": "同学",
  "permission": "聊天",
  "isStarred": true
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| remark | string | 否 | 后端组长 | 备注 | 给好友设置的备注 | 仅自己可见 |
| tags | string | 否 | 同学 | 标签 | 好友标签 | 仅自己可见 |
| permission | string | 否 | 聊天 | 权限 | 聊天权限 | - |
| isStarred | boolean | 否 | true | 是否星标 | 是否为星标好友 | - |

##### 出参

```json
{
  "friend": {
    "friendId": "u2",
    "username": "test002",
    "nickname": "小明",
    "avatar": "/uploads/b.png",
    "remark": "后端组长",
    "tags": "同学",
    "permission": "聊天",
    "isStarred": true,
    "isBlocked": false,
    "createdAt": "2026-05-19T12:00:00Z"
  }
}
```

##### curl 示例

```bash
curl -X PUT 'http://127.0.0.1:8080/api/friends/u2' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "remark": "后端组长",
    "isStarred": true
  }'
```

---

### 6.3 删除好友

- **接口地址**：`DELETE /api/friends/:friendId`
- **是否鉴权**：是
- **使用场景**：删除好友关系

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| friendId | 是 | u2 | 好友的用户 ID |

##### 出参

```json
{
  "ok": true
}
```

##### 注意事项

- 删除双向 friendship 关系
- 不删除历史消息
- 不删除会话
- 删除后不能继续发送新的私聊消息

##### curl 示例

```bash
curl -X DELETE 'http://127.0.0.1:8080/api/friends/u2' \
  -H 'Authorization: Bearer <token>'
```

---

### 6.4 拉黑好友

- **接口地址**：`POST /api/friends/:friendId/block`
- **是否鉴权**：是
- **使用场景**：将好友加入黑名单

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| friendId | 是 | u2 | 好友的用户 ID |

##### 出参

```json
{
  "message": "已加入黑名单",
  "friendId": "u2",
  "isBlocked": true,
  "friend": {}
}
```

| 字段 | 类型 | 中文名称 | 说明 |
|------|------|----------|------|
| message | string | 消息 | 操作结果消息 |
| friendId | string | 好友 ID | 被拉黑的好友 ID |
| isBlocked | boolean | 是否拉黑 | 当前拉黑状态 |
| friend | object | 好友信息 | 更新后的好友信息 |

##### 注意事项

- 不删除 friendship 关系
- 只修改当前用户对该好友的拉黑状态
- 拉黑后对方不能给你发私聊消息

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/friends/u2/block' \
  -H 'Authorization: Bearer <token>'
```

---

### 6.5 解除拉黑

- **接口地址**：`POST /api/friends/:friendId/unblock`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| friendId | 是 | u2 | 好友的用户 ID |

##### 出参

```json
{
  "message": "已移出黑名单",
  "friendId": "u2",
  "isBlocked": false,
  "friend": {}
}
```

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/friends/u2/unblock' \
  -H 'Authorization: Bearer <token>'
```

---

### 6.6 获取黑名单

- **接口地址**：`GET /api/friends/blocked`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 出参

```json
{
  "items": [
    {
      "friendId": "u2",
      "username": "test002",
      "nickname": "小明",
      "avatar": "/uploads/b.png",
      "remark": "",
      "tags": "",
      "permission": "聊天",
      "isStarred": false,
      "isBlocked": true,
      "createdAt": "2026-05-19T12:00:00Z"
    }
  ]
}
```

##### curl 示例

```bash
curl -X GET 'http://127.0.0.1:8080/api/friends/blocked' \
  -H 'Authorization: Bearer <token>'
```

---

## 7. 会话接口

### 7.1 获取会话列表

- **接口地址**：`GET /api/conversations`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 出参

```json
{
  "items": [
    {
      "id": "private:u1:u2",
      "type": "private",
      "name": "小明",
      "avatar": "/uploads/b.png",
      "targetUserId": "u2",
      "targetUsername": "test002",
      "targetNickname": "小明",
      "targetAvatar": "/uploads/b.png",
      "lastMessage": "你好",
      "lastMessageType": "text",
      "lastMessageTime": "2026-05-19T12:00:00Z",
      "unreadCount": 0,
      "isPinned": false,
      "isMuted": false
    }
  ]
}
```

| 字段 | 类型 | 中文名称 | 说明 |
|------|------|----------|------|
| items | array | 会话列表 | 所有会话 |
| items[].id | string | 会话 ID | 会话唯一标识 |
| items[].type | string | 会话类型 | private/group |
| items[].name | string | 会话名称 | 私聊为对方昵称，群聊为群名 |
| items[].avatar | string | 头像 | 私聊为对方头像，群聊为群头像 |
| items[].targetUserId | string | 目标用户 ID | 私聊对方的用户 ID |
| items[].targetUsername | string | 目标用户名 | 私聊对方的用户名 |
| items[].targetNickname | string | 目标昵称 | 私聊对方的昵称 |
| items[].targetAvatar | string | 目标头像 | 私聊对方的头像 |
| items[].lastMessage | string | 最后消息 | 最后一条消息内容预览 |
| items[].lastMessageType | string | 最后消息类型 | text/image/file 等 |
| items[].lastMessageTime | string | 最后消息时间 | ISO 8601 格式 |
| items[].unreadCount | number | 未读数 | 未读消息数量 |
| items[].isPinned | boolean | 是否置顶 | 是否置顶会话 |
| items[].isMuted | boolean | 是否免打扰 | 是否开启免打扰 |

##### 注意事项

- 置顶会话排在普通会话前面
- 免打扰会话仍然计算 unreadCount

##### curl 示例

```bash
curl -X GET 'http://127.0.0.1:8080/api/conversations' \
  -H 'Authorization: Bearer <token>'
```

---

### 7.2 创建或打开私聊会话

- **接口地址**：`POST /api/conversations/private`
- **是否鉴权**：是
- **使用场景**：点击好友进入私聊时调用

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 入参

```json
{
  "targetUserId": "u2"
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| targetUserId | string | 是 | u2 | 目标用户 ID | 要私聊的用户 ID | 必须是好友，不能是自己 |

##### 出参

```json
{
  "conversation": {
    "id": "private:u1:u2",
    "type": "private",
    "name": "小明",
    "avatar": "/uploads/b.png"
  }
}
```

##### 常见错误

| 错误信息 | 原因 | 处理建议 |
|----------|------|----------|
| 不是好友 | 双方不是好友关系 | 提示用户先添加好友 |
| 不能和自己私聊 | targetUserId 是自己 | 提示用户 |

##### 注意事项

- 必须是好友
- 不能和自己创建私聊
- 如果已存在，直接返回原会话
- conversationId 稳定生成：`private:{minUserId}:{maxUserId}`

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/conversations/private' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "targetUserId": "u2"
  }'
```

---

### 7.3 创建群聊会话

- **接口地址**：`POST /api/conversations/group`
- **是否鉴权**：是
- **使用场景**：创建新的群聊

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 入参

```json
{
  "name": "项目讨论群",
  "memberIds": ["u2", "u3", "u4"]
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| name | string | 是 | 项目讨论群 | 群名称 | 群聊名称 | 建议 1-20 位 |
| memberIds | array | 是 | ["u2", "u3"] | 成员列表 | 要邀请的成员 ID 列表 | 必须是好友，自动去重 |

##### 出参

```json
{
  "conversation": {
    "id": "group:xxx",
    "type": "group",
    "name": "项目讨论群",
    "avatar": "",
    "ownerId": "u1",
    "memberCount": 4
  }
}
```

##### 常见错误

| 错误信息 | 原因 | 处理建议 |
|----------|------|----------|
| 只能邀请好友创建群聊 | memberIds 中有非好友 | 提示用户只能邀请好友 |
| 请至少选择一位好友 | memberIds 为空 | 提示用户选择成员 |

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/conversations/group' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "项目讨论群",
    "memberIds": ["u2", "u3", "u4"]
  }'
```

---

### 7.4 修改会话设置

- **接口地址**：`PATCH /api/conversations/:conversationId/settings`
- **是否鉴权**：是
- **使用场景**：修改置顶、免打扰等设置

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | private:u1:u2 | 会话 ID |

##### 入参

```json
{
  "isPinned": true,
  "isMuted": false
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| isPinned | boolean | 否 | true | 是否置顶 | 置顶会话 | 仅影响当前用户 |
| isMuted | boolean | 否 | false | 是否免打扰 | 开启免打扰 | 仅影响当前用户 |

##### 出参

```json
{
  "conversation": {
    "id": "private:u1:u2",
    "isPinned": true,
    "isMuted": false
  }
}
```

##### 注意事项

- 只修改当前用户自己的 conversation_members 设置
- 不影响其他成员

##### curl 示例

```bash
curl -X PATCH 'http://127.0.0.1:8080/api/conversations/private:u1:u2/settings' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "isPinned": true
  }'
```

---

### 7.5 标为已读

- **接口地址**：`POST /api/conversations/:conversationId/read`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | private:u1:u2 | 会话 ID |

##### 出参

```json
{
  "unreadCount": 0
}
```

##### 注意事项

- 清空当前用户该会话的 unreadCount
- 不影响其他用户

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/conversations/private:u1:u2/read' \
  -H 'Authorization: Bearer <token>'
```

---

### 7.6 清空聊天记录

- **接口地址**：`POST /api/conversations/:conversationId/clear`
- **是否鉴权**：是
- **使用场景**：清空当前用户视角下的聊天记录

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | private:u1:u2 | 会话 ID |

##### 出参

```json
{
  "ok": true
}
```

##### 注意事项

- 只清空当前用户视角下的聊天记录
- 不物理删除 messages
- 不影响对方
- 通常通过 conversation_members.cleared_at 实现

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/conversations/private:u1:u2/clear' \
  -H 'Authorization: Bearer <token>'
```

---

### 7.7 删除会话

- **接口地址**：`DELETE /api/conversations/:conversationId`
- **是否鉴权**：是
- **使用场景**：删除会话（仅自己）

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | private:u1:u2 | 会话 ID |

##### 出参

```json
{
  "ok": true
}
```

##### curl 示例

```bash
curl -X DELETE 'http://127.0.0.1:8080/api/conversations/private:u1:u2' \
  -H 'Authorization: Bearer <token>'
```

---

## 8. 群聊管理接口

### 8.1 获取群聊信息

- **接口地址**：`GET /api/conversations/:conversationId/group`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |

##### 出参

```json
{
  "conversation": {
    "id": "group:xxx",
    "type": "group",
    "name": "项目讨论群",
    "avatar": "",
    "ownerId": "u1",
    "announcement": "群公告内容",
    "memberCount": 10,
    "botEnabled": false,
    "members": [
      {
        "userId": "u1",
        "nickname": "顾眠",
        "avatar": "/uploads/a.png",
        "role": "owner",
        "mutedUntil": null
      }
    ]
  }
}
```

| 字段 | 类型 | 中文名称 | 说明 |
|------|------|----------|------|
| conversation.id | string | 群聊 ID | 群聊唯一标识 |
| conversation.type | string | 类型 | 固定为 group |
| conversation.name | string | 群名称 | 群聊名称 |
| conversation.avatar | string | 群头像 | 群聊头像 |
| conversation.ownerId | string | 群主 ID | 群主的用户 ID |
| conversation.announcement | string | 群公告 | 群公告内容 |
| conversation.memberCount | number | 成员数 | 群成员数量 |
| conversation.botEnabled | boolean | 机器人开关 | AI 机器人是否开启 |
| conversation.members | array | 成员列表 | 群成员列表 |
| conversation.members[].userId | string | 用户 ID | 成员的用户 ID |
| conversation.members[].nickname | string | 昵称 | 成员昵称 |
| conversation.members[].avatar | string | 头像 | 成员头像 |
| conversation.members[].role | string | 角色 | owner/admin/member |
| conversation.members[].mutedUntil | string | 禁言截止时间 | 禁言到期时间 |

##### curl 示例

```bash
curl -X GET 'http://127.0.0.1:8080/api/conversations/group:xxx/group' \
  -H 'Authorization: Bearer <token>'
```

---

### 8.2 修改群聊设置

- **接口地址**：`PATCH /api/conversations/:conversationId/group`
- **是否鉴权**：是
- **使用场景**：修改群名称、群公告等

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |

##### 入参

```json
{
  "name": "新群名称",
  "avatar": "/uploads/group-avatar.png",
  "announcement": "新群公告"
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| name | string | 否 | 新群名称 | 群名称 | 群聊名称 | 群主和管理员可修改 |
| avatar | string | 否 | /uploads/group-avatar.png | 群头像 | 群聊头像 | 先上传获取地址 |
| announcement | string | 否 | 新群公告 | 群公告 | 群公告内容 | 群主和管理员可修改 |

##### 出参

```json
{
  "conversation": {
    "id": "group:xxx",
    "name": "新群名称",
    "avatar": "/uploads/group-avatar.png",
    "announcement": "新群公告"
  }
}
```

##### 常见错误

| 错误信息 | 原因 | 处理建议 |
|----------|------|----------|
| 无权限访问该群聊 | 不是群成员 | 提示用户 |
| 只有群主 | 非群主尝试修改群主专属设置 | 提示用户 |

##### curl 示例

```bash
curl -X PATCH 'http://127.0.0.1:8080/api/conversations/group:xxx/group' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "新群名称",
    "announcement": "新群公告"
  }'
```

---

### 8.3 退出群聊

- **接口地址**：`POST /api/conversations/:conversationId/group/leave`
- **是否鉴权**：是
- **使用场景**：普通成员退出群聊

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |

##### 出参

```json
{
  "ok": true
}
```

##### 常见错误

| 错误信息 | 原因 | 处理建议 |
|----------|------|----------|
| 群主请使用解散群聊功能 | 群主尝试退出 | 提示群主使用解散功能 |
| 不在该群聊中 | 不是群成员 | 提示用户 |

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/conversations/group:xxx/group/leave' \
  -H 'Authorization: Bearer <token>'
```

---

### 8.4 解散群聊

- **接口地址**：`DELETE /api/conversations/:conversationId/group`
- **是否鉴权**：是
- **使用场景**：群主解散群聊

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |

##### 出参

```json
{
  "ok": true
}
```

##### 常见错误

| 错误信息 | 原因 | 处理建议 |
|----------|------|----------|
| 只有群主可以解散群聊 | 非群主尝试解散 | 提示用户 |

##### curl 示例

```bash
curl -X DELETE 'http://127.0.0.1:8080/api/conversations/group:xxx/group' \
  -H 'Authorization: Bearer <token>'
```

---

### 8.5 设置管理员

- **接口地址**：`POST /api/conversations/:conversationId/group/admin`
- **是否鉴权**：是
- **使用场景**：群主设置管理员

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |

##### 入参

```json
{
  "userId": "u2"
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| userId | string | 是 | u2 | 用户 ID | 要设置为管理员的用户 ID | 必须是群成员 |

##### 出参

```json
{
  "ok": true
}
```

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/conversations/group:xxx/group/admin' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "u2"
  }'
```

---

### 8.6 撤销管理员

- **接口地址**：`DELETE /api/conversations/:conversationId/group/admin/:userId`
- **是否鉴权**：是
- **使用场景**：群主撤销管理员

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |
| userId | 是 | u2 | 要撤销的用户 ID |

##### 出参

```json
{
  "ok": true
}
```

##### curl 示例

```bash
curl -X DELETE 'http://127.0.0.1:8080/api/conversations/group:xxx/group/admin/u2' \
  -H 'Authorization: Bearer <token>'
```

---

### 8.7 转让群主

- **接口地址**：`POST /api/conversations/:conversationId/group/transfer`
- **是否鉴权**：是
- **使用场景**：群主转让群主身份

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |

##### 入参

```json
{
  "userId": "u2"
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| userId | string | 是 | u2 | 用户 ID | 要转让给的用户 ID | 必须是群成员 |

##### 出参

```json
{
  "ok": true
}
```

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/conversations/group:xxx/group/transfer' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "u2"
  }'
```

---

### 8.8 禁言成员

- **接口地址**：`POST /api/conversations/:conversationId/group/mute`
- **是否鉴权**：是
- **使用场景**：管理员禁言群成员

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |

##### 入参

```json
{
  "userId": "u2",
  "duration": "10m"
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| userId | string | 是 | u2 | 用户 ID | 要禁言的用户 ID | 必须是群成员 |
| duration | string | 是 | 10m | 禁言时长 | 10m/1h/1d/forever | 10分钟/1小时/1天/永久 |

##### 出参

```json
{
  "ok": true
}
```

##### 常见错误

| 错误信息 | 原因 | 处理建议 |
|----------|------|----------|
| 只有管理员可以执行此操作 | 非管理员尝试禁言 | 提示用户 |

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/conversations/group:xxx/group/mute' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "u2",
    "duration": "10m"
  }'
```

---

### 8.9 解除禁言

- **接口地址**：`POST /api/conversations/:conversationId/group/unmute`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |

##### 入参

```json
{
  "userId": "u2"
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| userId | string | 是 | u2 | 用户 ID | 要解除禁言的用户 ID | - |

##### 出参

```json
{
  "ok": true
}
```

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/conversations/group:xxx/group/unmute' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "u2"
  }'
```

---

### 8.10 群机器人开关

- **接口地址**：`PATCH /api/groups/:id/bot`
- **是否鉴权**：是
- **使用场景**：开启或关闭群 AI 机器人

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| id | 是 | group:xxx | 群聊会话 ID |

##### 入参

```json
{
  "botEnabled": true
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| botEnabled | boolean | 是 | true | 是否开启机器人 | AI 机器人开关 | 开启后群成员可使用 /ai 命令 |

##### 出参

```json
{
  "conversation": {
    "id": "group:xxx",
    "botEnabled": true
  }
}
```

##### curl 示例

```bash
curl -X PATCH 'http://127.0.0.1:8080/api/groups/group:xxx/bot' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "botEnabled": true
  }'
```

---

### 8.11 置顶消息

- **接口地址**：`POST /api/conversations/:conversationId/group/pin`
- **是否鉴权**：是
- **使用场景**：管理员置顶重要消息

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |

##### 入参

```json
{
  "messageId": "m1"
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| messageId | string | 是 | m1 | 消息 ID | 要置顶的消息 ID | 必须是群内消息 |

##### 出参

```json
{
  "ok": true
}
```

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/conversations/group:xxx/group/pin' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "messageId": "m1"
  }'
```

---

### 8.12 取消置顶

- **接口地址**：`DELETE /api/conversations/:conversationId/group/pin/:messageId`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |
| messageId | 是 | m1 | 消息 ID |

##### 出参

```json
{
  "ok": true
}
```

##### curl 示例

```bash
curl -X DELETE 'http://127.0.0.1:8080/api/conversations/group:xxx/group/pin/m1' \
  -H 'Authorization: Bearer <token>'
```

---

### 8.13 获取置顶消息

- **接口地址**：`GET /api/conversations/:conversationId/group/pins`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |

##### 出参

```json
{
  "pins": [
    {
      "messageId": "m1",
      "content": "置顶消息内容",
      "senderName": "顾眠",
      "pinnedAt": "2026-05-19T12:00:00Z"
    }
  ]
}
```

##### curl 示例

```bash
curl -X GET 'http://127.0.0.1:8080/api/conversations/group:xxx/group/pins' \
  -H 'Authorization: Bearer <token>'
```

---

### 8.14 生成邀请链接

- **接口地址**：`POST /api/conversations/:conversationId/group/invites`
- **是否鉴权**：是
- **使用场景**：生成群邀请链接分享给他人

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |

##### 入参

```json
{
  "expiresIn": "7d",
  "maxUses": 10
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| expiresIn | string | 否 | 7d | 过期时间 | 1d/7d/30d/never | 默认 7d |
| maxUses | number | 否 | 10 | 最大使用次数 | 0 表示不限制 | 默认不限制 |

##### 出参

```json
{
  "invite": {
    "id": "inv1",
    "code": "abc123",
    "expiresAt": "2026-06-07T12:00:00Z",
    "maxUses": 10,
    "usedCount": 0,
    "createdAt": "2026-05-19T12:00:00Z"
  }
}
```

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/conversations/group:xxx/group/invites' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "expiresIn": "7d",
    "maxUses": 10
  }'
```

---

### 8.15 通过邀请码加入群聊

- **接口地址**：`POST /api/conversations/group/join/:code`
- **是否鉴权**：是
- **使用场景**：通过邀请链接加入群聊

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| code | 是 | abc123 | 邀请码 |

##### 出参

```json
{
  "conversation": {
    "id": "group:xxx",
    "type": "group",
    "name": "项目讨论群"
  }
}
```

##### 常见错误

| 错误信息 | 原因 | 处理建议 |
|----------|------|----------|
| 邀请码无效或已过期 | 邀请码错误或已过期 | 提示用户获取新的邀请链接 |
| 已经是群成员 | 已在群中 | 提示用户 |

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/conversations/group/join/abc123' \
  -H 'Authorization: Bearer <token>'
```

---

### 8.16 添加群成员

- **接口地址**：`POST /api/conversations/:conversationId/group/members`
- **是否鉴权**：是
- **使用场景**：邀请好友加入群聊

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |

##### 入参

```json
{
  "memberIds": ["u2", "u3"]
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| memberIds | array | 是 | ["u2", "u3"] | 成员 ID 列表 | 要邀请的用户 ID | 必须是好友 |

##### 出参

```json
{
  "ok": true
}
```

##### 常见错误

| 错误信息 | 原因 | 处理建议 |
|----------|------|----------|
| 只能邀请好友加入群聊 | memberIds 中有非好友 | 提示用户 |
| 已经是群成员 | 目标用户已在群中 | 提示用户 |

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/conversations/group:xxx/group/members' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "memberIds": ["u2", "u3"]
  }'
```

---

## 9. 消息接口

### 9.1 获取消息历史

- **接口地址**：`GET /api/messages`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### Query 参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | private:u1:u2 | 会话 ID |
| page | 否 | 1 | 页码，默认 1 |
| pageSize | 否 | 30 | 每页数量，默认 30 |

##### 出参

```json
{
  "items": [
    {
      "id": "m1",
      "conversationId": "private:u1:u2",
      "messageScope": "private",
      "type": "chat",
      "messageType": "text",
      "senderId": "u1",
      "senderName": "顾眠",
      "senderAvatar": "/uploads/a.png",
      "content": "你好",
      "quote": null,
      "revoked": false,
      "createdAt": "2026-05-19T12:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 30
}
```

| 字段 | 类型 | 中文名称 | 说明 |
|------|------|----------|------|
| items | array | 消息列表 | 消息列表 |
| items[].id | string | 消息 ID | 消息唯一标识 |
| items[].conversationId | string | 会话 ID | 所属会话 |
| items[].messageScope | string | 消息范围 | private/group |
| items[].type | string | 消息类型 | chat/system |
| items[].messageType | string | 内容类型 | text/image/file 等 |
| items[].senderId | string | 发送者 ID | 发送者用户 ID |
| items[].senderName | string | 发送者昵称 | 发送者昵称 |
| items[].senderAvatar | string | 发送者头像 | 发送者头像 |
| items[].content | string | 消息内容 | 消息内容 |
| items[].quote | object | 引用消息 | 被引用的消息 |
| items[].revoked | boolean | 是否撤回 | 是否已撤回 |
| items[].createdAt | string | 发送时间 | ISO 8601 格式 |
| total | number | 总数 | 消息总数 |
| page | number | 当前页 | 当前页码 |
| pageSize | number | 每页数量 | 每页消息数 |

##### 注意事项

- 当前用户必须是会话成员
- 如果当前用户 cleared_at 不为空，只返回 cleared_at 之后的消息
- 支持分页加载

##### curl 示例

```bash
curl -X GET 'http://127.0.0.1:8080/api/messages?conversationId=private:u1:u2&page=1&pageSize=30' \
  -H 'Authorization: Bearer <token>'
```

---

### 9.2 撤回消息

- **接口地址**：`POST /api/messages/:messageId/revoke`
- **是否鉴权**：是
- **使用场景**：撤回自己发送的消息

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| messageId | 是 | m1 | 消息 ID |

##### 出参

```json
{
  "ok": true
}
```

##### 常见错误

| 错误信息 | 原因 | 处理建议 |
|----------|------|----------|
| 无权撤回该消息 | 不是消息发送者 | 提示用户 |
| 超过可撤回时间 | 消息发送时间过长 | 提示用户 |

##### 注意事项

- 只能撤回自己发送的消息
- 不能撤回别人消息
- 超过可撤回时间返回错误
- 不物理删除消息
- 设置 revoked = true
- 撤回成功后通过 WebSocket 广播 revoke 事件

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/messages/m1/revoke' \
  -H 'Authorization: Bearer <token>'
```

---

### 9.3 获取目标消息附近记录

- **接口地址**：`GET /api/messages/around`
- **是否鉴权**：是
- **使用场景**：收藏、搜索、文件页跳转原消息时定位

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### Query 参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | private:u1:u2 | 会话 ID |
| messageId | 是 | m1 | 目标消息 ID |
| limit | 否 | 30 | 返回消息数量，默认 30 |

##### 出参

```json
{
  "items": [
    {
      "id": "m1",
      "content": "目标消息",
      "senderId": "u1",
      "createdAt": "2026-05-19T12:00:00Z"
    }
  ],
  "hasMore": true,
  "nextBefore": "2026-05-19T11:59:00Z"
}
```

##### curl 示例

```bash
curl -X GET 'http://127.0.0.1:8080/api/messages/around?conversationId=private:u1:u2&messageId=m1&limit=30' \
  -H 'Authorization: Bearer <token>'
```

---

## 10. WebSocket 接口

### 10.1 建立连接

- **接口地址**：`GET /ws?token=<jwt-token>`
- **是否鉴权**：是（通过 query 参数传递 token）

##### Query 参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| token | 是 | xxx | JWT token |

##### 连接示例

```javascript
const ws = new WebSocket('ws://127.0.0.1:8080/ws?token=xxx');
```

##### 注意事项

- token 必须有效
- 后端根据 token 识别当前用户
- 不再使用 nickname 作为身份凭证

---

### 10.2 发送文本消息

```json
{
  "conversationId": "private:u1:u2",
  "messageType": "text",
  "content": "你好"
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 |
|------|------|------|------|----------|------|
| conversationId | string | 是 | private:u1:u2 | 会话 ID | 目标会话 |
| messageType | string | 是 | text | 消息类型 | text/image/file |
| content | string | 是 | 你好 | 消息内容 | 消息内容 |

---

### 10.3 发送图片消息

```json
{
  "conversationId": "private:u1:u2",
  "messageType": "image",
  "content": "/uploads/images/xxx.jpg"
}
```

##### 注意事项

- content 为图片地址，需要先通过上传接口获取

---

### 10.4 发送文件消息

```json
{
  "conversationId": "private:u1:u2",
  "messageType": "file",
  "content": "{\"url\":\"/uploads/files/a.pdf\",\"name\":\"作业.pdf\",\"size\":123456,\"mimeType\":\"application/pdf\"}"
}
```

##### 注意事项

- content 为 JSON 字符串，包含文件信息

---

### 10.5 服务端推送聊天消息

```json
{
  "id": "m1",
  "type": "chat",
  "messageScope": "private",
  "conversationId": "private:u1:u2",
  "senderId": "u1",
  "senderName": "顾眠",
  "senderAvatar": "/uploads/a.png",
  "messageType": "text",
  "content": "你好",
  "quote": null,
  "createdAt": "2026-05-19T12:00:00Z"
}
```

---

### 10.6 服务端推送撤回事件

```json
{
  "type": "revoke",
  "conversationId": "private:u1:u2",
  "messageId": "m1",
  "operatorId": "u1",
  "revokedAt": "2026-05-19T12:01:00Z"
}
```

---

## 11. 上传接口

### 11.1 上传图片

- **接口地址**：`POST /api/upload`
- **是否鉴权**：是
- **Content-Type**：multipart/form-data

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### FormData

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | file | 是 | 图片文件，支持 jpg/png/gif 等 |

##### 出参

```json
{
  "url": "/uploads/images/xxx.jpg"
}
```

| 字段 | 类型 | 中文名称 | 说明 |
|------|------|----------|------|
| url | string | 图片地址 | 上传后的图片地址，用于发送消息 |

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/upload' \
  -H 'Authorization: Bearer <token>' \
  -F 'file=@/path/to/image.jpg'
```

---

### 11.2 上传文件

- **接口地址**：`POST /api/upload/file`
- **是否鉴权**：是
- **Content-Type**：multipart/form-data

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### FormData

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | file | 是 | 普通文件 |

##### 出参

```json
{
  "url": "/uploads/files/xxx.pdf",
  "name": "作业.pdf",
  "size": 123456,
  "mimeType": "application/pdf"
}
```

| 字段 | 类型 | 中文名称 | 说明 |
|------|------|----------|------|
| url | string | 文件地址 | 上传后的文件地址 |
| name | string | 文件名 | 原始文件名 |
| size | number | 文件大小 | 文件字节数 |
| mimeType | string | MIME 类型 | 文件 MIME 类型 |

##### 注意事项

- 不允许路径穿越
- 不把文件内容存进 messages 表
- 文件名使用随机名或 UUID 保存

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/upload/file' \
  -H 'Authorization: Bearer <token>' \
  -F 'file=@/path/to/file.pdf'
```

---

## 12. 文件接口

### 12.1 获取文件列表

- **接口地址**：`GET /api/files`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### Query 参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| type | 否 | document | 文件类型筛选 |
| keyword | 否 | 作业 | 关键词搜索 |

type 可选值：

| type | 含义 |
|------|------|
| all | 全部 |
| image | 图片 |
| document | 文档 |
| archive | 压缩包 |
| other | 其他 |

##### 出参

```json
{
  "items": [
    {
      "messageId": "m1",
      "conversationId": "private:u1:u2",
      "conversationName": "小明",
      "senderId": "u1",
      "senderName": "顾眠",
      "fileName": "作业.pdf",
      "fileUrl": "/uploads/files/xxx.pdf",
      "fileSize": 123456,
      "mimeType": "application/pdf",
      "messageCreatedAt": "2026-05-19T12:00:00Z"
    }
  ]
}
```

| 字段 | 类型 | 中文名称 | 说明 |
|------|------|----------|------|
| items | array | 文件列表 | 文件列表 |
| items[].messageId | string | 消息 ID | 文件消息 ID |
| items[].conversationId | string | 会话 ID | 所属会话 |
| items[].conversationName | string | 会话名称 | 会话名称 |
| items[].senderId | string | 发送者 ID | 发送者用户 ID |
| items[].senderName | string | 发送者昵称 | 发送者昵称 |
| items[].fileName | string | 文件名 | 文件名 |
| items[].fileUrl | string | 文件地址 | 文件地址 |
| items[].fileSize | number | 文件大小 | 文件字节数 |
| items[].mimeType | string | MIME 类型 | 文件 MIME 类型 |
| items[].messageCreatedAt | string | 发送时间 | ISO 8601 格式 |

##### curl 示例

```bash
curl -X GET 'http://127.0.0.1:8080/api/files?type=document&keyword=作业' \
  -H 'Authorization: Bearer <token>'
```

---

## 13. 收藏接口

### 13.1 收藏消息

- **接口地址**：`POST /api/favorites`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 入参

```json
{
  "messageId": "m1"
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| messageId | string | 是 | m1 | 消息 ID | 要收藏的消息 ID | 必须有权限访问该消息 |

##### 出参

```json
{
  "favorite": {
    "id": "fav1",
    "messageId": "m1",
    "conversationId": "private:u1:u2",
    "messageType": "text",
    "content": "你好",
    "senderId": "u1",
    "senderName": "顾眠",
    "senderAvatar": "/uploads/a.png",
    "messageCreatedAt": "2026-05-19T12:00:00Z",
    "createdAt": "2026-05-19T12:30:00Z"
  }
}
```

##### 常见错误

| 错误信息 | 原因 | 处理建议 |
|----------|------|----------|
| 无权访问该消息 | 不是会话成员 | 提示用户 |
| 已撤回消息不能收藏 | 消息已撤回 | 提示用户 |
| 已经收藏过该消息 | 重复收藏 | 提示用户 |

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/favorites' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "messageId": "m1"
  }'
```

---

### 13.2 取消收藏

- **接口地址**：`DELETE /api/favorites/:id` 或 `DELETE /api/favorites/message/:messageId`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| id | 是 | fav1 | 收藏 ID |
| 或 messageId | 是 | m1 | 消息 ID |

##### 出参

```json
{
  "ok": true
}
```

##### curl 示例

```bash
# 通过收藏 ID
curl -X DELETE 'http://127.0.0.1:8080/api/favorites/fav1' \
  -H 'Authorization: Bearer <token>'

# 通过消息 ID
curl -X DELETE 'http://127.0.0.1:8080/api/favorites/message/m1' \
  -H 'Authorization: Bearer <token>'
```

---

### 13.3 获取收藏列表

- **接口地址**：`GET /api/favorites`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### Query 参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| type | 否 | image | 消息类型筛选 |
| keyword | 否 | 你好 | 关键词搜索 |

##### 出参

```json
{
  "items": [
    {
      "id": "fav1",
      "messageId": "m1",
      "conversationId": "private:u1:u2",
      "conversationName": "小明",
      "messageType": "text",
      "content": "你好",
      "quoteContent": "",
      "senderId": "u1",
      "senderName": "顾眠",
      "senderAvatar": "/uploads/a.png",
      "messageCreatedAt": "2026-05-19T12:00:00Z",
      "createdAt": "2026-05-19T12:30:00Z"
    }
  ]
}
```

| 字段 | 类型 | 中文名称 | 说明 |
|------|------|----------|------|
| items | array | 收藏列表 | 收藏列表 |
| items[].id | string | 收藏 ID | 收藏记录 ID |
| items[].messageId | string | 消息 ID | 原消息 ID |
| items[].conversationId | string | 会话 ID | 原会话 ID |
| items[].conversationName | string | 会话名称 | 原会话名称 |
| items[].messageType | string | 消息类型 | text/image/file 等 |
| items[].content | string | 内容 | 消息内容 |
| items[].quoteContent | string | 引用内容 | 被引用的消息内容 |
| items[].senderId | string | 发送者 ID | 发送者用户 ID |
| items[].senderName | string | 发送者昵称 | 发送者昵称 |
| items[].senderAvatar | string | 发送者头像 | 发送者头像 |
| items[].messageCreatedAt | string | 消息时间 | 原消息发送时间 |
| items[].createdAt | string | 收藏时间 | 收藏时间 |

##### curl 示例

```bash
curl -X GET 'http://127.0.0.1:8080/api/favorites?type=image&keyword=你好' \
  -H 'Authorization: Bearer <token>'
```

---

## 14. 朋友圈接口

### 14.1 获取动态流

- **接口地址**：`GET /api/moments/feed`
- **是否鉴权**：是
- **使用场景**：查看朋友圈动态

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### Query 参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| userId | 否 | u2 | 指定用户 ID，为空则获取所有好友动态 |

##### 出参

```json
{
  "items": [
    {
      "id": "post1",
      "userId": "u1",
      "username": "test001",
      "nickname": "顾眠",
      "avatar": "/uploads/a.png",
      "content": "今天天气真好",
      "images": ["/uploads/images/1.jpg", "/uploads/images/2.jpg"],
      "likeCount": 5,
      "commentCount": 3,
      "isLiked": false,
      "comments": [
        {
          "id": "comment1",
          "userId": "u2",
          "username": "test002",
          "nickname": "小明",
          "avatar": "/uploads/b.png",
          "content": "确实不错",
          "createdAt": "2026-05-19T12:00:00Z"
        }
      ],
      "createdAt": "2026-05-19T12:00:00Z"
    }
  ]
}
```

| 字段 | 类型 | 中文名称 | 说明 |
|------|------|----------|------|
| items | array | 动态列表 | 朋友圈动态列表 |
| items[].id | string | 动态 ID | 动态唯一标识 |
| items[].userId | string | 用户 ID | 发布者用户 ID |
| items[].username | string | 用户名 | 发布者用户名 |
| items[].nickname | string | 昵称 | 发布者昵称 |
| items[].avatar | string | 头像 | 发布者头像 |
| items[].content | string | 内容 | 动态文字内容 |
| items[].images | array | 图片列表 | 动态图片列表 |
| items[].likeCount | number | 点赞数 | 点赞数量 |
| items[].commentCount | number | 评论数 | 评论数量 |
| items[].isLiked | boolean | 是否点赞 | 当前用户是否点赞 |
| items[].comments | array | 评论列表 | 评论列表 |
| items[].comments[].id | string | 评论 ID | 评论唯一标识 |
| items[].comments[].userId | string | 用户 ID | 评论者用户 ID |
| items[].comments[].username | string | 用户名 | 评论者用户名 |
| items[].comments[].nickname | string | 昵称 | 评论者昵称 |
| items[].comments[].avatar | string | 头像 | 评论者头像 |
| items[].comments[].content | string | 内容 | 评论内容 |
| items[].comments[].createdAt | string | 评论时间 | ISO 8601 格式 |
| items[].createdAt | string | 发布时间 | ISO 8601 格式 |

##### 注意事项

- 仅对好友可见
- 拉黑后双方互相不可见对方动态

##### curl 示例

```bash
# 获取所有好友动态
curl -X GET 'http://127.0.0.1:8080/api/moments/feed' \
  -H 'Authorization: Bearer <token>'

# 获取指定用户动态
curl -X GET 'http://127.0.0.1:8080/api/moments/feed?userId=u2' \
  -H 'Authorization: Bearer <token>'
```

---

### 14.2 发布动态

- **接口地址**：`POST /api/moments`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 入参

```json
{
  "content": "今天天气真好",
  "images": ["/uploads/images/1.jpg", "/uploads/images/2.jpg"]
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| content | string | 否 | 今天天气真好 | 内容 | 动态文字内容 | 可以为空 |
| images | array | 否 | ["/uploads/images/1.jpg"] | 图片列表 | 动态图片列表 | 最多 9 张，先上传获取地址 |

##### 出参

```json
{
  "post": {
    "id": "post1",
    "userId": "u1",
    "username": "test001",
    "nickname": "顾眠",
    "avatar": "/uploads/a.png",
    "content": "今天天气真好",
    "images": ["/uploads/images/1.jpg", "/uploads/images/2.jpg"],
    "likeCount": 0,
    "commentCount": 0,
    "isLiked": false,
    "comments": [],
    "createdAt": "2026-05-19T12:00:00Z"
  }
}
```

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/moments' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "content": "今天天气真好",
    "images": ["/uploads/images/1.jpg", "/uploads/images/2.jpg"]
  }'
```

---

### 14.3 删除动态

- **接口地址**：`DELETE /api/moments/:id`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| id | 是 | post1 | 动态 ID |

##### 出参

```json
{
  "ok": true
}
```

##### 常见错误

| 错误信息 | 原因 | 处理建议 |
|----------|------|----------|
| 无权删除该动态 | 不是动态发布者 | 提示用户 |

##### curl 示例

```bash
curl -X DELETE 'http://127.0.0.1:8080/api/moments/post1' \
  -H 'Authorization: Bearer <token>'
```

---

### 14.4 点赞

- **接口地址**：`POST /api/moments/:id/like`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| id | 是 | post1 | 动态 ID |

##### 出参

```json
{
  "ok": true
}
```

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/moments/post1/like' \
  -H 'Authorization: Bearer <token>'
```

---

### 14.5 取消点赞

- **接口地址**：`DELETE /api/moments/:id/like`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| id | 是 | post1 | 动态 ID |

##### 出参

```json
{
  "ok": true
}
```

##### curl 示例

```bash
curl -X DELETE 'http://127.0.0.1:8080/api/moments/post1/like' \
  -H 'Authorization: Bearer <token>'
```

---

### 14.6 评论

- **接口地址**：`POST /api/moments/:id/comments`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| id | 是 | post1 | 动态 ID |

##### 入参

```json
{
  "content": "确实不错"
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| content | string | 是 | 确实不错 | 评论内容 | 评论文字内容 | 不能为空 |

##### 出参

```json
{
  "comment": {
    "id": "comment1",
    "userId": "u1",
    "username": "test001",
    "nickname": "顾眠",
    "avatar": "/uploads/a.png",
    "content": "确实不错",
    "createdAt": "2026-05-19T12:00:00Z"
  }
}
```

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/moments/post1/comments' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "content": "确实不错"
  }'
```

---

### 14.7 删除评论

- **接口地址**：`DELETE /api/moments/comments/:id`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| id | 是 | comment1 | 评论 ID |

##### 出参

```json
{
  "ok": true
}
```

##### 常见错误

| 错误信息 | 原因 | 处理建议 |
|----------|------|----------|
| 无权删除该评论 | 不是评论发布者 | 提示用户 |

##### curl 示例

```bash
curl -X DELETE 'http://127.0.0.1:8080/api/moments/comments/comment1' \
  -H 'Authorization: Bearer <token>'
```

---

## 15. 投票接口

### 15.1 创建投票

- **接口地址**：`POST /api/conversations/:conversationId/votes`
- **是否鉴权**：是
- **使用场景**：在群聊中发起投票

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |

##### 入参

```json
{
  "question": "今天吃什么？",
  "options": ["火锅", "烧烤", "外卖"],
  "allowMulti": false,
  "anonymous": false,
  "deadline": "2026-05-20T18:00:00Z"
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| question | string | 是 | 今天吃什么？ | 投票问题 | 投票的问题 | - |
| options | array | 是 | ["火锅", "烧烤"] | 选项列表 | 投票选项 | 至少 2 个选项 |
| allowMulti | boolean | 否 | false | 是否多选 | 是否允许多选 | 默认 false |
| anonymous | boolean | 否 | false | 是否匿名 | 是否匿名投票 | 默认 false |
| deadline | string | 否 | 2026-05-20T18:00:00Z | 截止时间 | 投票截止时间 | ISO 8601 格式，可选 |

##### 出参

```json
{
  "vote": {
    "id": "vote1",
    "conversationId": "group:xxx",
    "question": "今天吃什么？",
    "options": [
      {
        "id": "opt1",
        "text": "火锅",
        "count": 0
      },
      {
        "id": "opt2",
        "text": "烧烤",
        "count": 0
      },
      {
        "id": "opt3",
        "text": "外卖",
        "count": 0
      }
    ],
    "allowMulti": false,
    "anonymous": false,
    "deadline": "2026-05-20T18:00:00Z",
    "createdBy": "u1",
    "createdAt": "2026-05-19T12:00:00Z"
  }
}
```

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/conversations/group:xxx/votes' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "question": "今天吃什么？",
    "options": ["火锅", "烧烤", "外卖"],
    "allowMulti": false,
    "anonymous": false
  }'
```

---

### 15.2 获取投票详情

- **接口地址**：`GET /api/votes/:voteId`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| voteId | 是 | vote1 | 投票 ID |

##### 出参

```json
{
  "vote": {
    "id": "vote1",
    "conversationId": "group:xxx",
    "question": "今天吃什么？",
    "options": [
      {
        "id": "opt1",
        "text": "火锅",
        "count": 3,
        "selected": true
      },
      {
        "id": "opt2",
        "text": "烧烤",
        "count": 2,
        "selected": false
      }
    ],
    "allowMulti": false,
    "anonymous": false,
    "deadline": "2026-05-20T18:00:00Z",
    "createdBy": "u1",
    "createdAt": "2026-05-19T12:00:00Z"
  }
}
```

##### curl 示例

```bash
curl -X GET 'http://127.0.0.1:8080/api/votes/vote1' \
  -H 'Authorization: Bearer <token>'
```

---

### 15.3 投票

- **接口地址**：`POST /api/votes/:voteId/vote`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| voteId | 是 | vote1 | 投票 ID |

##### 入参

```json
{
  "optionIds": ["opt1"]
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| optionIds | array | 是 | ["opt1"] | 选项 ID 列表 | 要投票的选项 ID | 单选时只能选一个 |

##### 出参

```json
{
  "ok": true
}
```

##### 常见错误

| 错误信息 | 原因 | 处理建议 |
|----------|------|----------|
| 投票已结束 | 已过截止时间 | 提示用户 |
| 已经投过票 | 重复投票 | 提示用户 |

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/votes/vote1/vote' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "optionIds": ["opt1"]
  }'
```

---

### 15.4 取消投票

- **接口地址**：`DELETE /api/votes/:voteId/vote`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| voteId | 是 | vote1 | 投票 ID |

##### 出参

```json
{
  "ok": true
}
```

##### curl 示例

```bash
curl -X DELETE 'http://127.0.0.1:8080/api/votes/vote1/vote' \
  -H 'Authorization: Bearer <token>'
```

---

## 16. 接龙接口

### 16.1 创建接龙

- **接口地址**：`POST /api/conversations/:conversationId/solitaires`
- **是否鉴权**：是
- **使用场景**：在群聊中发起接龙

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |

##### 入参

```json
{
  "title": "周末聚餐报名"
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| title | string | 是 | 周末聚餐报名 | 接龙标题 | 接龙的标题 | 不能为空 |

##### 出参

```json
{
  "solitaire": {
    "id": "sol1",
    "conversationId": "group:xxx",
    "title": "周末聚餐报名",
    "createdBy": "u1",
    "creatorName": "顾眠",
    "items": [],
    "createdAt": "2026-05-19T12:00:00Z"
  }
}
```

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/conversations/group:xxx/solitaires' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "周末聚餐报名"
  }'
```

---

### 16.2 获取接龙详情

- **接口地址**：`GET /api/solitaires/:solitaireId`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| solitaireId | 是 | sol1 | 接龙 ID |

##### 出参

```json
{
  "solitaire": {
    "id": "sol1",
    "conversationId": "group:xxx",
    "title": "周末聚餐报名",
    "createdBy": "u1",
    "creatorName": "顾眠",
    "items": [
      {
        "id": "item1",
        "userId": "u2",
        "username": "test002",
        "nickname": "小明",
        "avatar": "/uploads/b.png",
        "content": "1. 小明 参加",
        "createdAt": "2026-05-19T12:01:00Z"
      }
    ],
    "createdAt": "2026-05-19T12:00:00Z"
  }
}
```

| 字段 | 类型 | 中文名称 | 说明 |
|------|------|----------|------|
| solitaire.id | string | 接龙 ID | 接龙唯一标识 |
| solitaire.conversationId | string | 会话 ID | 所属会话 |
| solitaire.title | string | 标题 | 接龙标题 |
| solitaire.createdBy | string | 创建者 ID | 创建者用户 ID |
| solitaire.creatorName | string | 创建者昵称 | 创建者昵称 |
| solitaire.items | array | 接龙条目 | 接龙条目列表 |
| solitaire.items[].id | string | 条目 ID | 条目唯一标识 |
| solitaire.items[].userId | string | 用户 ID | 参与者用户 ID |
| solitaire.items[].username | string | 用户名 | 参与者用户名 |
| solitaire.items[].nickname | string | 昵称 | 参与者昵称 |
| solitaire.items[].avatar | string | 头像 | 参与者头像 |
| solitaire.items[].content | string | 内容 | 接龙内容 |
| solitaire.items[].createdAt | string | 参与时间 | ISO 8601 格式 |
| solitaire.createdAt | string | 创建时间 | ISO 8601 格式 |

##### curl 示例

```bash
curl -X GET 'http://127.0.0.1:8080/api/solitaires/sol1' \
  -H 'Authorization: Bearer <token>'
```

---

### 16.3 参与接龙

- **接口地址**：`POST /api/solitaires/:solitaireId/join`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| solitaireId | 是 | sol1 | 接龙 ID |

##### 入参

```json
{
  "content": "1. 小明 参加"
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| content | string | 是 | 1. 小明 参加 | 接龙内容 | 参与接龙的内容 | 不能为空 |

##### 出参

```json
{
  "ok": true
}
```

##### 常见错误

| 错误信息 | 原因 | 处理建议 |
|----------|------|----------|
| 已经参与过接龙 | 重复参与 | 提示用户 |

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/solitaires/sol1/join' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "content": "1. 小明 参加"
  }'
```

---

### 16.4 修改接龙条目

- **接口地址**：`PUT /api/solitaires/:solitaireId/items/:itemId`
- **是否鉴权**：是
- **使用场景**：修改自己的接龙内容

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| solitaireId | 是 | sol1 | 接龙 ID |
| itemId | 是 | item1 | 条目 ID |

##### 入参

```json
{
  "content": "1. 小明 不参加了"
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| content | string | 是 | 1. 小明 不参加了 | 接龙内容 | 修改后的内容 | 不能为空 |

##### 出参

```json
{
  "ok": true
}
```

##### 常见错误

| 错误信息 | 原因 | 处理建议 |
|----------|------|----------|
| 无权修改该条目 | 不是条目创建者 | 提示用户 |

##### curl 示例

```bash
curl -X PUT 'http://127.0.0.1:8080/api/solitaires/sol1/items/item1' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "content": "1. 小明 不参加了"
  }'
```

---

## 17. 群相册接口

### 17.1 创建相册

- **接口地址**：`POST /api/conversations/:conversationId/albums`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |

##### 入参

```json
{
  "name": "毕业旅行"
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| name | string | 是 | 毕业旅行 | 相册名称 | 相册名称 | 不能为空 |

##### 出参

```json
{
  "album": {
    "id": "album1",
    "conversationId": "group:xxx",
    "name": "毕业旅行",
    "createdBy": "u1",
    "creatorName": "顾眠",
    "photoCount": 0,
    "createdAt": "2026-05-19T12:00:00Z"
  }
}
```

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/conversations/group:xxx/albums' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "毕业旅行"
  }'
```

---

### 17.2 获取相册列表

- **接口地址**：`GET /api/conversations/:conversationId/albums`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |

##### 出参

```json
{
  "albums": [
    {
      "id": "album1",
      "conversationId": "group:xxx",
      "name": "毕业旅行",
      "createdBy": "u1",
      "creatorName": "顾眠",
      "photoCount": 5,
      "coverUrl": "/uploads/albums/xxx.jpg",
      "createdAt": "2026-05-19T12:00:00Z"
    }
  ]
}
```

##### curl 示例

```bash
curl -X GET 'http://127.0.0.1:8080/api/conversations/group:xxx/albums' \
  -H 'Authorization: Bearer <token>'
```

---

### 17.3 获取相册详情

- **接口地址**：`GET /api/conversations/:conversationId/albums/:albumId`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |
| albumId | 是 | album1 | 相册 ID |

##### 出参

```json
{
  "album": {
    "id": "album1",
    "conversationId": "group:xxx",
    "name": "毕业旅行",
    "createdBy": "u1",
    "creatorName": "顾眠",
    "photoCount": 5,
    "createdAt": "2026-05-19T12:00:00Z"
  }
}
```

##### curl 示例

```bash
curl -X GET 'http://127.0.0.1:8080/api/conversations/group:xxx/albums/album1' \
  -H 'Authorization: Bearer <token>'
```

---

### 17.4 修改相册

- **接口地址**：`PUT /api/conversations/:conversationId/albums/:albumId`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |
| albumId | 是 | album1 | 相册 ID |

##### 入参

```json
{
  "name": "新相册名称"
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| name | string | 是 | 新相册名称 | 相册名称 | 修改后的名称 | 不能为空 |

##### 出参

```json
{
  "ok": true
}
```

##### curl 示例

```bash
curl -X PUT 'http://127.0.0.1:8080/api/conversations/group:xxx/albums/album1' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "新相册名称"
  }'
```

---

### 17.5 删除相册

- **接口地址**：`DELETE /api/conversations/:conversationId/albums/:albumId`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |
| albumId | 是 | album1 | 相册 ID |

##### 出参

```json
{
  "ok": true
}
```

##### curl 示例

```bash
curl -X DELETE 'http://127.0.0.1:8080/api/conversations/group:xxx/albums/album1' \
  -H 'Authorization: Bearer <token>'
```

---

### 17.6 上传照片

- **接口地址**：`POST /api/conversations/:conversationId/albums/:albumId/photos`
- **是否鉴权**：是
- **Content-Type**：multipart/form-data

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |
| albumId | 是 | album1 | 相册 ID |

##### FormData

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | file | 是 | 图片文件 |

##### 出参

```json
{
  "photo": {
    "id": "photo1",
    "albumId": "album1",
    "url": "/uploads/albums/xxx.jpg",
    "uploadedBy": "u1",
    "uploaderName": "顾眠",
    "createdAt": "2026-05-19T12:00:00Z"
  }
}
```

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/conversations/group:xxx/albums/album1/photos' \
  -H 'Authorization: Bearer <token>' \
  -F 'file=@/path/to/image.jpg'
```

---

### 17.7 获取相册照片

- **接口地址**：`GET /api/conversations/:conversationId/albums/:albumId/photos`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |
| albumId | 是 | album1 | 相册 ID |

##### 出参

```json
{
  "photos": [
    {
      "id": "photo1",
      "albumId": "album1",
      "url": "/uploads/albums/xxx.jpg",
      "uploadedBy": "u1",
      "uploaderName": "顾眠",
      "createdAt": "2026-05-19T12:00:00Z"
    }
  ]
}
```

##### curl 示例

```bash
curl -X GET 'http://127.0.0.1:8080/api/conversations/group:xxx/albums/album1/photos' \
  -H 'Authorization: Bearer <token>'
```

---

### 17.8 删除照片

- **接口地址**：`DELETE /api/conversations/:conversationId/albums/:albumId/photos/:photoId`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |
| albumId | 是 | album1 | 相册 ID |
| photoId | 是 | photo1 | 照片 ID |

##### 出参

```json
{
  "ok": true
}
```

##### curl 示例

```bash
curl -X DELETE 'http://127.0.0.1:8080/api/conversations/group:xxx/albums/album1/photos/photo1' \
  -H 'Authorization: Bearer <token>'
```

---

### 17.9 批量删除照片

- **接口地址**：`POST /api/conversations/:conversationId/albums/:albumId/photos/batch-delete`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |
| albumId | 是 | album1 | 相册 ID |

##### 入参

```json
{
  "photoIds": ["photo1", "photo2"]
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| photoIds | array | 是 | ["photo1", "photo2"] | 照片 ID 列表 | 要删除的照片 ID | 不能为空 |

##### 出参

```json
{
  "ok": true
}
```

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/conversations/group:xxx/albums/album1/photos/batch-delete' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "photoIds": ["photo1", "photo2"]
  }'
```

---

### 17.10 获取会话全部相册照片

- **接口地址**：`GET /api/conversations/:conversationId/album-photos`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |

##### 出参

```json
{
  "photos": [
    {
      "id": "photo1",
      "albumId": "album1",
      "albumName": "毕业旅行",
      "url": "/uploads/albums/xxx.jpg",
      "uploadedBy": "u1",
      "uploaderName": "顾眠",
      "createdAt": "2026-05-19T12:00:00Z"
    }
  ]
}
```

##### curl 示例

```bash
curl -X GET 'http://127.0.0.1:8080/api/conversations/group:xxx/album-photos' \
  -H 'Authorization: Bearer <token>'
```

---

### 17.11 获取我的相册照片

- **接口地址**：`GET /api/conversations/:conversationId/album-photos/mine`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 路径参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| conversationId | 是 | group:xxx | 群聊会话 ID |

##### 出参

```json
{
  "photos": [
    {
      "id": "photo1",
      "albumId": "album1",
      "albumName": "毕业旅行",
      "url": "/uploads/albums/xxx.jpg",
      "createdAt": "2026-05-19T12:00:00Z"
    }
  ]
}
```

##### curl 示例

```bash
curl -X GET 'http://127.0.0.1:8080/api/conversations/group:xxx/album-photos/mine' \
  -H 'Authorization: Bearer <token>'
```

---

## 18. AI 助手接口

### 18.1 SSE 流式对话

- **接口地址**：`GET /api/ai/stream`
- **是否鉴权**：是
- **使用场景**：与 AI 进行流式对话

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### Query 参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| query | 是 | 你好 | 对话内容 |

##### 响应格式

返回 `text/event-stream`，每条消息格式：

```
data: <文本片段>
```

结束时：

```
event: done
data: {}
```

##### curl 示例

```bash
curl -X GET 'http://127.0.0.1:8080/api/ai/stream?query=你好' \
  -H 'Authorization: Bearer <token>'
```

---

### 18.2 同步对话

- **接口地址**：`POST /api/ai/chat`
- **是否鉴权**：是
- **使用场景**：与 AI 进行同步对话

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 入参

```json
{
  "content": "/ai 你好",
  "conversationId": "private:用户A:ai-assistant",
  "messageScope": "private"
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| content | string | 是 | /ai 你好 | 对话内容 | 对话内容 | - |
| conversationId | string | 是 | private:u1:ai-assistant | 会话 ID | AI 助手会话 ID | - |
| messageScope | string | 是 | private | 消息范围 | private/group | - |

##### 出参

```json
{
  "content": "你好！有什么可以帮你的吗？",
  "conversationId": "private:u1:ai-assistant",
  "messageScope": "private"
}
```

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/ai/chat' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "content": "/ai 你好",
    "conversationId": "private:u1:ai-assistant",
    "messageScope": "private"
  }'
```

---

### 18.3 翻译

- **接口地址**：`POST /api/ai/translate`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 入参

```json
{
  "text": "要翻译的文本",
  "targetLang": "英文"
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| text | string | 是 | 要翻译的文本 | 原文 | 要翻译的文本 | - |
| targetLang | string | 是 | 英文 | 目标语言 | 翻译目标语言 | - |

##### 出参

```json
{
  "translation": "Hello"
}
```

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/ai/translate' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "你好",
    "targetLang": "英文"
  }'
```

---

### 18.4 摘要

- **接口地址**：`POST /api/ai/summarize`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 入参

```json
{
  "texts": ["消息1", "消息2", "消息3"]
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| texts | array | 是 | ["消息1", "消息2"] | 消息列表 | 要生成摘要的消息列表 | - |

##### 出参

```json
{
  "summary": "摘要内容"
}
```

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/ai/summarize' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "texts": ["消息1", "消息2", "消息3"]
  }'
```

---

### 18.5 补全

- **接口地址**：`POST /api/ai/complete`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 入参

```json
{
  "text": "要补全的文本",
  "granularity": "word"
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| text | string | 是 | 要补全的文本 | 原文 | 要补全的文本 | - |
| granularity | string | 否 | word | 补全粒度 | word/sentence | 默认 word |

##### 出参

```json
{
  "completion": "补全内容"
}
```

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/ai/complete' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "今天天气",
    "granularity": "word"
  }'
```

---

### 18.6 预测问题

- **接口地址**：`POST /api/ai/predict-question`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 入参

```json
{
  "text": "消息内容"
}
```

| 字段 | 类型 | 必填 | 示例 | 中文名称 | 说明 | 注意点 |
|------|------|------|------|----------|------|--------|
| text | string | 是 | 消息内容 | 原文 | 要预测问题的消息 | - |

##### 出参

```json
{
  "question": "预测的问题",
  "answer": "预测的回答"
}
```

##### curl 示例

```bash
curl -X POST 'http://127.0.0.1:8080/api/ai/predict-question' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "消息内容"
  }'
```

---

### 18.7 语义搜索

- **接口地址**：`GET /api/ai/search`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### Query 参数

| 参数 | 必填 | 示例 | 说明 |
|------|------|------|------|
| q | 是 | 搜索词 | 搜索关键词 |
| conversationId | 否 | private:u1:u2 | 指定会话搜索 |

##### 出参

```json
{
  "results": [
    {
      "messageId": "m1",
      "content": "匹配的消息内容",
      "senderName": "顾眠",
      "createdAt": "2026-05-19T12:00:00Z",
      "score": 0.95
    }
  ]
}
```

##### curl 示例

```bash
curl -X GET 'http://127.0.0.1:8080/api/ai/search?q=搜索词&conversationId=private:u1:u2' \
  -H 'Authorization: Bearer <token>'
```

---

### 18.8 使用统计

- **接口地址**：`GET /api/ai/stats`
- **是否鉴权**：是

##### Headers

| Header | 必填 | 示例 | 说明 |
|--------|------|------|------|
| Authorization | 是 | Bearer xxx | JWT token |

##### 出参

```json
{
  "chat": 10,
  "stream": 5,
  "translate": 3,
  "summarize": 2,
  "complete": 1,
  "predict": 4,
  "search": 0,
  "total": 25
}
```

| 字段 | 类型 | 中文名称 | 说明 |
|------|------|----------|------|
| chat | number | 同步对话次数 | 同步对话调用次数 |
| stream | number | 流式对话次数 | 流式对话调用次数 |
| translate | number | 翻译次数 | 翻译调用次数 |
| summarize | number | 摘要次数 | 摘要调用次数 |
| complete | number | 补全次数 | 补全调用次数 |
| predict | number | 预测次数 | 预测问题调用次数 |
| search | number | 搜索次数 | 语义搜索调用次数 |
| total | number | 总次数 | 所有 AI 功能调用总次数 |

##### curl 示例

```bash
curl -X GET 'http://127.0.0.1:8080/api/ai/stats' \
  -H 'Authorization: Bearer <token>'
```

---

## 19. 数据权限说明

### 19.1 私聊权限

私聊消息发送前必须校验：

- 当前用户已登录
- 当前用户是会话成员
- 当前用户和对方仍是好友
- 当前用户没有拉黑对方
- 对方没有拉黑当前用户

不满足时：

- 不写入 messages 表
- 不转发 WebSocket
- 返回明确错误

### 19.2 好友权限

- 删除好友只删除 friendship 关系
- 删除好友不删除历史消息
- 拉黑只修改 friendship 状态
- 拉黑不删除好友关系和历史消息

### 19.3 清空聊天记录

- 清空聊天记录只影响当前用户
- 不删除 messages
- 不影响对方
- 收藏记录不受影响

### 19.4 群聊权限

- 只有群主可以解散群聊
- 只有群主可以设置/撤销管理员
- 只有群主可以转让群主
- 管理员可以禁言/解除禁言普通成员
- 管理员可以置顶/取消置顶消息
- 群主和管理员可以修改群名称、群公告

---

## 20. 后续维护说明

如果实际代码接口发生变化，需要同步更新：

- 路由路径
- 请求字段
- 响应字段
- 错误码
- WebSocket 事件格式
- 权限校验规则
