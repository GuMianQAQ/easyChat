## ADDED Requirements

### Requirement: 问答预测显示
系统 SHALL 在用户输入时，在输入框下方显示预测的问题和答案。

#### Scenario: 输入触发预测
- **WHEN** 用户输入内容且问答预测功能开启
- **THEN** 系统在 500ms 防抖后调用 `/api/ai/predict-question` API
- **THEN** 在输入框下方显示预测的问题和答案

#### Scenario: 开关关闭
- **WHEN** 问答预测功能开关关闭
- **THEN** 系统不调用任何 API
- **THEN** 不显示预测结果

#### Scenario: 输入长度不足
- **WHEN** 用户输入少于 2 个字
- **THEN** 系统不调用 API
- **THEN** 不显示预测结果

### Requirement: 预测结果展示
系统 SHALL 以卡片形式展示预测的问题和答案。

#### Scenario: 正常显示
- **WHEN** API 返回有效的预测结果
- **THEN** 显示"你可能想知道:"标题
- **THEN** 显示预测的问题
- **THEN** 显示预测的答案（以 → 开头）

#### Scenario: 无预测结果
- **WHEN** API 返回空结果
- **THEN** 不显示预测卡片

#### Scenario: 加载状态
- **WHEN** API 正在调用中
- **THEN** 不显示预测卡片（避免闪烁）

#### Scenario: 点击预测结果
- **WHEN** 用户点击预测的问题
- **THEN** 问题被填入输入框
- **THEN** 预测卡片消失

### Requirement: 作用范围控制
系统 SHALL 支持三种作用范围：所有会话、仅 AI 助手会话、仅普通会话。

#### Scenario: 所有会话
- **WHEN** 作用范围设置为"所有会话"
- **THEN** 在所有会话中启用问答预测

#### Scenario: 仅 AI 助手会话
- **WHEN** 作用范围设置为"仅 AI 助手会话"
- **THEN** 仅在与 AI 助手的会话中启用问答预测

#### Scenario: 仅普通会话
- **WHEN** 作用范围设置为"仅普通会话"
- **THEN** 仅在普通会话中启用问答预测

### Requirement: 错误静默处理
系统 SHALL 在 API 调用失败时静默处理，不显示错误提示。

#### Scenario: API 返回空
- **WHEN** API 返回空结果或 null
- **THEN** 不显示预测卡片
- **THEN** 不显示错误提示

#### Scenario: API 调用失败
- **WHEN** API 调用失败（网络错误、超时等）
- **THEN** 不显示预测卡片
- **THEN** 不显示错误提示

### Requirement: 设置界面
系统 SHALL 在设置界面提供问答预测功能的开关和配置选项。

#### Scenario: 开关控制
- **WHEN** 用户在设置中切换问答预测开关
- **THEN** 设置被保存到 localStorage
- **THEN** 下次输入时使用新配置

#### Scenario: 范围选择
- **WHEN** 用户在设置中选择作用范围
- **THEN** 设置被保存到 localStorage
- **THEN** 功能在对应会话中生效

### Requirement: 与其他功能独立
问答预测功能 SHALL 与输入补全、智能回复建议功能独立运行。

#### Scenario: 同时开启多个功能
- **WHEN** 问答预测和输入补全同时开启
- **THEN** 两个功能独立显示，互不干扰
- **THEN** ghost text 显示在光标后
- **THEN** 预测卡片显示在输入框下方
- **THEN** 两个功能可以同时显示

#### Scenario: 与回复建议共存
- **WHEN** 问答预测和智能回复建议同时开启
- **THEN** 两个功能独立显示，互不干扰
- **THEN** 预测卡片显示在回复建议上方
- **THEN** 两个功能可以同时显示
