## Why

当前群聊功能较为基础，仅支持创建群聊、修改群名/头像/公告、退出/解散群聊等基本操作。随着聊天应用场景的复杂化，群聊需要更多协作和管理功能来提升用户体验。本次增强旨在让群聊功能更完整、更实用，覆盖权限管理、内容管理、互动功能等多个维度。

## What Changes

- 新增 @ 功能：群聊中可提及特定成员，被 @ 的人收到特殊提醒
- 新增群管理员角色：扩展 owner/admin/member 三级权限体系
- 新增群成员禁言：管理员可禁言指定成员
- 新增群权限设置：控制谁能改群名、谁能发消息等
- 新增群公告置顶：进入群聊时顶部显示公告
- 新增群转让：群主可将群主身份转让给其他成员
- 新增群消息精华：标记重要消息，方便后续查找
- 新增群文件列表：集中展示群内所有文件
- 新增群相册：集中展示群内所有图片
- 新增群邀请链接：通过链接邀请非好友入群
- 新增群投票：群内发起投票决策
- 新增群接龙：群内报名、排队、收集信息

## Capabilities

### New Capabilities

- `group-mention`: 群聊 @ 功能，包括成员选择器、消息高亮、提醒推送
- `group-admin`: 群管理员角色体系，包括角色扩展、权限检查、转让群主
- `group-mute`: 群成员禁言功能，包括禁言时长设置、发送前检查
- `group-permissions`: 群权限设置，包括权限项定义、权限检查中间件
- `group-announcement-pin`: 群公告置顶显示，包括公告更新提醒
- `group-pinned-messages`: 群消息精华功能，包括标记、列表、跳转
- `group-file-manager`: 群文件列表，包括筛选、搜索、分页
- `group-album`: 群相册功能，包括图片网格展示、按时间分组
- `group-invite-link`: 群邀请链接，包括链接生成、有效期设置、验证
- `group-vote`: 群投票功能，包括创建投票、投票、结果统计
- `group-solitaire`: 群接龙功能，包括发起接龙、参与接龙、列表展示

### Modified Capabilities

（无，本次为新增功能，不修改现有功能的需求）

## Impact

### 后端影响

- **数据库**：新增 7 张表（group_pinned_messages, group_invites, votes, vote_options, vote_records, solitaires, solitaire_items）
- **扩展字段**：conversation_members 表新增 role 枚举扩展、muted_until 字段；conversations 表新增 permissions JSON 字段
- **API 接口**：新增约 15 个 REST API 接口
- **WebSocket 事件**：新增 @ 提醒、投票结果更新等推送事件

### 前端影响

- **新增组件**：约 12 个新组件（MentionPicker, VoteCard, SolitaireCard 等）
- **修改组件**：MessageComposer（@ 触发）、MessageBubble（@ 高亮）、ChatView（公告置顶）、群设置页面（新增多个 tab）
- **状态管理**：新增投票、接龙等状态管理

### 依赖

- 无新增外部依赖
- 复用现有 WebSocket 基础设施
- 复用现有文件上传功能
