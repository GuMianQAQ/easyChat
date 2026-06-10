## Why

群文件、群接龙、群投票三个功能的UI过于简单，用户体验不佳。群文件列表缺少上传者信息和文件类型色标；群接龙创建表单没有格式说明和预览功能；群投票创建表单缺少投票类型选择和设置项分组。这些问题影响了群聊功能的易用性和美观度。

## What Changes

- 群文件列表优化：显示上传者名称、文件图标色标、时间格式优化、空状态统一
- 群接龙表单重构：新增格式说明字段（可选）、实时预览区、分组布局
- 群投票表单重构：新增投票类型选择（单选/多选）、设置项分组+说明文字、选项卡片化
- 后端模型扩展：Solitaire 新增 Format 字段，Vote 新增 VoteType 字段
- 后端查询优化：GroupFileItem 查询返回上传者名称

## Capabilities

### New Capabilities

- `solitaire-format`: 群接龙格式说明功能，支持创建时指定格式模板
- `vote-type`: 群投票类型选择功能，支持单选和多选两种模式
- `file-sender-display`: 群文件上传者显示功能，在文件列表中展示上传者信息

### Modified Capabilities

- `solitaire`: 新增格式说明字段，改进创建表单UI
- `vote`: 新增投票类型字段，改进创建表单UI
- `group-files`: 优化文件列表展示，统一空状态样式

## Impact

**后端改动：**
- `internal/chatstore/service.go`: Solitaire 和 Vote 模型新增字段
- `internal/chatstore/solitaire.go`: 业务逻辑支持 Format 字段
- `internal/chatstore/votes.go`: 业务逻辑支持 VoteType 字段
- `internal/chatstore/group_files.go`: 查询优化，返回上传者名称
- `internal/webserver/solitaire_routes.go`: API 支持 Format 参数
- `internal/webserver/vote_routes.go`: API 支持 VoteType 参数

**前端改动：**
- `frontend/src/types/chat.ts`: 类型定义更新
- `frontend/src/utils/chatApi.ts`: API 函数更新
- `frontend/src/components/chat/SolitaireCreateForm.tsx`: 新建组件
- `frontend/src/components/chat/SolitaireModal.tsx`: 集成新表单
- `frontend/src/components/chat/VoteCreateForm.tsx`: 重构表单
- `frontend/src/components/chat/GroupFileManager.tsx`: 优化列表展示
- `frontend/src/styles/chat/panels.css`: 新增样式

**数据库改动：**
- Solitaire 表新增 format 列（VARCHAR(255)，默认空字符串）
- Vote 表新增 vote_type 列（VARCHAR(16)，默认 'single'）

**兼容性：**
- 新字段有默认值，兼容旧数据
- 旧接龙数据：format 字段为空，前端不显示格式说明
- 旧投票数据：vote_type 为 "single"，与原有逻辑一致
