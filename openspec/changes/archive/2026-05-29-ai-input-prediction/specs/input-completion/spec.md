## ADDED Requirements

### Requirement: Ghost text 显示
系统 SHALL 在用户输入时，在光标后显示浅色 ghost text 预测内容。

#### Scenario: 输入触发预测
- **WHEN** 用户输入内容且输入补全功能开启
- **THEN** 系统在 500ms 防抖后调用 `/api/ai/complete` API
- **THEN** 在光标后显示浅色 ghost text 预测内容

#### Scenario: 开关关闭
- **WHEN** 输入补全功能开关关闭
- **THEN** 系统不调用任何 API
- **THEN** 不显示 ghost text

#### Scenario: 输入长度不足
- **WHEN** 用户输入少于 2 个字
- **THEN** 系统不调用 API
- **THEN** 不显示 ghost text

### Requirement: Tab 键接受补全
系统 SHALL 支持按 Tab 键接受 ghost text 补全内容。

#### Scenario: 接受补全
- **WHEN** ghost text 显示时用户按 Tab 键
- **THEN** 补全内容被添加到输入框
- **THEN** ghost text 消失

#### Scenario: 取消补全
- **WHEN** ghost text 显示时用户按 Escape 键
- **THEN** ghost text 消失
- **THEN** 输入框内容不变

#### Scenario: 继续输入
- **WHEN** ghost text 显示时用户继续输入
- **THEN** ghost text 立即消失
- **THEN** 用户输入的内容被添加到输入框

### Requirement: 补全粒度控制
系统 SHALL 支持三种补全粒度：简单、中等、复杂。

#### Scenario: 简单粒度
- **WHEN** 补全粒度设置为"简单"
- **THEN** 预测下一个词（1-4 个字）

#### Scenario: 中等粒度
- **WHEN** 补全粒度设置为"中等"
- **THEN** 预测下一个短语（2-8 个字）

#### Scenario: 复杂粒度
- **WHEN** 补全粒度设置为"复杂"
- **THEN** 预测下一句话（最多 20 个字）

### Requirement: 作用范围控制
系统 SHALL 支持三种作用范围：所有会话、仅 AI 助手会话、仅普通会话。

#### Scenario: 所有会话
- **WHEN** 作用范围设置为"所有会话"
- **THEN** 在所有会话中启用输入补全

#### Scenario: 仅 AI 助手会话
- **WHEN** 作用范围设置为"仅 AI 助手会话"
- **THEN** 仅在与 AI 助手的会话中启用输入补全

#### Scenario: 仅普通会话
- **WHEN** 作用范围设置为"仅普通会话"
- **THEN** 仅在普通会话中启用输入补全

### Requirement: 错误静默处理
系统 SHALL 在 API 调用失败时静默处理，不显示错误提示。

#### Scenario: API 返回空
- **WHEN** API 返回空字符串或 null
- **THEN** 不显示 ghost text
- **THEN** 不显示错误提示

#### Scenario: API 调用失败
- **WHEN** API 调用失败（网络错误、超时等）
- **THEN** 不显示 ghost text
- **THEN** 不显示错误提示

### Requirement: 设置界面
系统 SHALL 在设置界面提供输入补全功能的开关和配置选项。

#### Scenario: 开关控制
- **WHEN** 用户在设置中切换输入补全开关
- **THEN** 设置被保存到 localStorage
- **THEN** 下次输入时使用新配置

#### Scenario: 粒度选择
- **WHEN** 用户在设置中选择补全粒度
- **THEN** 设置被保存到 localStorage
- **THEN** 后续预测使用新的粒度

#### Scenario: 范围选择
- **WHEN** 用户在设置中选择作用范围
- **THEN** 设置被保存到 localStorage
- **THEN** 功能在对应会话中生效
