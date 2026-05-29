## Context

当前 easyChat 项目已有"智能回复建议"功能，基于收到的消息生成 3 条回复建议显示在输入框下方。现在需要新增两个独立的 AI 辅助输入功能：

1. **输入补全**：类似 IDE 的 Tab 补全，在光标后显示 ghost text
2. **问答预测**：根据输入片段预测问题并给出答案，显示在输入框下方

现有架构：
- 前端：React 18 + TypeScript + Vite + Electron
- 后端：Go + Gin + GORM + SQLite + WebSocket
- AI：支持 OpenAI 和 Ollama 两种 provider
- 设置：UserSettings 接口 + localStorage 持久化

## Goals / Non-Goals

**Goals:**
- 提供流畅的输入补全体验，ghost text 渲染性能良好
- 提供准确的问答预测，答案简洁有用
- 开关关闭时彻底切断 API 调用，避免 token 浪费
- 三个 AI 功能（回复建议、输入补全、问答预测）独立运行互不干扰
- 设置界面清晰，用户可独立控制每个功能

**Non-Goals:**
- 不实现复杂的上下文感知（如聊天历史分析）
- 不实现本地缓存预测结果
- 不实现实时流式预测
- 不修改现有"智能回复建议"功能的逻辑

## Decisions

### 1. Ghost Text 渲染方案：Overlay

**决策**：使用 overlay 方案，在 textarea 上方覆盖一个 div 显示 ghost text。

**理由**：
- 实现简单，不改变现有 textarea 逻辑
- 性能好，只需同步滚动位置
- 兼容性好，不依赖 contenteditable

**替代方案**：
- contenteditable：更灵活，但需要重写大量逻辑，处理换行、粘贴等复杂场景

**实现细节**：
```
.composer-input-wrap (position: relative)
    ├── <textarea> (z-index: 1)
    └── <div class="ghost-overlay"> (z-index: 2, pointer-events: none)
```

需要同步：字体、字号、行高、padding、滚动位置

### 2. Hook 架构：两个独立 Hook

**决策**：创建 `useInputCompletion` 和 `useQuestionPrediction` 两个独立 hook。

**理由**：
- 职责分离，逻辑清晰
- 便于测试和维护
- 开关关闭时直接返回空，不调用 API

**Hook 接口设计**：
```typescript
// useInputCompletion
interface UseInputCompletionProps {
  content: string;
  enabled: boolean;
  granularity: 'simple' | 'medium' | 'complex';
  scope: 'all' | 'ai' | 'normal';
  isAIAssistant: boolean;
  token: string;
}

interface UseInputCompletionReturn {
  completion: string;
  acceptCompletion: () => void;
  dismissCompletion: () => void;
}

// useQuestionPrediction
interface UseQuestionPredictionProps {
  content: string;
  enabled: boolean;
  scope: 'all' | 'ai' | 'normal';
  isAIAssistant: boolean;
  token: string;
}

interface UseQuestionPredictionReturn {
  question: string;
  answer: string;
  loading: boolean;
}
```

### 3. 作用范围控制：前端判断

**决策**：在前端 hook 中判断当前会话是否在作用范围内。

**理由**：
- 减少不必要的 API 调用
- 逻辑简单，只需检查 `isAIAssistant` 和 `scope` 配置
- 后端无需感知作用范围

**判断逻辑**：
```typescript
function inScope(scope: string, isAIAssistant: boolean): boolean {
  if (scope === 'all') return true;
  if (scope === 'ai') return isAIAssistant;
  if (scope === 'normal') return !isAIAssistant;
  return false;
}
```

### 4. 防抖策略：500ms

**决策**：使用 500ms 防抖，与现有回复建议功能保持一致。

**理由**：
- 平衡响应速度和 API 调用频率
- 用户停止输入后 500ms 触发预测
- 避免频繁调用导致的性能问题

### 5. 错误处理：静默失败

**决策**：API 返回空或异常时，静默处理，不显示错误提示。

**理由**：
- 预测功能是"锦上添花"，失败不应打扰用户
- 用户继续正常输入即可
- 避免显示错误提示影响用户体验

### 6. 补全粒度 Prompt 设计

**决策**：根据粒度参数调整 system prompt，限制预测长度。

**理由**：
- 简单模式：预测下一个词（1-4 个字），快速响应
- 中等模式：预测下一个短语（2-8 个字），平衡准确性和长度
- 复杂模式：预测下一句话（最多 20 个字），更完整但可能不够精准

**Prompt 示例**：
```
简单："预测用户接下来要输入的一个词（最多4个字）。只返回预测的词。"
中等："预测用户接下来要输入的一个短语（2-8个字）。只返回预测的短语。"
复杂："预测用户接下来要输入的一句话（最多20个字）。只返回预测的句子。"
```

## Risks / Trade-offs

### 风险 1：Ghost Text 渲染性能

**风险**：频繁更新 ghost text 可能导致渲染卡顿。

**缓解**：
- 使用 500ms 防抖减少更新频率
- 使用 `requestAnimationFrame` 优化滚动同步
- 避免不必要的重渲染

### 风险 2：AI 预测准确性

**风险**：AI 预测的内容可能不符合用户预期。

**缓解**：
- 用户可以忽略预测继续输入
- 按 Escape 取消预测
- 预测失败时静默处理

### 风险 3：Token 消耗

**风险**：频繁调用 AI API 可能导致 token 消耗过高。

**缓解**：
- 开关关闭时彻底切断 API 调用
- 500ms 防抖减少调用频率
- 输入少于 2 个字时不请求
- 预测长度限制减少 token 消耗

### 风险 4：Tab 键冲突

**风险**：输入补全和回复建议同时开启时，Tab 键可能冲突。

**缓解**：
- 输入补全的 Tab 优先级更高（因为是 inline 显示）
- 回复建议使用点击方式选择
- 两个功能独立运行，互不干扰

### 权衡：预测准确性 vs 响应速度

**权衡**：更复杂的预测需要更多时间，可能影响用户体验。

**决策**：使用 500ms 防抖 + 粒度选择，让用户自己权衡。
