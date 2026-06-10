package webserver

const (
	errCaptchaGenerateFailed    = "验证码生成失败"
	errRequestFormat            = "请求格式错误"
	errPasswordChangedReLogin   = "密码修改成功，请重新登录"
	errOnlyInviteFriendsToGroup = "只能邀请好友创建群聊"
	errSelectAtLeastOneFriend   = "请至少选择一位好友"
	errMissingUploadFile        = "缺少上传文件"
	errPleaseUploadFile         = "请上传文件"
	errAuthExpired              = "登录已过期，请重新登录"
	errConversationAccessDenied = "无权访问该会话"
	errConversationNoPermission = "无权限访问该会话"
	errGroupAccessDenied        = "无权限访问该群聊"
	errNotInGroupConversation   = "不在该群聊中"
	errGroupOwnerOnly           = "只有群主"
	errUseDismissForOwner       = "群主请使用解散群聊功能"
	errDismissGroupOwnerOnly    = "只有群主可以解散群聊"
	errAdminOnly                = "只有管理员可以执行此操作"
	msgFriendBlocked            = "已加入黑名单"
	msgFriendUnblocked          = "已移出黑名单"
)
