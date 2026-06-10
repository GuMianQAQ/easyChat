## Purpose

Describe the stable group-chat behavior for easyChat, including group creation, group details, group profile updates, membership changes, owner-restricted actions, and group enhancement features.

## Requirements

### Requirement: Group conversation lifecycle
The system SHALL support creating group chats, reading group details, updating supported group profile fields, leaving a group, and dismissing a group according to current role rules.

#### Scenario: Group owner creates a group chat
- **WHEN** the owner creates a group with valid members
- **THEN** the system creates the group conversation and initializes members using current permission rules

### Requirement: Group role-sensitive actions
The system SHALL enforce the existing owner and member permissions for editable group fields and destructive operations.

#### Scenario: Non-owner attempts an owner-only action
- **WHEN** a non-owner invokes an owner-restricted group operation
- **THEN** the system rejects the request using the existing permission behavior

### Requirement: 群聊机器人开关
系统 SHALL 支持群主控制群聊是否启用 AI 机器人。开关状态 SHALL 持久化存储。

#### Scenario: 群主开启机器人
- **WHEN** 群主调用机器人开关 API 设置为开启
- **THEN** 系统将 AI 助手添加为群成员，设置 `bot_enabled=true`

#### Scenario: 群主关闭机器人
- **WHEN** 群主调用机器人开关 API 设置为关闭
- **THEN** 系统将 AI 助手从群成员中移除，设置 `bot_enabled=false`

#### Scenario: 查询机器人状态
- **WHEN** 用户获取群聊详情
- **THEN** 响应 SHALL 包含 `botEnabled` 字段

### Requirement: 群主权限限制
系统 SHALL 只允许群主操作机器人开关。

#### Scenario: 非群主尝试操作
- **WHEN** 非群主调用机器人开关 API
- **THEN** 系统 SHALL 返回权限错误

### Requirement: 群聊支持三级角色体系

群聊 SHALL 支持 owner（群主）、admin（管理员）、member（普通成员）三级角色。

#### Scenario: 角色定义

- **WHEN** 群聊创建时
- **THEN** 创建者角色为 owner，其他成员角色为 member

#### Scenario: 角色权限

- **WHEN** 用户角色为 owner
- **THEN** 用户拥有所有权限（修改群信息、管理成员、解散群聊）

- **WHEN** 用户角色为 admin
- **THEN** 用户可踢人、禁言、修改群名/公告

- **WHEN** 用户角色为 member
- **THEN** 用户只能发送消息、退出群聊

### Requirement: 群主可以设置管理员

群主 SHALL 可以将普通成员提升为管理员，也可以撤销管理员角色。

#### Scenario: 设置管理员

- **WHEN** 群主点击成员列表中的某个普通成员
- **THEN** 系统显示"设为管理员"选项，点击后该成员角色变为 admin

#### Scenario: 撤销管理员

- **WHEN** 群主点击成员列表中的某个管理员
- **THEN** 系统显示"撤销管理员"选项，点击后该成员角色变为 member

#### Scenario: 非群主无法设置管理员

- **WHEN** 管理员或普通成员尝试设置管理员
- **THEN** 系统拒绝操作并提示"只有群主可以设置管理员"

### Requirement: 群主可以转让群主身份

群主 SHALL 可以将群主身份转让给其他成员。

#### Scenario: 转让群主

- **WHEN** 群主在群设置中选择"转让群主"并选择目标成员
- **THEN** 系统弹出二次确认，确认后目标成员角色变为 owner，原群主角色变为 member

#### Scenario: 转让后权限变化

- **WHEN** 群主身份转让完成
- **THEN** 原群主失去管理权限，新群主获得所有权限

### Requirement: 管理员可以禁言群成员

管理员或群主 SHALL 可以禁言指定成员，被禁言者无法发送消息。

#### Scenario: 禁言成员

- **WHEN** 管理员或群主点击成员列表中的某个成员，选择"禁言"
- **THEN** 系统显示禁言时长选项（10分钟、1小时、1天、永久），选择后该成员被禁言

#### Scenario: 被禁言者无法发送消息

- **WHEN** 被禁言用户尝试发送消息
- **THEN** 系统拒绝发送并提示"你已被禁言"

#### Scenario: 禁言到期自动解禁

- **WHEN** 禁言时长到期
- **THEN** 系统自动解除禁言，用户可正常发送消息

### Requirement: 管理员可以解除禁言

管理员或群主 SHALL 可以提前解除成员的禁言。

#### Scenario: 解除禁言

- **WHEN** 管理员或群主点击被禁言成员，选择"解除禁言"
- **THEN** 系统立即解除该成员的禁言状态

### Requirement: 禁言状态显示

被禁言成员的禁言状态 SHALL 在成员列表中显示。

#### Scenario: 显示禁言标记

- **WHEN** 成员列表中存在被禁言成员
- **THEN** 该成员名称旁显示禁言标记（如 🔇）

#### Scenario: 显示禁言剩余时间

- **WHEN** 用户查看被禁言成员信息
- **THEN** 系统显示禁言到期时间或"永久禁言"

### Requirement: 群聊支持权限设置

群主 SHALL 可以设置群聊的各项权限，控制成员的操作范围。

#### Scenario: 权限设置界面

- **WHEN** 群主进入群设置页面
- **THEN** 系统显示权限设置面板，包含各项权限选项

#### Scenario: 权限项定义

- **WHEN** 系统显示权限设置面板
- **THEN** 包含以下权限项：
  - 谁能修改群名：仅管理员 / 所有人
  - 谁能修改群头像：仅管理员 / 所有人
  - 谁能修改群公告：仅管理员 / 所有人
  - 谁能发起投票：仅管理员 / 所有人
  - 谁能发起接龙：仅管理员 / 所有人
  - 全员禁言：开启 / 关闭

### Requirement: 权限检查

系统 SHALL 根据权限设置检查用户是否有权执行操作。

#### Scenario: 权限检查通过

- **WHEN** 用户尝试修改群名，且权限设置为"所有人"
- **THEN** 系统允许操作

#### Scenario: 权限检查失败

- **WHEN** 普通成员尝试修改群名，且权限设置为"仅管理员"
- **THEN** 系统拒绝操作并提示"只有管理员可以修改群名"

#### Scenario: 全员禁言

- **WHEN** 群主开启"全员禁言"
- **THEN** 除管理员和群主外，所有成员无法发送消息

### Requirement: 默认权限

新建群聊 SHALL 使用默认权限设置。

#### Scenario: 默认权限

- **WHEN** 群聊创建时
- **THEN** 默认权限为：
  - 修改群名：仅管理员
  - 修改群头像：仅管理员
  - 修改群公告：仅管理员
  - 发起投票：所有人
  - 全员禁言：关闭

### Requirement: 群公告置顶显示

群聊 SHALL 在消息列表顶部显示群公告，方便成员查看重要信息。

#### Scenario: 显示公告

- **WHEN** 用户进入群聊，且群聊设置了公告
- **THEN** 消息列表顶部显示公告条，包含公告内容

#### Scenario: 关闭公告

- **WHEN** 用户点击公告条的关闭按钮
- **THEN** 公告条隐藏，本次会话不再显示

#### Scenario: 展开公告

- **WHEN** 公告内容过长被截断
- **THEN** 用户可点击"展开"查看完整公告

### Requirement: 公告更新提醒

当群公告更新时，系统 SHALL 向群成员推送提醒。

#### Scenario: 公告更新推送

- **WHEN** 群主或管理员修改群公告
- **THEN** 系统通过 WebSocket 向所有群成员推送公告更新事件

#### Scenario: 显示公告更新提示

- **WHEN** 群成员收到公告更新推送
- **THEN** 群聊顶部显示"公告已更新"提示

### Requirement: 用户可以在群聊中 @ 其他成员

用户在群聊输入框中输入 @ 符号时，系统 SHALL 弹出成员选择列表，用户可以选择要 @ 的成员。

#### Scenario: 输入 @ 触发成员选择器

- **WHEN** 用户在群聊输入框中输入 @ 符号
- **THEN** 系统弹出成员选择列表，显示群内所有成员

#### Scenario: 选择成员插入 @ 标记

- **WHEN** 用户从成员列表中选择一个成员
- **THEN** 系统在输入框中插入 "@昵称 " 文本，并记录 user_id

#### Scenario: 搜索成员

- **WHEN** 用户在成员选择器中输入关键词
- **THEN** 系统根据昵称或用户名过滤成员列表

### Requirement: 消息中的 @ 标记高亮显示

消息内容中的 @xxx 标记 SHALL 被渲染为高亮样式，可点击。

#### Scenario: 渲染 @ 高亮

- **WHEN** 消息内容包含 @user_id 标记
- **THEN** 前端将 @user_id 替换为 "@昵称" 并应用高亮样式

#### Scenario: 点击 @ 跳转

- **WHEN** 用户点击消息中的 @xxx 高亮文本
- **THEN** 系统显示该用户的资料卡或跳转到该用户的私聊

### Requirement: 被 @ 的用户收到特殊提醒

当用户在群聊中被 @ 时，系统 SHALL 通过 WebSocket 推送特殊提醒。

#### Scenario: 推送 @ 提醒

- **WHEN** 群聊消息包含 @user_id 标记
- **THEN** 系统通过 WebSocket 向被 @ 的用户推送提醒事件

#### Scenario: 会话列表显示 @ 标记

- **WHEN** 用户在某个群聊中被 @ 且未读
- **THEN** 会话列表中该群聊显示特殊 @ 标记

### Requirement: 支持 @ 所有人

用户可以选择 @ 所有人（@all），向群内所有成员发送提醒。

#### Scenario: @ 所有人

- **WHEN** 用户选择 @ 所有人
- **THEN** 系统在消息中标记 @all，所有群成员收到提醒

### Requirement: 群成员可以标记精华消息

管理员或群主 SHALL 可以将消息标记为精华消息。

#### Scenario: 标记精华消息

- **WHEN** 管理员或群主右键点击某条消息，选择"设为精华"
- **THEN** 系统将该消息标记为精华消息

#### Scenario: 取消精华消息

- **WHEN** 管理员或群主右键点击精华消息，选择"取消精华"
- **THEN** 系统取消该消息的精华标记

#### Scenario: 非管理员无法标记

- **WHEN** 普通成员尝试标记精华消息
- **THEN** 系统拒绝操作并提示"只有管理员可以标记精华消息"

### Requirement: 精华消息列表

群聊 SHALL 提供精华消息列表，方便成员查看所有精华消息。

#### Scenario: 查看精华消息列表

- **WHEN** 用户进入群设置，点击"精华消息"
- **THEN** 系统显示精华消息列表，按时间倒序排列

#### Scenario: 跳转到原消息

- **WHEN** 用户点击精华消息列表中的某条消息
- **THEN** 系统跳转到该消息在聊天记录中的位置

#### Scenario: 精华消息为空

- **WHEN** 群聊没有精华消息
- **THEN** 系统显示"暂无精华消息"提示

### Requirement: 群文件列表

群聊 SHALL 提供文件列表，集中展示群内所有文件。

#### Scenario: 查看文件列表

- **WHEN** 用户进入群设置，点击"群文件"
- **THEN** 系统显示群内所有文件列表

#### Scenario: 文件筛选

- **WHEN** 用户在文件列表中选择文件类型筛选
- **THEN** 系统根据类型（图片、文档、压缩包、其他）过滤文件

#### Scenario: 文件搜索

- **WHEN** 用户在文件列表中输入搜索关键词
- **THEN** 系统根据文件名搜索并显示结果

#### Scenario: 文件分页

- **WHEN** 文件数量较多
- **THEN** 系统分页显示文件列表，支持加载更多

### Requirement: 文件操作

用户 SHALL 可以对文件进行下载、预览等操作。

#### Scenario: 下载文件

- **WHEN** 用户点击文件列表中的某个文件
- **THEN** 系统开始下载该文件

#### Scenario: 预览文件

- **WHEN** 用户点击支持预览的文件（图片、PDF）
- **THEN** 系统在新窗口或弹窗中预览该文件

### Requirement: 群相册

群聊 SHALL 提供相册功能，集中展示群内所有图片。

#### Scenario: 查看群相册

- **WHEN** 用户进入群设置，点击"群相册"
- **THEN** 系统以网格形式展示群内所有图片

#### Scenario: 按时间分组

- **WHEN** 系统显示群相册
- **THEN** 图片按发送日期分组显示

#### Scenario: 查看大图

- **WHEN** 用户点击相册中的某张图片
- **THEN** 系统显示大图预览，支持左右切换

#### Scenario: 相册为空

- **WHEN** 群聊没有图片
- **THEN** 系统显示"暂无图片"提示

### Requirement: 生成群邀请链接

管理员或群主 SHALL 可以生成群邀请链接，邀请非好友入群。

#### Scenario: 生成邀请链接

- **WHEN** 管理员或群主在群设置中点击"生成邀请链接"
- **THEN** 系统生成邀请链接，包含邀请码

#### Scenario: 设置有效期

- **WHEN** 管理员或群主生成邀请链接时
- **THEN** 系统提供有效期选项（1天、7天、30天、永久）

#### Scenario: 设置使用次数

- **WHEN** 管理员或群主生成邀请链接时
- **THEN** 系统提供最大使用次数选项（1次、10次、不限）

#### Scenario: 复制邀请链接

- **WHEN** 邀请链接生成后
- **THEN** 用户可点击"复制"将链接复制到剪贴板

### Requirement: 通过邀请链接入群

用户 SHALL 可以通过邀请链接加入群聊。

#### Scenario: 打开邀请链接

- **WHEN** 用户打开邀请链接
- **THEN** 系统显示群聊信息和"加入群聊"按钮

#### Scenario: 加入群聊

- **WHEN** 用户点击"加入群聊"
- **THEN** 系统将用户添加为群成员，跳转到群聊

#### Scenario: 链接无效

- **WHEN** 用户打开已过期或已用完的邀请链接
- **THEN** 系统提示"邀请链接已失效"

#### Scenario: 已是成员

- **WHEN** 已是群成员的用户打开邀请链接
- **THEN** 系统提示"你已是群成员"，直接跳转到群聊

### Requirement: 创建群投票

群成员 SHALL 可以在群聊中发起投票（受群权限控制）。

#### Scenario: 创建投票

- **WHEN** 用户点击消息输入框旁的"发起投票"按钮
- **THEN** 系统显示投票创建表单，包含问题、选项、设置

#### Scenario: 权限检查

- **WHEN** 权限设置为"仅管理员"，且用户角色为 member
- **THEN** 系统拒绝操作并提示"只有管理员可以发起投票"

#### Scenario: 投票设置

- **WHEN** 用户创建投票时
- **THEN** 可设置以下选项：
  - 允许多选：是 / 否
  - 匿名投票：是 / 否
  - 截止时间：可选

#### Scenario: 添加选项

- **WHEN** 用户创建投票时
- **THEN** 可添加多个投票选项（至少2个）

#### Scenario: 发送投票

- **WHEN** 用户点击"发送"
- **THEN** 系统在群聊中显示投票卡片消息

### Requirement: 参与投票

群成员 SHALL 可以参与投票。

#### Scenario: 投票

- **WHEN** 用户点击投票卡片中的选项
- **THEN** 系统记录投票，显示已选状态

#### Scenario: 单选投票

- **WHEN** 投票设置为单选
- **THEN** 用户只能选择一个选项

#### Scenario: 多选投票

- **WHEN** 投票设置为多选
- **THEN** 用户可选择多个选项

#### Scenario: 修改投票

- **WHEN** 用户在截止时间前修改投票
- **THEN** 系统更新投票记录

### Requirement: 查看投票结果

群成员 SHALL 可以查看投票结果。

#### Scenario: 查看结果

- **WHEN** 用户点击投票卡片
- **THEN** 系统显示投票结果，包括各选项票数和百分比

#### Scenario: 匿名投票结果

- **WHEN** 投票设置为匿名
- **THEN** 系统只显示各选项票数，不显示投票人

#### Scenario: 投票截止

- **WHEN** 投票到达截止时间
- **THEN** 系统自动结束投票，显示最终结果

### Requirement: 发起群接龙

群成员 SHALL 可以在群聊中发起接龙（受群权限控制）。

#### Scenario: 创建接龙

- **WHEN** 用户点击消息输入框旁的"发起接龙"按钮
- **THEN** 系统显示接龙创建表单，包含标题

#### Scenario: 权限检查

- **WHEN** 权限设置为"仅管理员"，且用户角色为 member
- **THEN** 系统拒绝操作并提示"只有管理员可以发起接龙"

#### Scenario: 发送接龙

- **WHEN** 用户点击"发送"
- **THEN** 系统在群聊中显示接龙卡片消息

### Requirement: 参与接龙

群成员 SHALL 可以参与接龙。

#### Scenario: 参与接龙

- **WHEN** 用户点击接龙卡片中的"参与接龙"
- **THEN** 系统显示输入框，用户可输入接龙内容

#### Scenario: 提交接龙

- **WHEN** 用户输入接龙内容并点击"提交"
- **THEN** 系统将用户添加到接龙列表，显示在卡片中

#### Scenario: 重复参与

- **WHEN** 用户已参与接龙，再次点击"参与接龙"
- **THEN** 系统提示"你已参与接龙"，可选择修改内容

### Requirement: 查看接龙列表

接龙卡片 SHALL 显示所有已参与的成员。

#### Scenario: 显示接龙列表

- **WHEN** 接龙卡片显示
- **THEN** 按参与顺序显示所有成员的接龙内容

#### Scenario: 接龙排序

- **WHEN** 接龙列表较长
- **THEN** 按参与时间正序排列，最新的在最后

#### Scenario: 接龙为空

- **WHEN** 没有人参与接龙
- **THEN** 接龙卡片显示"暂无人参与"
