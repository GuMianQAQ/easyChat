## ADDED Requirements

### Requirement: 消息翻译功能
系统 SHALL 支持用户对任意消息进行 AI 翻译，翻译结果 SHALL 以特殊形式显示在消息下方或替换原消息。

#### Scenario: 用户翻译消息
- **WHEN** 用户右键点击消息并选择"翻译"
- **THEN** 系统调用 AI 翻译 API，将翻译结果显示在消息下方

#### Scenario: 翻译目标语言选择
- **WHEN** 用户选择翻译功能时
- **THEN** 系统 SHALL 提供语言选择，默认为用户系统语言

### Requirement: 消息摘要功能
系统 SHALL 支持对群聊未读消息进行 AI 摘要，生成简洁的内容概要。

#### Scenario: 用户请求未读摘要
- **WHEN** 用户点击群聊的"摘要"按钮
- **THEN** 系统将未读消息发送给 AI，生成摘要并以系统消息形式显示

#### Scenario: 摘要内容格式
- **WHEN** AI 生成摘要后
- **THEN** 摘要 SHALL 包含关键话题、主要结论和待办事项（如有）

### Requirement: 智能回复建议
系统 SHALL 在用户收到消息后，基于消息内容自动生成智能回复建议。

#### Scenario: 生成回复建议
- **WHEN** 用户收到新消息
- **THEN** 系统在消息输入框下方显示 2-3 个智能回复建议

#### Scenario: 用户选择建议
- **WHEN** 用户点击某个回复建议
- **THEN** 建议内容自动填入消息输入框，用户可编辑后发送

### Requirement: 代码生成功能
系统 SHALL 支持通过 `/code` 命令请求 AI 生成代码。

#### Scenario: 用户请求代码生成
- **WHEN** 用户发送 `/code` 开头的消息
- **THEN** AI 生成代码并以代码块形式显示在聊天中

#### Scenario: 代码块渲染
- **WHEN** AI 返回代码内容时
- **THEN** 代码 SHALL 使用语法高亮渲染，支持复制功能
