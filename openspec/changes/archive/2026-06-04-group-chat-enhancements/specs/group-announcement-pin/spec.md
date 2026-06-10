## ADDED Requirements

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
