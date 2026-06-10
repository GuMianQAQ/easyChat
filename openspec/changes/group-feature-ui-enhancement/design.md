## Context

当前 easyChat 群聊功能中有三个模块的UI需要优化：

1. **群文件**：列表展示简单，缺少上传者信息和文件类型区分
2. **群接龙**：创建表单只有一个标题输入框，没有格式说明和预览
3. **群投票**：创建表单缺少投票类型选择，设置项没有分组

现有技术栈：
- 后端：Go + Gin + GORM + SQLite
- 前端：React + TypeScript + CSS
- 数据库：SQLite，使用 GORM AutoMigrate 管理表结构

## Goals / Non-Goals

**Goals:**
- 优化群文件列表UI，显示上传者名称和文件类型色标
- 重构群接龙创建表单，新增格式说明字段和实时预览
- 重构群投票创建表单，新增投票类型选择和设置项分组
- 保持向后兼容，新字段有默认值，不影响旧数据

**Non-Goals:**
- 不实现评分类型投票（作为后续迭代）
- 不实现文件预览功能
- 不实现接龙模板库
- 不修改现有 API 接口签名，只新增字段

## Decisions

### Decision 1: 群接龙格式说明存储方式

**选择：** 在 Solitaire 模型新增 Format 字段

**备选方案：**
- 方案A：新增独立字段（选择）
- 方案B：复用 Title 字段，用换行符分隔
- 方案C：新建 SolitaireFormat 表

**理由：**
- 方案A结构清晰，查询方便，不影响现有逻辑
- 方案B需要解析，兼容性处理复杂
- 方案C过度设计，格式说明只需一个字段

### Decision 2: 群投票类型实现方式

**选择：** 在 Vote 模型新增 VoteType 字段，同时保留 AllowMulti 字段

**备选方案：**
- 方案A：新增 VoteType 字段，AllowMulti 由 VoteType 派生（选择）
- 方案B：只用 VoteType 字段，移除 AllowMulti
- 方案C：只用 AllowMulti 字段，不新增 VoteType

**理由：**
- 方案A兼容性最好，VoteType 语义更清晰，AllowMulti 保持向后兼容
- 方案B需要修改所有使用 AllowMulti 的代码
- 方案C无法支持未来的评分类型

### Decision 3: 群文件上传者名称获取方式

**选择：** 修改 GroupFileItem 查询，JOIN Message 表获取 SenderName

**备选方案：**
- 方案A：JOIN Message 表获取 SenderName（选择）
- 方案B：前端根据 SenderId 调用用户接口查询
- 方案C：在 GroupFileItem 表冗余存储 SenderName

**理由：**
- 方案A一次查询，性能最好，Message 表已有 SenderName 字段
- 方案B有 N+1 问题，性能差
- 方案C需要维护数据一致性

### Decision 4: 数据库迁移策略

**选择：** 使用 GORM AutoMigrate 自动迁移

**理由：**
- 自动添加新列，不会删除已有数据
- 新字段有默认值，兼容旧数据
- 项目已使用 GORM，无需额外依赖

## Risks / Trade-offs

### Risk 1: 数据库迁移失败
**影响：** 服务无法启动
**缓解措施：** 
- 使用 GORM AutoMigrate，只添加列，不修改或删除
- 新字段有默认值，不影响现有数据
- 迁移前备份数据库

### Risk 2: 旧数据兼容性问题
**影响：** 旧接龙/投票显示异常
**缓解措施：**
- Format 字段默认空字符串，前端为空时不显示格式说明
- VoteType 字段默认 "single"，与原有逻辑一致
- 前端做好空值处理

### Risk 3: 前端表单状态管理复杂度
**影响：** 代码维护成本增加
**缓解措施：**
- 将创建表单抽成独立组件
- 使用清晰的状态管理
- 添加必要的表单验证

## Migration Plan

### 部署步骤

1. 后端部署：
   - 更新代码
   - 重启服务，GORM AutoMigrate 自动添加新列
   - 验证 API 正常

2. 前端部署：
   - 更新代码
   - 构建并部署
   - 验证功能正常

### 回滚策略

1. 后端回滚：
   - 回滚代码版本
   - 重启服务
   - 新增列不影响旧代码运行

2. 前端回滚：
   - 回滚代码版本
   - 重新构建部署

## Open Questions

无
