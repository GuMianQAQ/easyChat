# AI 功能使用指南

## 快速开始

### 1. 配置 AI 服务

复制 `.env.example` 为 `.env`，填入你的配置：

```bash
EASYCHAT_AI_PROVIDER=openai
EASYCHAT_AI_API_KEY=你的API密钥
EASYCHAT_AI_MODEL=gpt-3.5-turbo
EASYCHAT_AI_BASE_URL=
```

### 2. 启动服务

```bash
go run main.go
```

## 功能说明

### AI 助手私聊

在好友列表中找到"AI 助手"，点进去直接对话。不需要任何前缀。

```
你: 你好
AI: 你好！有什么可以帮你的吗？
```

### AI 功能命令

在 AI 助手私聊中可以使用以下命令：

| 命令 | 说明 | 示例 |
|------|------|------|
| `/ai` | 与 AI 对话 | `/ai 帮我写首诗` |
| `/code` | 生成代码 | `/code 写一个 HTTP 服务器` |

### 群聊 AI 机器人

群主可以在群设置中开启"群机器人"开关。开启后群成员可以使用 `/ai` 命令。

```
你: /ai Go语言怎么写 HTTP 服务
AI: 你可以使用 Gin 框架...
```

### 消息翻译

右键点击任意消息，选择"翻译"，即可查看 AI 翻译结果。

### 功能开关

在 `.env` 中可以控制各功能的开关：

```bash
EASYCHAT_AI_ENABLE_CHAT=true      # AI 对话
EASYCHAT_AI_ENABLE_STREAM=true    # 流式响应
EASYCHAT_AI_ENABLE_TOOLS=true     # 翻译/摘要/回复建议/代码生成
EASYCHAT_AI_ENABLE_SEARCH=true    # 语义搜索
```

设为 `false` 关闭对应功能。

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/ai/stream` | SSE 流式对话 |
| POST | `/api/ai/chat` | 同步对话 |
| POST | `/api/ai/translate` | 翻译 |
| POST | `/api/ai/summarize` | 摘要 |
| POST | `/api/ai/generate-replies` | 生成回复建议 |
| POST | `/api/ai/generate-code` | 生成代码 |
| GET | `/api/ai/search?q=&conversationId=` | 语义搜索 |
| GET | `/api/ai/stats` | 使用统计 |
| PATCH | `/api/groups/:id/bot` | 群机器人开关 |
