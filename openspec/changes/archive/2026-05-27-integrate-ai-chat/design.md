## Context

easyChat 是一个基于 Go + React + Electron 的桌面聊天应用，当前支持私聊、群聊、朋友圈等功能。消息流通过 WebSocket 实现，后端使用 Gin + GORM + SQLite。

本次变更将在现有架构上集成 AI 能力，包括 AI 对话、流式响应、功能增强和语义搜索。

## Goals / Non-Goals

**Goals:**
- 在现有聊天流中无缝集成 AI 对话能力
- 实现流式响应，提供类似 ChatGPT 的逐字显示体验
- 在现有功能中嵌入 AI 能力（翻译、摘要、智能回复）
- 建立可扩展的 AI 服务架构，支持未来添加更多 AI 功能
- 学习 LLM API 调用、流式协议、向量搜索等核心技术

**Non-Goals:**
- 不实现多模态 AI（图像生成、语音识别）
- 不实现 AI 训练或微调
- 不实现复杂的 AI 工作流自动化
- 不替换现有的用户认证系统

## Decisions

### 1. AI 服务架构：Provider 模式

**决定**: 采用 Provider 模式，抽象 AI 服务接口，支持多个 LLM 提供商。

**理由**:
- 避免绑定单一 LLM 提供商
- 方便切换和测试不同的 AI 服务
- 为未来支持本地模型（如 Ollama）预留接口

**实现**:
```go
// internal/ai/provider.go
type Provider interface {
    Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error)
    Stream(ctx context.Context, req ChatRequest) (<-chan StreamChunk, error)
    Embed(ctx context.Context, text string) ([]float64, error)
}
```

### 2. 流式响应：SSE over WebSocket

**决定**: 使用 SSE（Server-Sent Events）实现流式响应，而不是复用现有 WebSocket。

**理由**:
- SSE 是 HTTP 标准协议，更适合单向流式数据
- 不干扰现有的 WebSocket 消息流
- 前端使用 EventSource API，实现简单
- 更好的错误处理和重连机制

**备选方案**:
- 复用 WebSocket：会增加协议复杂度，需要区分消息类型
- HTTP 长轮询：延迟高，实现复杂

### 3. AI 消息标识：特殊 Sender ID

**决定**: 使用特殊的 Sender ID（如 `ai-assistant`）标识 AI 消息。

**理由**:
- 复用现有消息结构，无需修改数据库 schema
- 前端根据 Sender ID 渲染不同的气泡样式
- 保持消息流的一致性

### 4. 向量存储：SQLite + 自定义向量列

**决定**: 在 SQLite 中使用 BLOB 列存储向量，实现简单的向量搜索。

**理由**:
- 避免引入额外的向量数据库
- 对于学习项目，数据量通常不大
- 可以使用 SQLite 的 JSON 函数进行向量计算

**备选方案**:
- 使用专门的向量数据库（如 Milvus）：增加部署复杂度
- 使用 pgvector：需要切换到 PostgreSQL

### 5. 上下文管理：滑动窗口 + 摘要

**决定**: 使用滑动窗口管理 AI 对话上下文，当历史过长时自动摘要。

**理由**:
- 平衡上下文长度和 API 调用成本
- 避免超出 LLM 的上下文窗口限制
- 保持对话的连贯性

## Risks / Trade-offs

### 风险 1: LLM API 调用成本
**风险**: 频繁调用 LLM API 可能产生较高费用。
**缓解**: 
- 实现本地缓存，避免重复调用
- 设置调用频率限制
- 支持本地模型作为低成本替代方案

### 风险 2: 流式响应延迟
**风险**: 网络波动可能导致流式响应不流畅。
**缓解**:
- 实现重连机制
- 支持降级到同步响应
- 优化前端渲染性能

### 风险 3: AI 消息污染聊天记录
**风险**: AI 消息可能干扰正常的聊天体验。
**缓解**:
- AI 消息使用特殊样式，与用户消息区分
- 支持折叠/展开 AI 消息
- 提供清除 AI 消息的选项

### 风险 4: 向量搜索精度
**风险**: 简单的向量搜索可能精度不够。
**缓解**:
- 实现混合搜索（关键词 + 语义）
- 支持搜索结果重排序
- 优化 embedding 模型选择

## Migration Plan

### 阶段 1: 基础 AI 对话（1-2 周）
1. 实现 AI 服务 Provider 接口
2. 集成 OpenAI API 作为第一个 Provider
3. 实现 `/ai` 命令和基本对话功能
4. 添加 AI 系统用户

### 阶段 2: 流式响应（1 周）
1. 实现 SSE 端点
2. 前端实现流式渲染组件
3. 优化流式响应的用户体验

### 阶段 3: AI 功能增强（2-3 周）
1. 实现翻译、摘要、智能回复等功能
2. 在消息气泡中集成 AI 操作
3. 优化 prompt 设计

### 阶段 4: 语义搜索（1-2 周）
1. 实现向量 embedding 服务
2. 在 SQLite 中存储和索引向量
3. 实现混合搜索算法
4. 前端实现搜索界面

### 回滚策略
- 每个阶段独立部署，可单独回滚
- AI 功能通过配置开关控制
- 保留原有的消息处理逻辑，AI 功能作为增强层

## Open Questions

1. **LLM 模型选择**: 优先使用 OpenAI 的哪个模型？（GPT-4、GPT-3.5-turbo）
2. **上下文窗口大小**: 滑动窗口应该保留多少条历史消息？
3. **Embedding 模型**: 使用 OpenAI 的 text-embedding-ada-002 还是其他模型？
4. **本地模型支持**: 是否需要支持 Ollama 等本地模型？
5. **AI 功能权限**: 是否需要限制 AI 功能的使用频率或权限？
