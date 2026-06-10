package apperrors

import "errors"

// AppError 自定义错误类型，包含 HTTP 状态码和错误信息
type AppError struct {
	Code    int
	Message string
}

func (e *AppError) Error() string {
	return e.Message
}

// Is 检查错误是否匹配目标错误
func Is(err, target error) bool {
	return errors.Is(err, target)
}

// As 将错误转换为目标类型
func As(err error, target interface{}) bool {
	return errors.As(err, target)
}

// New 创建新的错误（用于非 AppError 的普通错误）
func New(text string) error {
	return errors.New(text)
}

// 预定义错误变量 - 通用
var (
	ErrNotFound     = &AppError{Code: 404, Message: "资源不存在"}
	ErrBadRequest   = &AppError{Code: 400, Message: "请求格式错误"}
	ErrUnauthorized = &AppError{Code: 401, Message: "未授权"}
	ErrForbidden    = &AppError{Code: 403, Message: "无权限"}
	ErrInternal     = &AppError{Code: 500, Message: "内部错误"}
)

// 预定义错误变量 - 认证相关
var (
	ErrAuthExpired            = &AppError{Code: 401, Message: "登录已过期，请重新登录"}
	ErrCaptchaGenerateFailed  = &AppError{Code: 500, Message: "验证码生成失败"}
	ErrPasswordChangedReLogin = &AppError{Code: 401, Message: "密码修改成功，请重新登录"}
)

// 预定义错误变量 - 会话相关
var (
	ErrConversationAccessDenied = &AppError{Code: 403, Message: "无权访问该会话"}
	ErrConversationNoPermission = &AppError{Code: 403, Message: "无权限访问该会话"}
	ErrConversationNotFound     = &AppError{Code: 404, Message: "会话不存在"}
)

// 预定义错误变量 - 群聊相关
var (
	ErrGroupAccessDenied            = &AppError{Code: 403, Message: "无权限访问该群聊"}
	ErrGroupNotFound                = &AppError{Code: 404, Message: "群聊不存在"}
	ErrNotInGroupConversation       = &AppError{Code: 403, Message: "不在该群聊中"}
	ErrGroupOwnerOnly               = &AppError{Code: 403, Message: "只有群主"}
	ErrUseDismissForOwner           = &AppError{Code: 400, Message: "群主请使用解散群聊功能"}
	ErrDismissGroupOwnerOnly        = &AppError{Code: 403, Message: "只有群主可以解散群聊"}
	ErrAdminOnly                    = &AppError{Code: 403, Message: "只有管理员可以执行此操作"}
	ErrNotGroupConversation         = &AppError{Code: 400, Message: "当前会话不是群聊"}
	ErrUserNotInGroup               = &AppError{Code: 400, Message: "当前用户不在该群聊中"}
	ErrCannotModifySelfRole         = &AppError{Code: 400, Message: "不能修改自己的角色"}
	ErrInvalidRole                  = &AppError{Code: 400, Message: "无效的角色"}
	ErrCannotTransferToSelf         = &AppError{Code: 400, Message: "不能转让给自己"}
	ErrCannotMuteSelf               = &AppError{Code: 400, Message: "不能禁言自己"}
	ErrCannotMuteOwner              = &AppError{Code: 400, Message: "不能禁言群主"}
	ErrAdminCannotMuteAdmin         = &AppError{Code: 400, Message: "管理员不能禁言其他管理员"}
	ErrOnlyAdminCanMute             = &AppError{Code: 403, Message: "只有管理员可以禁言成员"}
	ErrOnlyAdminCanUnmute           = &AppError{Code: 403, Message: "只有管理员可以解除禁言"}
	ErrOnlyOwnerCanSetBot           = &AppError{Code: 403, Message: "只有群主可以设置群机器人"}
	ErrOnlyOwnerCanModifyPerm       = &AppError{Code: 403, Message: "只有群主可以修改权限设置"}
	ErrOnlyOwnerCanSetAdmin         = &AppError{Code: 403, Message: "只有群主可以设置管理员"}
	ErrOnlyOwnerCanTransfer         = &AppError{Code: 403, Message: "只有群主可以转让群主身份"}
	ErrOnlyAdminCanChangeName       = &AppError{Code: 403, Message: "只有管理员可以修改群名称"}
	ErrOnlyAdminCanChangeAvatar     = &AppError{Code: 403, Message: "只有管理员可以修改群头像"}
	ErrOnlyAdminCanChangeAnnouncement = &AppError{Code: 403, Message: "只有管理员可以修改群公告"}
	ErrAvatarMustUseUploadURL       = &AppError{Code: 400, Message: "群头像必须使用上传后的地址"}
	ErrOnlyInviteFriendsToGroup     = &AppError{Code: 400, Message: "只能邀请好友创建群聊"}
	ErrSelectAtLeastOneFriend       = &AppError{Code: 400, Message: "请至少选择一位好友"}
	ErrSelectFriendsToInvite        = &AppError{Code: 400, Message: "请选择要邀请的好友"}
)

// 预定义错误变量 - 消息相关
var (
	ErrMessageNotFound       = &AppError{Code: 404, Message: "消息不存在"}
	ErrMissingMessageID      = &AppError{Code: 400, Message: "缺少消息 ID"}
	ErrCanOnlyRevokeSelf     = &AppError{Code: 400, Message: "只能撤回自己发送的消息"}
	ErrMessageAlreadyRevoked = &AppError{Code: 400, Message: "消息已经撤回"}
	ErrRevokeTimeExpired     = &AppError{Code: 400, Message: "消息发送超过两分钟，无法撤回"}
	ErrMissingRequiredParam  = &AppError{Code: 400, Message: "缺少必要参数"}
)

// 预定义错误变量 - 好友相关
var (
	ErrFriendRequestNotFound      = &AppError{Code: 404, Message: "好友申请不存在"}
	ErrNoPermissionHandleRequest  = &AppError{Code: 403, Message: "无权处理该申请"}
	ErrFriendRequestAlreadyHandled = &AppError{Code: 400, Message: "好友申请已处理"}
	ErrUserNotFound               = &AppError{Code: 404, Message: "未找到该用户"}
	ErrCannotAddSelf              = &AppError{Code: 400, Message: "不能添加自己"}
	ErrAlreadyFriend              = &AppError{Code: 400, Message: "已经是好友"}
	ErrNotAcceptingRequests       = &AppError{Code: 400, Message: "对方暂不接受好友申请"}
	ErrInputCompleteAccount       = &AppError{Code: 400, Message: "请输入完整账号"}
	ErrFriendBlocked              = &AppError{Code: 400, Message: "已加入黑名单"}
	ErrFriendUnblocked            = &AppError{Code: 400, Message: "已移出黑名单"}
	ErrNotFriend                  = &AppError{Code: 400, Message: "对方不是你的好友"}
	ErrCannotSendMessageToSelf    = &AppError{Code: 400, Message: "不能给自己发送消息"}
	ErrUserNotAcceptingMessages   = &AppError{Code: 400, Message: "对方暂时无法接收你的消息"}
)

// 预定义错误变量 - 文件相关
var (
	ErrMissingUploadFile = &AppError{Code: 400, Message: "缺少上传文件"}
	ErrPleaseUploadFile  = &AppError{Code: 400, Message: "请上传文件"}
	ErrImageTooLarge     = &AppError{Code: 400, Message: "图片超过 2MB"}
	ErrFileTooLarge      = &AppError{Code: 400, Message: "文件超过 10MB"}
)

// 预定义错误变量 - 投票相关
var (
	ErrVoteNotFound      = &AppError{Code: 404, Message: "投票不存在"}
	ErrVoteEnded         = &AppError{Code: 400, Message: "投票已截止"}
	ErrInvalidOptions    = &AppError{Code: 400, Message: "存在无效的选项"}
	ErrSingleChoiceOnly  = &AppError{Code: 400, Message: "该投票为单选"}
	ErrNotVoted          = &AppError{Code: 400, Message: "你尚未投票"}
	ErrVoteCannotModify  = &AppError{Code: 400, Message: "投票已截止，无法修改"}
	ErrAtLeastTwoOptions = &AppError{Code: 400, Message: "至少需要两个选项"}
	ErrOnlyAdminCanVote  = &AppError{Code: 403, Message: "只有管理员可以发起投票"}
)

// 预定义错误变量 - 接龙相关
var (
	ErrSolitaireNotFound     = &AppError{Code: 404, Message: "接龙不存在"}
	ErrSolitaireItemNotFound = &AppError{Code: 404, Message: "接龙条目不存在"}
	ErrCanOnlyModifySelf     = &AppError{Code: 400, Message: "只能修改自己的接龙内容"}
	ErrOnlyAdminCanSolitaire = &AppError{Code: 403, Message: "只有管理员可以发起接龙"}
)

// 预定义错误变量 - 朋友圈相关
var (
	ErrContentEmpty              = &AppError{Code: 400, Message: "内容不能为空"}
	ErrContentTooLong            = &AppError{Code: 400, Message: "内容太长"}
	ErrMomentCreateFailed        = &AppError{Code: 500, Message: "动态创建失败"}
	ErrMomentNotFound            = &AppError{Code: 404, Message: "动态不存在"}
	ErrCanOnlyDeleteSelf         = &AppError{Code: 400, Message: "只能删除自己的动态"}
	ErrCommentEmpty              = &AppError{Code: 400, Message: "评论内容不能为空"}
	ErrCommentTooLong            = &AppError{Code: 400, Message: "评论太长"}
	ErrCommentNotFound           = &AppError{Code: 404, Message: "评论不存在"}
	ErrNoPermissionDeleteComment = &AppError{Code: 403, Message: "无权删除此评论"}
	ErrNoPermissionViewMoment    = &AppError{Code: 403, Message: "无权查看该朋友圈"}
	ErrNoPermissionViewMoment2   = &AppError{Code: 403, Message: "无权查看此动态"}
	ErrMissingUserInfo           = &AppError{Code: 400, Message: "缺少用户信息"}
	ErrCommentAuthorNotFound     = &AppError{Code: 404, Message: "评论作者不存在"}
)

// 预定义错误变量 - 用户资料相关
var (
	ErrNicknameRequired = &AppError{Code: 400, Message: "昵称不能为空"}
	ErrNicknameTooLong  = &AppError{Code: 400, Message: "昵称太长"}
	ErrGenderInvalid    = &AppError{Code: 400, Message: "性别无效"}
	ErrRegionTooLong    = &AppError{Code: 400, Message: "地区太长"}
	ErrSignatureTooLong = &AppError{Code: 400, Message: "个性签名太长"}
)
