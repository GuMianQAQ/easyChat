## Context

easyChat 是一个基于 Go + React + WebSocket 的实时聊天项目，当前群聊功能仅支持基本的创建、修改、退出/解散操作。本次增强需要在现有架构基础上扩展群聊功能，涵盖权限管理、内容管理、互动功能等多个维度。

现有架构：
- 后端：Go + Gin + GORM + SQLite
- 前端：React + TypeScript + Vite
- 通信：WebSocket 实时推送
- 数据库：SQLite 单文件

## 术语说明

| 术语 | 英文 | 说明 |
|------|------|------|
| 群主 | owner | 群聊创建者，拥有所有权限 |
| 管理员 | admin | 群主设置的管理者，可踢人、禁言、修改群信息 |
| 普通成员 | member | 普通群成员，只能发送消息和退出群聊 |
| 精华消息 | pinned message | 管理员标记的重要消息 |
| 公告置顶 | announcement pin | 群公告在聊天顶部显示 |

## Goals / Non-Goals

**Goals:**

- 建立完整的群聊权限体系（owner/admin/member 三级角色）
- 实现群聊互动功能（@、投票、接龙）
- 实现群聊内容管理（精华消息、文件列表、相册）
- 实现群聊管理功能（禁言、权限设置、邀请链接）
- 保持现有架构不变，复用现有基础设施

**Non-Goals:**

- 不引入 Redis 或其他外部依赖
- 不改变现有数据库（SQLite）
- 不重构现有群聊功能
- 不实现音视频通话
- 不实现消息已读回执

## Decisions

### 1. 角色权限体系

**决策**：扩展 conversation_members.role 字段，支持 owner/admin/member 三级角色

**备选方案**：
- A. 新增 permissions 表存储细粒度权限 → 过度设计，单用户场景不需要
- B. 权限定义存储在成员级别 → 权限定义是群级别的（如"谁能改群名"），不应跟随成员

**理由**：
- 简单直接，符合现有数据模型
- 权限检查只需查询 conversation_members 表
- 易于扩展（后续可加 moderator 等角色）

### 2. 禁言实现

**决策**：在 conversation_members 表新增 muted_until 字段

**备选方案**：
- A. 新增 mutes 表 → 多余，一个成员在一个群只需要一个禁言记录
- B. 用 JSON 字段存储禁言历史 → 不需要历史，只需要当前状态

**理由**：
- 最简实现，一个字段解决问题
- 发送消息时检查 muted_until > now()
- 支持临时禁言和永久禁言

### 3. 群权限设置

**决策**：在 conversations 表新增 permissions JSON 字段

**权限项示例**：
```json
{
  "who_can_change_name": "admin",
  "who_can_change_avatar": "admin", 
  "who_can_change_announcement": "admin",
  "who_can_create_vote": "all",
  "mute_all": false
}
```

**理由**：
- 权限项是固定的，不需要动态扩展
- JSON 字段足够灵活，且查询简单
- 默认值可由应用层控制

### 4. @ 功能实现

**决策**：消息内容中保留 @ 标记（如 `@user_id`），前端渲染时替换为高亮显示

**备选方案**：
- A. 新增 mentions 表存储 @ 关系 → 多余，消息内容已包含信息
- B. 用特殊消息类型 → 增加复杂度，@ 是文本的一部分

**理由**：
- 最简实现，不需要额外存储
- 前端解析 `@user_id` 并渲染为高亮
- WebSocket 推送时携带 mentioned_users 字段

### 5. 群公告置顶

**决策**：复用现有 conversations.announcement 字段，前端顶部展示

**理由**：
- 已有数据，无需改动后端
- 前端 ChatView 顶部显示公告条
- 公告更新时通过 WebSocket 推送

### 6. 群投票/接龙

**决策**：新增独立表存储投票/接龙数据

**投票表结构**：
- votes: 投票基本信息
- vote_options: 投票选项
- vote_records: 投票记录

**接龙表结构**：
- solitaires: 接龙基本信息
- solitaire_items: 接龙项目

**理由**：
- 投票/接龙是独立实体，需要独立存储
- 支持复杂查询（结果统计、参与状态）
- 消息类型新增 "vote"/"solitaire"，内容存储 ID

### 7. 精华消息/文件列表/相册

**决策**：精华消息新增 group_pinned_messages 表；文件列表/相册通过查询现有 messages 表实现

**理由**：
- 精华消息需要独立标记，不能复用现有字段
- 文件/图片已在 messages 表中，只需筛选查询
- 避免数据冗余

### 8. 群邀请链接

**决策**：新增 group_invites 表，支持链接生成、有效期、使用次数

**理由**：
- 邀请链接是独立实体
- 需要验证有效性（过期、已用完）
- 支持统计使用情况

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 权限检查增加查询开销 | 低 | 索引优化，缓存成员信息 |
| @ 功能前端解析复杂 | 中 | 定义清晰的 @ 标记格式，提供解析工具函数 |
| 投票/接龙实时更新 | 中 | 复用 WebSocket 推送机制 |
| 新增表增加数据库体积 | 低 | 单用户场景，数据量有限 |
| 前端组件数量增加 | 低 | 合理组织组件结构，复用通用组件 |

## Migration Plan

### 数据库迁移

1. 新增表：group_pinned_messages, group_invites, votes, vote_options, vote_records, solitaires, solitaire_items
2. 扩展字段：conversation_members.role 枚举扩展、muted_until；conversations.permissions
3. 使用 GORM AutoMigrate 自动迁移
4. 现有群聊的 permissions 字段初始化为默认值：`{"who_can_change_name":"admin","who_can_change_avatar":"admin","who_can_change_announcement":"admin","who_can_create_vote":"all","who_can_create_solitaire":"all","mute_all":false}`

### 接口兼容策略

| 接口 | 变更类型 | 兼容策略 |
|------|---------|---------|
| 群成员列表接口 | 扩展返回值 | 新增 role 和 muted_until 字段，不改变现有字段 |
| 修改群名接口 | 添加权限检查 | 在现有处理函数开头添加检查，检查失败返回 403 错误 |
| 修改群头像接口 | 添加权限检查 | 同上 |
| 修改群公告接口 | 添加权限检查 | 同上 |
| 消息发送（WebSocket） | 添加禁言检查 | 在现有处理函数开头添加检查，检查失败返回错误消息 |
| 创建群聊接口 | 初始化权限 | 创建群聊时自动设置 permissions 为默认值 |

**原则**：
- 只新增字段，不删除或修改现有字段
- 只新增检查逻辑，不改变现有业务流程
- 检查失败返回明确错误信息，不影响现有功能

### WebSocket 事件设计

新增事件类型，复用现有 Hub.BroadcastPrivate 函数：

| 事件类型 | 触发时机 | 数据格式 | 推送目标 |
|---------|---------|---------|---------|
| announcement_update | 群公告修改时 | `{"type":"announcement_update","conversationId":"xxx","content":"新公告内容"}` | 群所有成员 |
| mention | 消息包含 @user_id 时 | `{"type":"mention","conversationId":"xxx","messageId":"xxx","senderName":"xxx","content":"消息内容摘要"}` | 被 @ 的用户 |
| vote_update | 投票创建或结果更新时 | `{"type":"vote_update","conversationId":"xxx","voteId":"xxx"}` | 群所有成员 |

**实现方式**：
- 在现有 webchat.Message 结构中添加新类型
- 复用现有 Hub.BroadcastPrivate 函数推送
- 前端通过现有 WebSocket 监听机制接收

### 部署步骤

1. 后端：更新代码，重启服务（自动迁移）
2. 前端：构建新版本，替换静态资源
3. 无数据迁移，无破坏性变更

### 回滚策略

- 代码回滚：恢复到上一个版本
- 数据库回滚：新增表不影响现有功能，可保留

## Decisions (补充)

### 9. 管理员权限边界

**决策**：只有群主可以撤销其他管理员，管理员不能互相撤销

**理由**：
- 避免管理员之间的权限冲突
- 简化权限逻辑

### 10. 禁言解禁方式

**决策**：支持解禁，设置 muted_until 为过去时间即可

**理由**：
- 实现简单，无需额外字段
- 自动解禁通过 muted_until < now() 判断

### 11. 投票匿名选项

**决策**：支持匿名投票，通过 anonymous 字段控制

**理由**：
- 匿名投票是常见需求
- 实现简单，查询时判断是否显示投票人

### 12. 邀请链接默认有效期

**决策**：默认 7 天，可自定义（1天、7天、30天、永久）

**理由**：
- 7 天是平衡安全性和便利性的合理默认值
- 提供灵活选项满足不同场景
