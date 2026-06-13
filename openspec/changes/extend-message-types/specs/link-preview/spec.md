## ADDED Requirements

### Requirement: 系统自动生成链接预览

当用户发送包含 URL 的消息时，系统 SHALL 自动抓取链接信息并生成预览卡片。

#### Scenario: 检测到 URL
- **WHEN** 用户发送包含 HTTP/HTTPS 链接的消息
- **THEN** 系统检测到 URL，异步抓取链接信息，生成预览卡片

#### Scenario: 抓取成功
- **WHEN** 链接抓取成功
- **THEN** 消息下方显示预览卡片，包含标题、描述、图片和域名

#### Scenario: 抓取失败
- **WHEN** 链接抓取失败（超时、404 等）
- **THEN** 消息正常发送，不显示预览卡片，不影响用户体验

#### Scenario: 多个 URL
- **WHEN** 消息中包含多个 URL
- **THEN** 只预览第一个 URL，避免消息过长

### Requirement: 链接预览数据格式

链接预览 SHALL 使用 JSON 格式存储抓取到的信息。

#### Scenario: 链接消息结构
- **WHEN** 系统发送包含链接的消息
- **THEN** 消息 content 字段包含 JSON，格式为: `{"text": "看看这个网站", "url": "https://example.com", "preview": {"title": "Example", "description": "...", "image": "...", "favicon": "..."}}`

### Requirement: OG 标签抓取

系统 SHALL 抓取网页的 Open Graph 标签来生成预览。

#### Scenario: 抓取的标签
- **WHEN** 系统抓取链接预览
- **THEN** 按优先级抓取: og:title → <title>, og:description → <meta description>, og:image, og:url, favicon

#### Scenario: 抓取超时
- **WHEN** 链接抓取超过 5 秒
- **THEN** 系统终止抓取，返回失败

#### Scenario: 缓存机制
- **WHEN** 同一个 URL 被多次发送
- **THEN** 系统从缓存读取预览数据，缓存有效期 7 夨

### Requirement: 链接预览 UI 展示

链接预览卡片 SHALL 显示链接的基本信息。

#### Scenario: 预览卡片布局
- **WHEN** 消息包含链接预览
- **THEN** 在消息文本下方显示卡片，左侧图片，右侧标题、描述和域名

#### Scenario: 卡片点击
- **WHEN** 用户点击预览卡片
- **THEN** 在浏览器中打开链接

#### Scenario: 图片缺失
- **WHEN** 链接没有 og:image
- **THEN** 卡片只显示标题和描述，不显示图片区域

#### Scenario: 移动端适配
- **WHEN** 在小屏幕设备上显示
- **THEN** 卡片改为上下布局，图片在上，文字在下

### Requirement: 链接预览配置

系统 SHALL 允许管理员配置链接预览功能。

#### Scenario: 功能开关
- **WHEN** 管理员在配置中禁用链接预览
- **THEN** 系统不抓取链接信息，消息正常发送

#### Scenario: 域名黑名单
- **WHEN** URL 域名在黑名单中
- **THEN** 系统跳过抓取，不生成预览
