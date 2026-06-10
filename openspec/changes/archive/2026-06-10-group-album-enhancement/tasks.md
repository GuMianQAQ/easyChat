## 1. 数据库设计与迁移

- [x] 1.1 在internal/chatstore/service.go中添加Album模型定义
- [x] 1.2 在internal/chatstore/service.go中添加AlbumPhoto模型定义
- [x] 1.3 在internal/database/database.go的AutoMigrate中添加Album和AlbumPhoto表
- [x] 1.4 测试数据库迁移，确保表结构正确创建

## 2. 后端API实现

- [x] 2.1 在internal/chatstore/group_album.go中实现CreateAlbum函数
- [x] 2.2 在internal/chatstore/group_album.go中实现GetAlbums函数
- [x] 2.3 在internal/chatstore/group_album.go中实现GetAlbum函数
- [x] 2.4 在internal/chatstore/group_album.go中实现UpdateAlbum函数
- [x] 2.5 在internal/chatstore/group_album.go中实现DeleteAlbum函数
- [x] 2.6 在internal/chatstore/group_album.go中实现UploadAlbumPhoto函数
- [x] 2.7 在internal/chatstore/group_album.go中实现GetAlbumPhotos函数
- [x] 2.8 在internal/chatstore/group_album.go中实现DeleteAlbumPhoto函数
- [x] 2.9 在internal/chatstore/group_album.go中实现GetAllAlbumPhotos函数
- [x] 2.10 在internal/chatstore/group_album.go中实现GetMyAlbumPhotos函数
- [x] 2.11 在internal/chatstore/group_album.go中实现BatchDeleteAlbumPhotos函数
- [x] 2.12 在internal/chatstore/group_album.go中实现权限检查辅助函数

## 3. API路由注册

- [x] 3.1 在internal/webserver/group_routes.go中添加创建相册路由
- [x] 3.2 在internal/webserver/group_routes.go中添加获取相册列表路由
- [x] 3.3 在internal/webserver/group_routes.go中添加获取相册详情路由
- [x] 3.4 在internal/webserver/group_routes.go中添加更新相册路由
- [x] 3.5 在internal/webserver/group_routes.go中添加删除相册路由
- [x] 3.6 在internal/webserver/group_routes.go中添加上传图片路由
- [x] 3.7 在internal/webserver/group_routes.go中添加获取相册图片路由
- [x] 3.8 在internal/webserver/group_routes.go中添加删除图片路由
- [x] 3.9 在internal/webserver/group_routes.go中添加获取所有图片路由
- [x] 3.10 在internal/webserver/group_routes.go中添加获取我的图片路由
- [x] 3.11 在internal/webserver/group_routes.go中添加批量删除图片路由
- [x] 3.12 在所有路由中添加权限检查中间件

## 4. 前端API函数

- [x] 4.1 在frontend/src/utils/chatApi.ts中添加createGroupAlbum函数
- [x] 4.2 在frontend/src/utils/chatApi.ts中添加getGroupAlbums函数
- [x] 4.3 在frontend/src/utils/chatApi.ts中添加getGroupAlbum函数
- [x] 4.4 在frontend/src/utils/chatApi.ts中添加updateGroupAlbum函数
- [x] 4.5 在frontend/src/utils/chatApi.ts中添加deleteGroupAlbum函数
- [x] 4.6 在frontend/src/utils/chatApi.ts中添加uploadAlbumPhoto函数
- [x] 4.7 在frontend/src/utils/chatApi.ts中添加getAlbumPhotos函数
- [x] 4.8 在frontend/src/utils/chatApi.ts中添加deleteAlbumPhoto函数
- [x] 4.9 在frontend/src/utils/chatApi.ts中添加getAllAlbumPhotos函数
- [x] 4.10 在frontend/src/utils/chatApi.ts中添加getMyAlbumPhotos函数
- [x] 4.11 在frontend/src/utils/chatApi.ts中添加batchDeleteAlbumPhotos函数

## 5. 前端类型定义

- [x] 5.1 在frontend/src/types/chat.ts中添加Album接口
- [x] 5.2 在frontend/src/types/chat.ts中添加AlbumPhoto接口

## 6. 前端组件实现

- [x] 6.1 重构frontend/src/components/chat/GroupAlbum.tsx，支持三个tab
- [x] 6.2 创建frontend/src/components/chat/AlbumList.tsx相册列表组件
- [x] 6.3 创建frontend/src/components/chat/AlbumDetail.tsx相册详情组件
- [x] 6.4 创建frontend/src/components/chat/AlbumUploader.tsx上传组件，支持上传进度显示
- [x] 6.5 改进frontend/src/components/chat/ImagePreviewModal.tsx，支持左右切换
- [x] 6.6 在AlbumDetail.tsx中实现批量选择和批量删除功能

## 7. 分页功能修复

- [x] 7.1 修复frontend/src/components/chat/GroupAlbum.tsx中的分页bug
- [x] 7.2 在frontend/src/components/chat/GroupAlbum.tsx中添加分页按钮组件
- [x] 7.3 修改internal/chatstore/group_files.go中的分页限制

## 8. 样式实现

- [x] 8.1 在frontend/src/styles/chat/panels.css中添加相册列表样式
- [x] 8.2 在frontend/src/styles/chat/panels.css中添加相册详情样式
- [x] 8.3 在frontend/src/styles/chat/panels.css中添加上传组件样式
- [x] 8.4 在frontend/src/styles/chat/panels.css中添加分页按钮样式

## 9. 测试与验证

- [x] 9.1 测试创建相册功能
- [x] 9.2 测试上传图片功能
- [x] 9.3 测试删除相册和图片功能
- [x] 9.4 测试群动态和与我相关功能
- [x] 9.5 测试大图预览左右切换功能
- [x] 9.6 测试分页功能
- [x] 9.7 测试权限控制功能
- [x] 9.8 测试批量删除图片功能
- [x] 9.9 测试上传进度显示功能
