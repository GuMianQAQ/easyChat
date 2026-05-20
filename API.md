# MyChat 接口文档

## 1. 基本说明

本项目后端基于 **Go + Gin**，接口默认返回 JSON。

除登录、注册、验证码外，大部分接口都需要携带 JWT：

```http
Authorization: Bearer <token>
```

主要模块：

- 用户认证
- 用户资料
- 好友系统
- 会话系统
- 消息系统
- WebSocket
- 文件上传
- 文件中心
- 收藏系统

---

## 2. 通用返回格式

### 成功示例

```json
{
  "message": "操作成功",
  "data": {}
}
```

列表接口常见格式：

```json
{
  "items": [],
  "total": 0
}
```

### 失败示例

```json
{
  "error": "错误信息"
}
```

### 常见状态码

| 状态码 | 含义 |
|---|---|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未登录或登录已过期 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

---

## 3. 用户认证接口

### 3.1 注册

```http
POST /api/auth/register
```

请求体：

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

说明：

- `username` 必须唯一。
- 密码不能明文保存，后端使用 bcrypt。
- 验证码由后端生成并校验。

---

### 3.2 登录

```http
POST /api/auth/login
```

请求体：

```json
{
  "username": "test001",
  "password": "123456"
}
```

响应示例：

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

---

## 4. 用户资料接口

### 4.1 获取当前用户

```http
GET /api/users/me
```

响应示例：

```json
{
  "id": "u1",
  "username": "test001",
  "nickname": "顾眠",
  "avatar": "/uploads/avatar.png",
  "gender": "unknown",
  "region": "广东 深圳",
  "signature": "个性签名"
}
```

---

### 4.2 修改当前用户资料

```http
PUT /api/users/me/profile
```

请求体：

```json
{
  "nickname": "顾眠",
  "avatar": "/uploads/avatar.png",
  "gender": "unknown",
  "region": "广东 深圳",
  "signature": "个性签名"
}
```

说明：

- 只能修改自己的资料。
- 不能修改 `username`。
- 不能返回 `password_hash`。

---

### 4.3 修改密码

```http
PUT /api/users/me/password
```

请求体：

```json
{
  "oldPassword": "123456",
  "newPassword": "abcdef123",
  "confirmPassword": "abcdef123"
}
```

校验规则：

- 旧密码必须正确。
- 新密码长度建议 6-32 位。
- 新密码不能和旧密码相同。
- `confirmPassword` 必须和 `newPassword` 一致。
- 新密码必须使用 bcrypt 保存。

响应示例：

```json
{
  "message": "密码修改成功，请重新登录"
}
```

---

## 5. 验证码接口

### 5.1 获取图片验证码

```http
GET /api/captcha
```

响应示例：

```json
{
  "captchaId": "xxx",
  "image": "data:image/png;base64,..."
}
```

说明：

- 验证码由后端生成。
- 注册时提交 `captchaId` 和 `captchaCode`。
- 验证成功后验证码应失效。

---

## 6. 用户搜索接口

### 6.1 通过账号精确搜索用户

```http
GET /api/users/search?username=test001
```

说明：

- 只允许 `username` 精确匹配。
- 不允许模糊搜索。
- 不返回多个候选。
- 用户不存在或关闭搜索权限时，统一返回“未找到该用户”。

响应示例：

```json
{
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
```

---

## 7. 好友申请接口

### 7.1 发送好友申请

```http
POST /api/friend-requests
```

请求体：

```json
{
  "toUserId": "u2",
  "message": "你好，我是顾眠"
}
```

说明：

- `fromUserId` 由 JWT 当前用户决定，前端不能传。
- `message` 可以为空。
- 不能添加自己。
- 如果对方不允许添加，返回错误。
- 如果对方需要验证，生成 pending 申请。
- 如果对方不需要验证，可以直接成为好友。

---

### 7.2 获取好友申请列表

```http
GET /api/friend-requests
```

响应示例：

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

---

### 7.3 接受好友申请

```http
POST /api/friend-requests/:id/accept
```

说明：

- 只能接受发给当前用户的申请。
- 状态必须是 `pending`。
- 接受后创建双向 friendship。

---

### 7.4 拒绝好友申请

```http
POST /api/friend-requests/:id/reject
```

说明：

- 只能拒绝发给当前用户的申请。
- 状态必须是 `pending`。

---

## 8. 好友接口

### 8.1 获取好友列表

```http
GET /api/friends
```

响应示例：

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

---

### 8.2 修改好友信息

```http
PUT /api/friends/:friendId
```

请求体：

```json
{
  "remark": "后端组长",
  "tags": "同学",
  "permission": "聊天",
  "isStarred": true
}
```

说明：

- `remark` 是当前用户给好友设置的备注。
- 不修改对方的 `users.nickname`。

---

### 8.3 删除好友

```http
DELETE /api/friends/:friendId
```

说明：

- 删除双向 friendship 关系。
- 不删除 messages。
- 不删除 conversations。
- 历史聊天记录保留。
- 删除后不能继续发送新的私聊消息。

---

### 8.4 拉黑好友

```http
POST /api/friends/:friendId/block
```

说明：

- 不删除 friendship。
- 只修改当前用户对该好友的拉黑状态。
- 设置 `is_blocked = true`。

---

### 8.5 解除拉黑

```http
POST /api/friends/:friendId/unblock
```

说明：

- 设置 `is_blocked = false`。
- 清空 `blocked_at`。

---

### 8.6 获取黑名单

```http
GET /api/friends/blocked
```

说明：

- 只返回当前用户主动拉黑的好友。
- 不返回“谁拉黑了我”。

---

## 9. 隐私设置接口

### 9.1 获取隐私设置

```http
GET /api/users/me/privacy
```

响应示例：

```json
{
  "allowSearch": true,
  "allowFriendRequest": true,
  "requireFriendVerify": true
}
```

---

### 9.2 修改隐私设置

```http
PUT /api/users/me/privacy
```

请求体：

```json
{
  "allowSearch": true,
  "allowFriendRequest": true,
  "requireFriendVerify": true
}
```

---

## 10. 会话接口

### 10.1 获取会话列表

```http
GET /api/conversations
```

响应示例：

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

说明：

- 私聊会话返回对方昵称和头像。
- 置顶会话排在普通会话前面。
- 免打扰会话仍然计算 `unreadCount`。

---

### 10.2 创建或打开私聊会话

```http
POST /api/conversations/private
```

请求体：

```json
{
  "targetUserId": "u2"
}
```

说明：

- 必须是好友。
- 不能和自己创建私聊。
- 如果已存在，直接返回原会话。
- `conversationId` 稳定生成：

```text
private:{minUserId}:{maxUserId}
```

---

### 10.3 修改会话设置

```http
PATCH /api/conversations/:conversationId/settings
```

请求体：

```json
{
  "isPinned": true,
  "isMuted": false
}
```

说明：

- 只修改当前用户自己的 conversation_members 设置。
- 不影响其他成员。

---

### 10.4 标为已读

```http
POST /api/conversations/:conversationId/read
```

说明：

- 清空当前用户该会话的 `unreadCount`。
- 不影响其他用户。

---

### 10.5 清空聊天记录

```http
POST /api/conversations/:conversationId/clear
```

说明：

- 只清空当前用户视角下的聊天记录。
- 不物理删除 messages。
- 不影响对方。
- 通常通过 `conversation_members.cleared_at` 实现。

---

## 11. 消息接口

### 11.1 获取消息历史

```http
GET /api/messages?conversationId=private:u1:u2&limit=30&beforeTime=2026-05-19T12:00:00Z
```

响应示例：

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
  "hasMore": true,
  "nextBefore": "2026-05-19T11:59:00Z"
}
```

说明：

- 当前用户必须是会话成员。
- 如果当前用户 `cleared_at` 不为空，只返回 `cleared_at` 之后的消息。
- 支持分页加载。

---

### 11.2 撤回消息

```http
POST /api/messages/:messageId/revoke
```

说明：

- 只能撤回自己发送的消息。
- 不能撤回别人消息。
- 超过可撤回时间返回错误。
- 不物理删除消息。
- 设置 `revoked = true`。
- 撤回成功后通过 WebSocket 广播 revoke 事件。

---

### 11.3 获取目标消息附近记录

```http
GET /api/messages/around?conversationId=private:u1:u2&messageId=m1&limit=30
```

说明：

- 用于收藏、搜索、文件页跳转原消息时定位。
- 返回目标消息前后若干条消息。

---

## 12. WebSocket 接口

### 12.1 建立连接

```http
GET /ws?token=<jwt-token>
```

说明：

- token 必须有效。
- 后端根据 token 识别当前用户。
- 不再使用 nickname 作为身份凭证。

---

### 12.2 发送文本消息

```json
{
  "conversationId": "private:u1:u2",
  "messageType": "text",
  "content": "你好"
}
```

---

### 12.3 发送图片消息

```json
{
  "conversationId": "private:u1:u2",
  "messageType": "image",
  "content": "/uploads/images/xxx.jpg"
}
```

---

### 12.4 发送文件消息

```json
{
  "conversationId": "private:u1:u2",
  "messageType": "file",
  "content": "{\"url\":\"/uploads/files/a.pdf\",\"name\":\"作业.pdf\",\"size\":123456,\"mimeType\":\"application/pdf\"}"
}
```

---

### 12.5 服务端推送聊天消息

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

### 12.6 服务端推送撤回事件

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

## 13. 上传接口

### 13.1 上传图片

```http
POST /api/upload
```

FormData：

| 字段 | 类型 |
|---|---|
| file | image/* |

响应示例：

```json
{
  "url": "/uploads/images/xxx.jpg"
}
```

---

### 13.2 上传文件

```http
POST /api/upload/file
```

FormData：

| 字段 | 类型 |
|---|---|
| file | 普通文件 |

响应示例：

```json
{
  "url": "/uploads/files/xxx.pdf",
  "name": "作业.pdf",
  "size": 123456,
  "mimeType": "application/pdf"
}
```

说明：

- 不允许路径穿越。
- 不把文件内容存进 messages 表。
- 文件名使用随机名或 UUID 保存。

---

## 14. 文件接口

### 14.1 获取文件列表

```http
GET /api/files?keyword=作业&type=document
```

`type` 可选值：

| type | 含义 |
|---|---|
| all | 全部 |
| image | 图片 |
| document | 文档 |
| archive | 压缩包 |
| other | 其他 |

响应示例：

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

---

## 15. 收藏接口

### 15.1 收藏消息

```http
POST /api/favorites
```

请求体：

```json
{
  "messageId": "m1"
}
```

说明：

- 当前用户必须有权限访问该消息。
- 已撤回消息不能收藏。
- 同一用户不能重复收藏同一消息。

---

### 15.2 取消收藏

```http
DELETE /api/favorites/:favoriteId
```

或者：

```http
DELETE /api/favorites/message/:messageId
```

具体以项目实现为准。

---

### 15.3 获取收藏列表

```http
GET /api/favorites?type=image&keyword=你好
```

响应示例：

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

---

## 16. 数据权限说明

### 16.1 私聊权限

私聊消息发送前必须校验：

- 当前用户已登录。
- 当前用户是会话成员。
- 当前用户和对方仍是好友。
- 当前用户没有拉黑对方。
- 对方没有拉黑当前用户。

不满足时：

- 不写入 messages 表。
- 不转发 WebSocket。
- 返回明确错误。

---

### 16.2 好友权限

- 删除好友只删除 friendship 关系。
- 删除好友不删除历史消息。
- 拉黑只修改 friendship 状态。
- 拉黑不删除好友关系和历史消息。

---

### 16.3 清空聊天记录

- 清空聊天记录只影响当前用户。
- 不删除 messages。
- 不影响对方。
- 收藏记录不受影响。

---

## 17. 后续维护说明

如果实际代码接口发生变化，需要同步更新：

- 路由路径
- 请求字段
- 响应字段
- 错误码
- WebSocket 事件格式
- 权限校验规则
