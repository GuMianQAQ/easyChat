## Why

Phase 1 完成了 AI 基础架构（Provider 接口、OpenAI 实现、SSE 流式响应、WebSocket 集成）。Phase 2 继续实现剩余功能：AI 功能增强、上下文管理、语义搜索、测试和文档。

## What Changes

- 新增 AI 功能增强：翻译、摘要、智能回复建议、代码生成
- 新增上下文管理：对话历史存储、滑动窗口、上下文摘要
- 新增语义搜索：向量 embedding、FTS5 全文搜索、混合搜索
- 新增测试和文档

## Capabilities

### New Capabilities

- `ai-context`: AI 对话上下文管理，包括历史存储、滑动窗口、上下文摘要
- `ai-search`: 基于向量 embedding 的语义搜索

### Modified Capabilities

- `ai-features`: 扩展 AI 功能，添加翻译、摘要、智能回复、代码生成
- `messaging`: 在消息气泡中添加 AI 操作菜单

## Impact

- 新增数据库表：`ai_conversations`（对话历史）、`ai_embeddings`（向量存储）
- 前端新增组件：AI 操作菜单、智能回复建议条、代码块渲染
- 新增 API 端点：`/api/ai/translate`、`/api/ai/summarize`、`/api/ai/search`
