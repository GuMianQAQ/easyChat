## Why

用户在聊天时需要更高效的输入体验。当前系统只有基于收到消息的"智能回复建议"功能，但缺少两个关键能力：
1. **输入补全**：用户输入时预测接下来要打的字，类似 IDE 的 Tab 补全，减少打字量
2. **问答预测**：用户输入片段时，自动预测可能的问题并给出答案，让用户无需完整输入问题即可获取信息

这两个功能可以显著提升聊天效率，特别是对于常见问题和长句输入场景。

## What Changes

- 新增"输入补全"功能：用户输入时在光标后显示 ghost text 预测，按 Tab 接受补全
  - 支持三种补全粒度：简单（下一个词）、中等（下一个短语）、复杂（下一句话）
  - 支持作用范围选择：所有会话、仅 AI 助手会话、仅普通会话
- 新增"问答预测"功能：用户输入片段时，在输入框下方显示预测的问题和答案
  - 只显示一个预测结果，无需用户选择
  - 支持作用范围选择
- 新增后端 API：`/api/ai/complete` 和 `/api/ai/predict-question`
- 在设置界面新增两个独立开关，关闭时彻底切断 API 调用，避免 token 浪费
- 保留现有"智能回复建议"功能，三个功能独立运行互不干扰

## Capabilities

### New Capabilities

- `input-completion`: 输入补全功能，包括 ghost text 渲染、Tab 补全交互、补全粒度控制、作用范围判断
- `question-prediction`: 问答预测功能，包括问题预测、答案生成、预测结果卡片显示

### Modified Capabilities

（无现有 capability 需要修改）

## Impact

**前端影响：**
- `MessageComposer.tsx`：新增 ghost overlay 渲染层和预测结果卡片
- `SettingsDetail.tsx`：新增两个功能的设置项（开关、粒度选择、范围选择）
- `types/chat.ts`：扩展 `UserSettings` 接口
- `utils/appHelpers.ts`：更新默认设置
- 新增两个自定义 hook：`useInputCompletion` 和 `useQuestionPrediction`

**后端影响：**
- 新增 `internal/ai/service.go` 中的 `Complete()` 和 `PredictQuestion()` 方法
- 新增 `internal/webserver/ai_routes.go` 中的两个 API 端点
- AI prompt 设计和调用逻辑

**依赖影响：**
- 无新增外部依赖，复用现有 AI provider（OpenAI/Ollama）
