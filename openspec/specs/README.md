# Specs

This directory holds the canonical OpenSpec specifications for stable capabilities in `easyChat`.

## Capability Map

### Core
- `auth` — 登录注册、token 管理
- `privacy` — 隐私设置
- `conversations` — 会话列表、未读计数
- `groups` — 群聊管理、成员权限
- `messaging` — 消息收发、撤回、引用
- `files` — 文件上传与管理
- `favorites` — 消息收藏
- `friends` — 好友关系、好友请求
- `desktop-shell` — 桌面端窗口框架与布局

### AI
- `ai-bot` — AI 助手作为系统好友、群聊机器人开关
- `ai-chat` — AI 对话能力（群聊 /ai 命令、AI 助手私聊）
- `ai-context` — 对话历史存储、滑动窗口上下文
- `ai-features` — 翻译、摘要、智能回复建议
- `ai-search` — 语义搜索、混合搜索策略、全局搜索
- `ai-search-ui` — 统一搜索面板 UI
- `ai-streaming` — WebSocket 流式回复协议与渲染
- `ai-stats` — AI 功能使用统计

### Frontend
- `chat-frontend-maintainability` — 前端可维护性规范
- `moments-feed` — 朋友圈动态
- `behavior-test-matrix` — 行为测试矩阵
