## 范围约束

**必须遵守**：
- 不重构现有群聊代码结构，只在现有基础上扩展
- 不修改现有 API 接口签名，只新增接口或在现有接口中添加检查逻辑
- 不重构现有前端组件，只新增组件或在现有组件上添加功能
- 不清理现有代码中的临时逻辑或遗留代码
- 不统一现有代码风格，新代码遵循现有风格
- 不添加数据库索引或触发器，只添加表和字段
- 不引入新的状态管理库，使用现有方式

## 1. 数据库模型扩展

- [x] 1.1 扩展 conversation_members 表：role 字段枚举扩展为 owner/admin/member，新增 muted_until 字段
- [x] 1.2 扩展 conversations 表：新增 permissions JSON 字段，默认值为 `{"who_can_change_name":"admin","who_can_change_avatar":"admin","who_can_change_announcement":"admin","who_can_create_vote":"all","who_can_create_solitaire":"all","mute_all":false}`
- [x] 1.3 新增 group_pinned_messages 表（id, conversation_id, message_id, pinned_by, created_at）
- [x] 1.4 新增 group_invites 表（id, conversation_id, code, created_by, expires_at, max_uses, use_count, created_at）
- [x] 1.5 新增 votes 表（id, conversation_id, creator_id, question, allow_multi, anonymous, deadline, created_at）
- [x] 1.6 新增 vote_options 表（id, vote_id, option_text, sort_order）
- [x] 1.7 新增 vote_records 表（id, vote_id, user_id, option_id, created_at）
- [x] 1.8 新增 solitaires 表（id, conversation_id, creator_id, title, created_at）
- [x] 1.9 新增 solitaire_items 表（id, solitaire_id, user_id, content, sort_order, created_at）
- [x] 1.10 更新 database.AutoMigrate 以包含新表，现有群聊的 permissions 字段初始化为默认值

## 2. 权限体系（group-admin）

- [x] 2.1 在 chatstore 包中实现 CheckPermission(userID, conversationID, action string) bool 函数
- [x] 2.2 在 webserver 包中实现 GroupPermissionMiddleware(action string) Gin 中间件
- [x] 2.3 实现设置管理员接口：POST /api/groups/:id/admin，仅 owner 可调用
- [x] 2.4 实现撤销管理员接口：DELETE /api/groups/:id/admin/:userId，仅 owner 可调用
- [x] 2.5 实现转让群主接口：POST /api/groups/:id/transfer，需要二次确认
- [x] 2.6 更新群成员列表接口，返回 role（owner/admin/member）和 muted_until 字段

## 3. 禁言功能（group-mute）

- [x] 3.1 实现禁言接口：POST /api/groups/:id/mute，参数包含 userId 和 duration（10m/1h/1d/forever）
- [x] 3.2 实现解除禁言接口：DELETE /api/groups/:id/mute/:userId，设置 muted_until 为过去时间
- [x] 3.3 在现有消息发送函数中添加禁言检查：如果 muted_until > now() 则拒绝发送；如果 mute_all=true 且角色为 member 则拒绝发送

## 4. 群权限设置（group-permissions）

- [x] 4.1 实现获取群权限接口：GET /api/groups/:id/permissions，返回 conversations.permissions JSON
- [x] 4.2 实现更新群权限接口：PUT /api/groups/:id/permissions，仅 owner 可调用
- [x] 4.3 在现有修改群名/头像/公告接口处理函数开头添加权限检查：根据 permissions[action] 和用户角色判断是否允许

## 5. 群公告置顶（group-announcement-pin）

- [x] 5.1 在现有修改群名/头像/公告接口中，当公告修改成功后，调用 Hub.BroadcastPrivate 向群成员推送 announcement_update 事件
- [x] 5.2 更新 ChatView 组件，顶部显示公告条（复用 conversations.announcement 字段）
- [x] 5.3 实现公告展开/收起功能（前端状态管理）
- [x] 5.4 前端监听 announcement_update 事件，收到后显示"公告已更新"提示

## 6. @ 功能（group-mention）

- [x] 6.1 后端：在消息保存时，调用 ParseMentions(content) []string 提取 @user_id 列表，通过 Hub.BroadcastPrivate 向被 @ 用户推送 mention 事件
- [x] 6.2 实现 MentionPicker 组件：输入 @ 时弹出成员选择列表，支持搜索过滤
- [x] 6.3 更新 MessageComposer 组件：监听 @ 输入，调用 MentionPicker
- [x] 6.4 前端：实现 ParseMentionsForDisplay(content) string 函数，将 @user_id 替换为 @昵称 并添加高亮样式
- [x] 6.5 更新 MessageBubble 组件：调用 ParseMentionsForDisplay 渲染消息内容
- [x] 6.6 前端监听 mention 事件，更新会话列表中对应群聊的 @ 标记状态
- [x] 6.7 @ 所有人：支持 @all 标记，向所有群成员推送 mention 事件

## 7. 精华消息（group-pinned-messages）

- [x] 7.1 实现标记精华消息接口：POST /api/groups/:id/pin，参数包含 messageId，仅 admin/owner 可调用
- [x] 7.2 实现取消精华消息接口：DELETE /api/groups/:id/pin/:messageId，仅 admin/owner 可调用
- [x] 7.3 实现获取精华消息列表接口：GET /api/groups/:id/pins，返回按时间倒序的精华消息列表
- [x] 7.4 更新 MessageContextMenu 组件：当用户角色为 admin/owner 时显示"设为精华"/"取消精华"选项
- [x] 7.5 实现精华消息列表组件：GroupPinnedMessages，显示精华消息列表，空状态显示"暂无精华消息"
- [x] 7.6 实现精华消息跳转功能：点击精华消息后调用 GET /api/messages/around 定位原消息

## 8. 群文件列表（group-file-manager）

- [x] 8.1 实现获取群文件列表接口：GET /api/groups/:id/files，支持 type（image/document/archive/other）和 keyword 参数，支持分页
- [x] 8.2 实现群文件列表组件：GroupFileManager，显示文件列表，支持类型筛选和搜索
- [x] 8.3 实现文件下载功能：点击文件后触发下载
- [x] 8.4 实现文件预览功能：图片和 PDF 文件支持弹窗预览

## 9. 群相册（group-album）

- [x] 9.1 实现获取群图片列表接口：GET /api/groups/:id/images，返回按时间分组的图片列表
- [x] 9.2 实现群相册组件：GroupAlbum，网格展示图片，按日期分组
- [x] 9.3 实现图片大图预览：点击图片后显示大图，支持左右切换

## 10. 群邀请链接（group-invite-link）

- [x] 10.1 实现生成邀请链接接口：POST /api/groups/:id/invite，参数包含 expires_in（1d/7d/30d/never）和 max_uses（1/10/unlimited）
- [x] 10.2 实现获取邀请链接列表接口：GET /api/groups/:id/invites，返回当前群的所有有效邀请链接
- [x] 10.3 实现删除邀请链接接口：DELETE /api/groups/:id/invites/:inviteId
- [x] 10.4 实现通过邀请码加入群聊接口：POST /api/groups/join/:code，验证链接有效性（未过期、未用完），已是成员则直接跳转
- [x] 10.5 实现邀请链接生成组件：GroupInviteLink，包含有效期和使用次数选择，生成后显示复制按钮
- [x] 10.6 实现邀请链接加入页面：显示群聊信息和"加入群聊"按钮

## 11. 群投票（group-vote）

- [x] 11.1 实现创建投票接口：POST /api/votes，参数包含 conversation_id、question、options、allow_multi、anonymous、deadline，受群权限控制
- [x] 11.2 实现投票接口：POST /api/votes/:id/vote，参数包含 option_ids，支持单选和多选
- [x] 11.3 实现取消投票接口：DELETE /api/votes/:id/vote，在截止时间前可修改
- [x] 11.4 实现获取投票详情接口：GET /api/votes/:id，返回投票信息、选项、结果
- [x] 11.5 实现投票卡片组件：VoteCard，显示投票问题、选项、已选状态、结果（票数和百分比）
- [x] 11.6 实现投票创建表单组件：VoteCreateForm，包含问题输入、选项添加、允许多选/匿名投票/截止时间设置
- [x] 11.7 实现投票结果展示：匿名投票只显示票数，非匿名投票显示投票人
- [x] 11.8 实现投票 WebSocket 推送：投票创建和结果更新时向群成员推送 vote_update 事件

## 12. 群接龙（group-solitaire）

- [x] 12.1 实现创建接龙接口：POST /api/solitaires，参数包含 conversation_id 和 title，受群权限控制
- [x] 12.2 实现参与接龙接口：POST /api/solitaires/:id/join，参数包含 content，已参与则更新内容
- [x] 12.3 实现修改接龙内容接口：PUT /api/solitaires/:id/items/:itemId，只能修改自己的内容
- [x] 12.4 实现获取接龙详情接口：GET /api/solitaires/:id，返回接龙信息和参与列表
- [x] 12.5 实现接龙卡片组件：SolitaireCard，显示标题、参与列表、参与按钮
- [x] 12.6 实现接龙参与表单：SolitaireJoinForm，包含内容输入框
- [x] 12.7 实现接龙列表展示：按参与时间正序排列，空状态显示"暂无人参与"

## 13. 群设置页面整合

- [x] 13.1 更新群设置页面，新增"管理员"tab：显示成员列表，支持设置/撤销管理员（仅 owner 可见）
- [x] 13.2 更新群设置页面，新增"精华消息"tab：显示精华消息列表，支持跳转
- [x] 13.3 更新群设置页面，新增"群文件"tab：显示群文件列表，支持筛选和搜索
- [x] 13.4 更新群设置页面，新增"群相册"tab：显示群相册，支持大图预览
- [x] 13.5 更新群设置页面，新增"邀请链接"tab：显示邀请链接列表，支持生成和删除
- [x] 13.6 更新群设置页面，新增"权限设置"tab：显示权限选项，支持修改（仅 owner 可见）

## 14. 测试与验证

- [x] 14.1 测试权限体系：创建群聊后验证 owner 角色 → 设置管理员 → 验证 admin 角色 → 撤销管理员 → 转让群主
- [x] 14.2 测试禁言功能：禁言成员（10分钟）→ 验证无法发送消息 → 解除禁言 → 验证可发送消息
- [x] 14.3 测试 @ 功能：输入 @ → 选择成员 → 发送消息 → 验证高亮显示 → 验证被 @ 用户收到提醒 → 验证会话列表 @ 标记
- [x] 14.4 测试投票功能：创建投票（单选/匿名）→ 投票 → 查看结果 → 创建投票（多选/非匿名）→ 投票 → 查看结果
- [x] 14.5 测试接龙功能：创建接龙 → 参与接龙 → 修改接龙内容 → 查看接龙列表
- [x] 14.6 测试群公告置顶：设置公告 → 验证显示 → 修改公告 → 验证更新提醒
- [x] 14.7 测试精华消息：标记精华 → 验证列表 → 取消精华 → 验证列表更新 → 跳转原消息
- [x] 14.8 测试群文件列表：验证文件列表 → 筛选类型 → 搜索文件名 → 下载文件
- [x] 14.9 测试群相册：验证图片展示 → 按时间分组 → 大图预览 → 左右切换
- [x] 14.10 测试群邀请链接：生成链接（7天/10次）→ 复制链接 → 通过链接入群 → 验证链接失效

## 15. UI 优化

- [x] 15.1 VoteModal 空状态：圆形图标背景（matcha 渐变），去掉描述文案，保留"发起投票"按钮
- [x] 15.2 SolitaireModal 空状态：圆形图标背景（matcha 渐变），去掉描述文案，保留"发起接龙"按钮
- [x] 15.3 GroupAlbum 空状态：圆形图标背景（matcha 渐变），保留描述文案和"上传相册"按钮
- [x] 15.4 ConversationDetailPanel：删除"邀请"tab，成员列表末尾添加"+"按钮（matcha 虚线边框）
- [x] 15.5 CSS：添加 feature-modal-empty-icon 圆形图标样式（80px，matcha 渐变背景）
- [x] 15.6 CSS：添加 conversation-group-member-add 按钮样式（matcha 虚线边框，hover 效果）

## 16. Notification 消息类型（不算未读）

- [x] 16.1 后端：在 webchat/message.go 中添加 MessageTypeNotification 常量
- [x] 16.2 后端：修改 SaveMessage 或创建 SaveNotification 函数，支持 notification 类型保存到数据库
- [x] 16.3 前端：在 types/chat.ts 中添加 "notification" 到 MessageType 类型
- [x] 16.4 前端：在 MessageList.tsx 中处理 notification 类型，渲染为居中灰色文字（类似 system 消息）
- [x] 16.5 前端：确保 notification 消息不增加未读计数（在 App.tsx 中过滤）

## 17. 好友直接邀请

- [x] 17.1 后端：在 chatstore/groups.go 中实现 AddGroupMembers(userID, conversationID, userIDs) 函数
- [x] 17.2 后端：验证被邀请者必须是发起者的好友
- [x] 17.3 后端：在 group_routes.go 中添加 POST /api/conversations/:conversationId/group/members 接口
- [x] 17.4 后端：邀请成功后保存 notification 消息到数据库（"张三 邀请 李四 加入了群聊"）
- [x] 17.5 后端：通过 WebSocket 广播 notification 消息给群成员
- [x] 17.6 前端：在 chatApi.ts 中添加 addGroupMembers(token, conversationId, userIds) 函数
- [x] 17.7 前端：实现 FriendPickerModal 组件（好友选择器，过滤已在群的好友）
- [x] 17.8 前端：集成到 ConversationDetailPanel，点击 "+" 按钮打开 FriendPickerModal
