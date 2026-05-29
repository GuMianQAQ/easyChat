## ADDED Requirements

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
