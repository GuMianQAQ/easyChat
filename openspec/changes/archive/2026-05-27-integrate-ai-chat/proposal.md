## Why

easyChat 目前的消息流仅支持用户与用户之间的通信。随着 AI 能力的普及，在聊天中集成 AI 辅助功能（智能回复、翻译、摘要等）已成为现代通讯工具的基本预期。本项目作为学习项目，集成 AI 是学习当前最有价值的技术栈（LLM API、流式响应、向量搜索）的最佳切入点。

## What Changes

- 新增 AI 机器人功能：用户可通过 `/ai` 前缀在聊天中向 AI 发起对话
- 新增流式响应支持：AI 回复以 SSE 流式传输，逐字渲染
- 新增 AI 功能矩阵：在现有功能中嵌入 AI 能力（翻译、摘要、智能回复建议等）
- 新增语义搜索：基于向量 embedding 的聊天记录语义搜索

## Capabilities

### New Capabilities

- `ai-chat`: AI 机器人对话能力，包括 `/ai` 命令、流式响应、上下文管理
- `ai-features`: AI 增强功能，包括翻译、摘要、智能回复建议、代码生成等
- `ai-search`: 基于向量 embedding 的语义搜索，包括 FTS5 全文搜索和向量相似度搜索

### Modified Capabilities

- `messaging`: 需要扩展消息类型以支持 AI 流式消息和 AI 功能菜单

## Impact

- 新增 Go 依赖：需要引入 LLM API 客户端库（如 `go-openai`）
- 新增数据库表：`ai_users`（AI 系统用户）、`ai_conversations`（AI 对话上下文）、`ai_embeddings`（向量存储）
- 前端新增组件：AI 气泡样式、流式渲染组件、语义搜索界面
- 新增 API 端点：`GET /api/ai/stream`（SSE 流式端点）、`POST /api/ai/chat`（同步端点）、`GET /api/ai/search`（语义搜索）
- 配置变更：需要添加 LLM API key 和模型配置
