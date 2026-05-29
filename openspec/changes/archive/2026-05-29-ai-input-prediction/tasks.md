## 本次变更范围

- 只添加新功能，不修改现有功能逻辑
- 只在现有文件中添加代码，不创建新文件（除 hook 文件）
- 只添加新组件，不重构现有组件结构
- 只添加新字段，不修改现有字段

## 1. 类型定义和默认值

- [x] 1.1 在 `frontend/src/types/chat.ts` 的 `UserSettings` 接口中添加 `inputCompletion`、`completionGranularity`、`completionScope`、`questionPrediction`、`questionPredictionScope` 字段
- [x] 1.2 在 `frontend/src/utils/appHelpers.ts` 的 `DEFAULT_SETTINGS` 中设置新字段的默认值（全部为 false）

## 2. 后端 API 实现

- [x] 2.1 在 `internal/ai/service.go` 的 `AIService` 中添加 `Complete()` 方法，复用现有 `Chat()` 方法调用 AI 模型
- [x] 2.2 在 `internal/ai/service.go` 的 `AIService` 中添加 `PredictQuestion()` 方法，复用现有 `Chat()` 方法调用 AI 模型
- [x] 2.3 在 `internal/webserver/ai_routes.go` 中添加 `POST /api/ai/complete` 路由，复用现有认证中间件
- [x] 2.4 在 `internal/webserver/ai_routes.go` 中添加 `POST /api/ai/predict-question` 路由，复用现有认证中间件

## 3. 前端 Hook 实现

- [x] 3.1 创建 `frontend/src/hooks/useInputCompletion.ts`，实现输入补全逻辑
- [x] 3.2 创建 `frontend/src/hooks/useQuestionPrediction.ts`，实现问答预测逻辑

## 4. 前端组件实现

- [x] 4.1 在 `MessageComposer.tsx` 的 `.composer-input-wrap` 中添加 `<div class="ghost-overlay">` 元素
- [x] 4.2 在 `MessageComposer.tsx` 的 `.ai-suggestions` 下方添加 `<div class="question-prediction">` 元素
- [x] 4.3 在 `MessageComposer.tsx` 的 `onKeyDown` 事件中添加 Tab/Escape 处理，优先级高于现有 Tab 补全

## 5. 设置界面实现

- [x] 5.1 在 `SettingsDetail.tsx` 的"AI 功能" section 中添加输入补全开关
- [x] 5.2 在 `SettingsDetail.tsx` 的"AI 功能" section 中添加补全粒度选择（简单/中等/复杂）
- [x] 5.3 在 `SettingsDetail.tsx` 的"AI 功能" section 中添加输入补全作用范围选择
- [x] 5.4 在 `SettingsDetail.tsx` 的"AI 功能" section 中添加问答预测开关
- [x] 5.5 在 `SettingsDetail.tsx` 的"AI 功能" section 中添加问答预测作用范围选择

## 6. 样式实现

- [x] 6.1 在 `frontend/src/styles/chat/ai.css` 中添加 `.ghost-overlay` 样式（浅色文字、与 textarea 重叠、pointer-events: none）
- [x] 6.2 在 `frontend/src/styles/chat/ai.css` 中添加 `.question-prediction` 样式（显示在输入框下方、包含标题、问题和答案）

## 7. 测试和验证

- [ ] 7.1 在浏览器中测试输入补全功能：开启开关 → 输入文字 → 验证 ghost text 显示 → 按 Tab 验证补全 → 切换粒度验证 → 切换范围验证
- [ ] 7.2 在浏览器中测试问答预测功能：开启开关 → 输入文字 → 验证预测卡片显示 → 点击验证填入输入框 → 切换范围验证
- [ ] 7.3 在浏览器中测试开关关闭时：关闭开关 → 输入文字 → 验证 API 不被调用（Network 面板）
- [ ] 7.4 在浏览器中测试三个功能同时开启：同时开启所有开关 → 输入文字 → 验证三个功能独立显示
- [ ] 7.5 在浏览器中测试键盘事件：显示 ghost text → 按 Tab 验证补全 → 显示 ghost text → 按 Escape 验证取消 → 显示 ghost text → 继续输入验证消失
