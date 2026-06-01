# AI 功能设计文档

## 架构概览

### 后端架构
`
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Server    │───▶│   AI Service    │───▶│  AI Provider    │
│   (Gin/HTTP)    │    │   (Business)    │    │ (OpenAI/Ollama) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
`

### 核心组件

#### 1. AI Service (internal/ai/)
- **service.go**: 主服务，处理对话、翻译、摘要等
- **config.go**: 配置管理（API Key、模型、超时等）
- **openai.go**: OpenAI 提供商实现
- **provider.go**: 提供商接口定义
- **stats.go**: 使用统计
- **system_user.go**: AI 系统用户管理

#### 2. Web Routes (internal/webserver/)
- **ai_routes.go**: AI 相关 API 路由
  - POST /api/ai/chat - 同步对话
  - POST /api/ai/chat/stream - 流式对话（SSE）
  - POST /api/ai/translate - 翻译
  - POST /api/ai/summarize - 摘要
  - POST /api/ai/complete - 补全
  - POST /api/ai/search - 语义搜索

#### 3. 前端组件 (rontend/src/components/)
- **AIChatView.tsx**: AI 对话界面
- **AIAssistant.tsx**: AI 助手面板
- **AISettings.tsx**: AI 设置页面

### 数据流

#### 同步对话
`
用户输入 → HTTP POST → AI Service → OpenAI API → 响应返回
`

#### 流式对话
`
用户输入 → HTTP POST → AI Service → OpenAI Stream → SSE 推送 → 前端渲染
`

#### 群聊 AI 机器人
`
群消息 → WebSocket → Hub → AI Service → 广播响应
`

## 配置管理

### 环境变量
`ash
EASYCHAT_AI_PROVIDER=openai          # 提供商
EASYCHAT_AI_API_KEY=sk-xxx           # API Key
EASYCHAT_AI_MODEL=gpt-3.5-turbo     # 模型
EASYCHAT_AI_BASE_URL=               # 自定义 API 地址
EASYCHAT_AI_ENABLE_CHAT=true        # 启用对话
EASYCHAT_AI_ENABLE_STREAM=true      # 启用流式
EASYCHAT_AI_ENABLE_TOOLS=true       # 启用工具
EASYCHAT_AI_ENABLE_SEARCH=true      # 启用搜索
`

### YAML 配置 (config/ai.yaml)
`yaml
provider: openai
api_key: 
model: gpt-3.5-turbo
temperature: 0.7
max_tokens: 2000
timeout:
  chat: 30
  stream: 60
`

## 安全考虑

1. **API Key 保护**: 通过环境变量或 .local.yaml 配置，不提交到版本控制
2. **速率限制**: 建议在生产环境配置速率限制
3. **输入验证**: 所有用户输入都经过验证和清理
4. **错误处理**: 不向用户暴露内部错误详情

## 性能优化

1. **流式响应**: 减少首字节时间，提升用户体验
2. **连接池**: HTTP 客户端复用连接
3. **超时控制**: 可配置的超时时间
4. **缓存**: 对话历史缓存（可选）

## 扩展点

1. **新增 AI 提供商**: 实现 Provider 接口
2. **自定义提示词**: 通过配置文件覆盖默认提示词
3. **工具集成**: 通过 Function Calling 集成外部工具
4. **多模态支持**: 预留图像、音频处理接口
