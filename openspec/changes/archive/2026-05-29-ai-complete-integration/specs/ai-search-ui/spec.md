## Purpose

Describe the unified search panel UI for easyChat, including contact search, group search, and AI semantic search.

## Requirements

### Requirement: 统一搜索面板
系统 SHALL 提供统一的搜索面板，支持搜索联系人、群聊和聊天记录。

#### Scenario: 打开搜索面板
- **WHEN** 用户点击 ConversationList 的搜索栏
- **THEN** Sidebar 替换为 SearchPanel，搜索框自动聚焦

#### Scenario: 关闭搜索面板
- **WHEN** 用户按 Escape 或点击返回按钮
- **THEN** SearchPanel 关闭，恢复显示 ConversationList

### Requirement: 分类搜索结果
系统 SHALL 将搜索结果分为三类：联系人、群聊、聊天记录。

#### Scenario: 联系人搜索
- **WHEN** 用户输入关键词
- **THEN** 系统即时过滤联系人列表，匹配 name 和 username

#### Scenario: 群聊搜索
- **WHEN** 用户输入关键词
- **THEN** 系统即时过滤群聊列表，匹配 title

#### Scenario: 聊天记录搜索
- **WHEN** 用户输入关键词且 AI 搜索开启
- **THEN** 系统 debounce 500ms 后调用 AI 搜索 API，显示跨会话的聊天记录

### Requirement: 搜索结果展示
系统 SHALL 以卡片形式展示搜索结果，包含必要信息。

#### Scenario: 联系人结果
- **WHEN** 显示联系人搜索结果
- **THEN** 显示头像、名称、账号

#### Scenario: 群聊结果
- **WHEN** 显示群聊搜索结果
- **THEN** 显示头像、群名称、成员数量

#### Scenario: 聊天记录结果
- **WHEN** 显示聊天记录搜索结果
- **THEN** 显示会话名称、发送者、消息内容、时间

### Requirement: 搜索结果导航
系统 SHALL 支持点击搜索结果导航到对应位置。

#### Scenario: 点击联系人
- **WHEN** 用户点击联系人搜索结果
- **THEN** 系统切换到该联系人的私聊会话，关闭搜索面板

#### Scenario: 点击群聊
- **WHEN** 用户点击群聊搜索结果
- **THEN** 系统切换到该群聊会话，关闭搜索面板

#### Scenario: 点击聊天记录
- **WHEN** 用户点击聊天记录搜索结果
- **THEN** 系统切换到该消息所在的会话，跳转到该消息位置，关闭搜索面板

### Requirement: 搜索开关
系统 SHALL 允许用户开启或关闭 AI 语义搜索功能。

#### Scenario: 开关状态
- **WHEN** 用户在设置中开启"AI 语义搜索"
- **THEN** 搜索面板显示聊天记录分类
- **WHEN** 用户关闭开关
- **THEN** 搜索面板仅显示联系人和群聊分类
