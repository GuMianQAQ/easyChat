## 1. 后端修改

- [x] 1.1 在 webchat/message.go 中添加 ChatMessageFile 常量
- [x] 1.2 在 ValidateInput 函数中添加 file 类型验证逻辑

## 2. 前端 hooks 修改

- [x] 2.1 在 useChatSocket.ts 的 UseChatSocketResult 接口中添加 sendFileMessage
- [x] 2.2 在 useChatSocket.ts 中实现 sendFileMessage 函数
- [x] 2.3 在 chatSocketHelpers.ts 的 normalizeQuote 中添加 file 类型支持

## 3. 前端 actions 修改

- [x] 3.1 在 createConversationActions.ts 中添加 handleSendFile 函数
- [x] 3.2 在 App.tsx 中解构并传递 handleSendFile

## 4. 前端组件修改

- [x] 4.1 在 MessageComposer.tsx 中添加文件选择 ref 和处理函数
- [x] 4.2 启用 MessageComposer.tsx 中的图片按钮
- [x] 4.3 启用 MessageComposer.tsx 中的文件按钮
- [x] 4.4 在 MessageComposer.tsx 中添加 onSendFile 属性
- [x] 4.5 在 ChatView.tsx 中接收并传递 onSendFile

## 5. 前端渲染修改

- [x] 5.1 在 MessageBubble.tsx 中添加文件消息渲染逻辑
- [x] 5.2 添加文件消息的 CSS 样式

## 6. 测试验证

- [ ] 6.1 测试图片选择和发送功能
- [ ] 6.2 测试文件选择和发送功能
- [ ] 6.3 测试文件消息的显示和下载
- [ ] 6.4 测试文件消息的引用功能
