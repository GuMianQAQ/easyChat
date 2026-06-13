## ADDED Requirements

### Requirement: ContactCard 完整样式

ContactCard 组件 SHALL 具有完整的视觉样式，包含头像信息区和操作按钮。

#### Scenario: 卡片头像信息区
- **WHEN** ContactCard 渲染
- **THEN** 左侧显示大号头像，右侧显示昵称和"微信号: xxx"文字

#### Scenario: 好友操作按钮
- **WHEN** contact 是好友（isFriend=true）
- **THEN** 底部显示"发消息"绿色按钮，带消息图标

#### Scenario: 非好友操作按钮
- **WHEN** contact 不是好友（isFriend=false）
- **THEN** 底部显示"添加好友"按钮，带加人图标
