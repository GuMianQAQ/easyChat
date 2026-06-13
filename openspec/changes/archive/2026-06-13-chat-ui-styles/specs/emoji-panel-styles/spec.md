## ADDED Requirements

### Requirement: EmojiPanel 完整样式

EmojiPanel 组件 SHALL 具有完整的视觉样式，包含面板容器、搜索栏、表情分类区域、收藏表情区域和底部工具栏。

#### Scenario: 面板容器渲染
- **WHEN** EmojiPanel 组件被渲染
- **THEN** 显示为 400px 宽、420px 高的固定尺寸圆角白色面板，带阴影和边框，内部搜索栏、内容区、底部分区排列，切换 tab 时面板大小不变

#### Scenario: 搜索栏渲染
- **WHEN** EmojiPanel 打开
- **THEN** 顶部显示搜索输入框，左侧搜索图标，右侧清除按钮（有输入时显示）

#### Scenario: 表情分类浏览
- **WHEN** 用户在 emoji tab 下且无搜索内容
- **THEN** 按分类显示标题（"最近使用"、"常用"、"表情"等）和表情网格，每行 8 个，可滚动

#### Scenario: 表情搜索结果
- **WHEN** 用户输入搜索关键词
- **THEN** 显示匹配的表情网格，无匹配时显示"未找到匹配的表情"

#### Scenario: 收藏表情网格
- **WHEN** 用户切换到收藏 tab
- **THEN** 显示收藏表情图片网格（每行 4 个），末尾有 "+" 添加按钮

#### Scenario: 收藏表情删除模式
- **WHEN** 用户右键点击收藏表情
- **THEN** 进入删除模式，显示删除图标覆盖层

#### Scenario: 底部工具栏
- **WHEN** EmojiPanel 渲染
- **THEN** 底部显示三个图标按钮（笑脸/爱心/更多），当前激活 tab 高亮
