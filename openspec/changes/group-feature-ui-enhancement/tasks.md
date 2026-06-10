## 1. 后端模型改动

- [x] 1.1 修改 Solitaire 模型，新增 Format 字段
- [x] 1.2 修改 Vote 模型，新增 VoteType 字段
- [x] 1.3 验证 GORM AutoMigrate 自动添加新列

## 2. 后端业务逻辑

- [x] 2.1 修改 SolitairePayload，新增 Format 字段
- [x] 2.2 修改 CreateSolitaire 函数，支持 format 参数
- [x] 2.3 修改 GetSolitaire 和 GetSolitairesByConversation，返回 Format 字段
- [x] 2.4 修改 VotePayload，新增 VoteType 字段
- [x] 2.5 修改 CreateVote 函数，支持 voteType 参数
- [x] 2.6 修改 GetVotesByConversation 和 GetVote，返回 VoteType 字段
- [x] 2.7 修改 GroupFileItem，新增 SenderName 字段
- [x] 2.8 修改 GetGroupFiles 函数，JOIN Message 表获取 SenderName

## 3. 后端路由

- [x] 3.1 修改 solitaire_routes.go，创建接龙时解析 format 参数
- [x] 3.2 修改 vote_routes.go，创建投票时解析 voteType 参数
- [x] 3.3 验证 API 测试通过

## 4. 前端类型和 API

- [x] 4.1 修改 chat.ts，Solitaire 接口新增 format 字段
- [x] 4.2 修改 chat.ts，Vote 接口新增 voteType 字段
- [x] 4.3 修改 chat.ts，GroupFileItem 接口新增 senderName 字段
- [x] 4.4 修改 chatApi.ts，createSolitaire 函数支持 format 参数
- [x] 4.5 修改 chatApi.ts，createVote 函数支持 voteType 参数

## 5. 前端组件 - 群接龙

- [x] 5.1 新建 SolitaireCreateForm.tsx 组件
- [x] 5.2 实现标题输入框
- [x] 5.3 实现格式说明输入框（可选）
- [x] 5.4 实现实时预览区
- [x] 5.5 实现取消/创建按钮
- [x] 5.6 修改 SolitaireModal.tsx，集成 SolitaireCreateForm
- [x] 5.7 添加 SolitaireCreateForm 相关 CSS 样式

## 6. 前端组件 - 群投票

- [x] 6.1 修改 VoteCreateForm.tsx，新增投票类型选择
- [x] 6.2 实现单选/多选切换
- [x] 6.3 实现设置项分组和说明文字
- [x] 6.4 实现选项卡片化布局
- [x] 6.5 添加投票类型选择相关 CSS 样式

## 7. 前端组件 - 群文件

- [x] 7.1 修改 GroupFileManager.tsx，显示上传者名称
- [x] 7.2 实现文件图标色标（图片蓝色、文档绿色、压缩包橙色、其他灰色）
- [x] 7.3 实现时间格式优化（今天/昨天/X天前/YYYY-MM-DD）
- [x] 7.4 统一空状态样式（圆形图标 + matcha渐变背景）

## 8. 测试验证

- [x] 8.1 验证 TypeScript 编译通过
- [x] 8.2 验证 Go 编译通过
- [x] 8.3 验证群接龙创建功能正常
- [x] 8.4 验证群投票创建功能正常
- [x] 8.5 验证群文件列表显示正常
- [x] 8.6 验证旧数据兼容性
