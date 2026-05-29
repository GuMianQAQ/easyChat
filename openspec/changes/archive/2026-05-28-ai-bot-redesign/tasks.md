## 1. AI 助手好友

- [x] 1.1 注册时自动添加 AI 助手为好友（修改 auth 注册流程）
- [x] 1.2 启动时检查现有用户是否已有 AI 好友，自动补齐
- [x] 1.3 好友列表排序：AI 助手始终排在第一位

## 2. AI 助手私聊

- [x] 2.1 修改 HandleMessage：检测私聊对方是 `ai-assistant` 时直接处理（不需要 `/ai` 前缀）
- [x] 2.2 修改 readPump：普通好友私聊中禁用 `/ai` 命令，返回错误提示
- [x] 2.3 前端：AI 助手私聊中隐藏 `/ai` 前缀提示

## 3. 群机器人开关

- [x] 3.1 conversations 表新增 `bot_enabled` 字段
- [x] 3.2 新增群机器人开关 API（`PATCH /api/groups/:id/bot`）
- [x] 3.3 开关时动态管理 AI 成员（开 -> 加，关 -> 移除）
- [x] 3.4 非群主操作时返回权限错误
- [x] 3.5 群详情接口返回 `botEnabled` 字段

## 4. 群聊 AI 消息处理

- [x] 4.1 修改 HandleMessage：群聊中检查 `bot_enabled`，未开启时返回错误
- [x] 4.2 修改 readPump：群聊 `/ai` 命令前检查 `bot_enabled`

## 5. 前端

- [x] 5.1 群设置面板增加机器人开关 UI
- [x] 5.2 开关时调用后端 API
