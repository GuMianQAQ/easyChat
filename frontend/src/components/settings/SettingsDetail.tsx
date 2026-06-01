import { Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  CompletionGranularity,
  CurrentUser,
  FriendItem,
  PredictionScope,
  PrivacySettings,
  ThemeMode,
  UserSettings,
} from "../../types/chat";
import Avatar from "../common/Avatar";
import SegmentedControl from "./SegmentedControl";
import SettingsRow from "./SettingsRow";
import SettingsSection from "./SettingsSection";
import Switch from "./Switch";

type EditableField = "nickname" | "gender" | "region" | "signature" | null;

interface SettingsDetailProps {
  settings: UserSettings;
  username: string;
  nickname: string;
  avatar: string;
  gender: CurrentUser["gender"];
  region: string;
  signature: string;
  privacy: PrivacySettings;
  blockedFriends: FriendItem[];
  onSettingsChange: (value: UserSettings | ((prev: UserSettings) => UserSettings)) => void;
  onPrivacyChange: (value: PrivacySettings) => void;
  onProfileUpdate: (
    patch: Partial<Pick<CurrentUser, "nickname" | "gender" | "region" | "signature">>,
  ) => Promise<string | null>;
  onChangePassword: (
    oldPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) => Promise<string | null>;
  onAvatarPick: (file: File) => Promise<void>;
  onResetAvatar: () => void;
  onClearFavorites: () => void;
  onClearContacts: () => void;
  onClearLoginCache: () => void;
  onUnblockFriend: (friendId: string) => void;
}

function formatGender(gender: CurrentUser["gender"]) {
  if (gender === "male") {
    return "男";
  }
  if (gender === "female") {
    return "女";
  }
  return "不显示";
}

export default function SettingsDetail({
  settings,
  username,
  nickname,
  avatar,
  gender,
  region,
  signature,
  privacy,
  blockedFriends,
  onSettingsChange,
  onPrivacyChange,
  onProfileUpdate,
  onChangePassword,
  onAvatarPick,
  onResetAvatar,
  onClearFavorites,
  onClearContacts,
  onClearLoginCache,
  onUnblockFriend,
}: SettingsDetailProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [editingField, setEditingField] = useState<EditableField>(null);
  const [nicknameDraft, setNicknameDraft] = useState(nickname);
  const [genderDraft, setGenderDraft] = useState<CurrentUser["gender"]>(gender);
  const [regionDraft, setRegionDraft] = useState(region);
  const [signatureDraft, setSignatureDraft] = useState(signature);
  const [fieldError, setFieldError] = useState("");
  const [passwordDraft, setPasswordDraft] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (editingField !== "nickname") {
      setNicknameDraft(nickname);
    }
  }, [editingField, nickname]);

  useEffect(() => {
    if (editingField !== "gender") {
      setGenderDraft(gender);
    }
  }, [editingField, gender]);

  useEffect(() => {
    if (editingField !== "region") {
      setRegionDraft(region);
    }
  }, [editingField, region]);

  useEffect(() => {
    if (editingField !== "signature") {
      setSignatureDraft(signature);
    }
  }, [editingField, signature]);

  const updateTheme = (theme: ThemeMode) => {
    onSettingsChange((previous) => ({ ...previous, theme }));
  };

  const updateBoolean = (
    key: "rememberProfile" | "clearAfterSend" | "enterToSend" | "aiSearchEnabled" | "inputCompletion" | "questionPrediction",
    value: boolean,
  ) => {
    onSettingsChange((previous) => ({ ...previous, [key]: value }));
  };

  const updateCompletionGranularity = (granularity: CompletionGranularity) => {
    onSettingsChange((previous) => ({ ...previous, completionGranularity: granularity }));
  };

  const updateCompletionScope = (scope: PredictionScope) => {
    onSettingsChange((previous) => ({ ...previous, completionScope: scope }));
  };

  const updateQuestionPredictionScope = (scope: PredictionScope) => {
    onSettingsChange((previous) => ({ ...previous, questionPredictionScope: scope }));
  };

  const stopEditing = () => {
    setFieldError("");
    setEditingField(null);
  };

  const clearPasswordDraft = () => {
    setPasswordDraft({
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const getPasswordStrength = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const length = [...trimmed].length;
    if (length < 6) {
      return { label: "太短", tone: "weak" as const };
    }

    const hasLetter = /[A-Za-z]/.test(trimmed);
    const hasNumber = /\d/.test(trimmed);
    const hasSpecial = /[^A-Za-z0-9]/.test(trimmed);
    const typeCount = [hasLetter, hasNumber, hasSpecial].filter(Boolean).length;

    if (length >= 8 && typeCount >= 3) {
      return { label: "强", tone: "strong" as const };
    }
    if (typeCount >= 2) {
      return { label: "中", tone: "medium" as const };
    }
    return { label: "弱", tone: "weak" as const };
  };

  const passwordStrength = getPasswordStrength(passwordDraft.newPassword);

  const submitPasswordChange = async () => {
    const oldPassword = passwordDraft.oldPassword.trim();
    const newPassword = passwordDraft.newPassword.trim();
    const confirmPassword = passwordDraft.confirmPassword.trim();

    if (!oldPassword) {
      setPasswordError("请输入旧密码");
      clearPasswordDraft();
      return;
    }
    if (!newPassword) {
      setPasswordError("请输入新密码");
      clearPasswordDraft();
      return;
    }
    if (!confirmPassword) {
      setPasswordError("请输入确认密码");
      clearPasswordDraft();
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("两次输入的新密码不一致");
      clearPasswordDraft();
      return;
    }
    if (newPassword.length < 6 || newPassword.length > 32) {
      setPasswordError("密码长度需为 6-32 位");
      clearPasswordDraft();
      return;
    }
    if (oldPassword === newPassword) {
      setPasswordError("新密码不能和旧密码一样");
      clearPasswordDraft();
      return;
    }

    setPasswordSaving(true);
    setPasswordError("");
    try {
      const error = await onChangePassword(oldPassword, newPassword, confirmPassword);
      if (error) {
        setPasswordError(error);
      }
    } finally {
      setPasswordSaving(false);
      clearPasswordDraft();
    }
  };

  const startEditing = (field: Exclude<EditableField, null>) => {
    setFieldError("");
    setEditingField(field);
  };

  const saveField = async (field: Exclude<EditableField, null>) => {
    let patch: Partial<Pick<CurrentUser, "nickname" | "gender" | "region" | "signature">> = {};

    if (field === "nickname") {
      const next = nicknameDraft.trim();
      if (!next) {
        setFieldError("昵称不能为空");
        return;
      }
      if (next.length > 20) {
        setFieldError("昵称最多 20 个字符");
        return;
      }
      if (next === nickname) {
        stopEditing();
        return;
      }
      patch = { nickname: next };
    }

    if (field === "gender") {
      if (genderDraft === gender) {
        stopEditing();
        return;
      }
      patch = { gender: genderDraft };
    }

    if (field === "region") {
      const next = regionDraft.trim();
      if (next.length > 40) {
        setFieldError("地区最多 40 个字符");
        return;
      }
      if (next === region) {
        stopEditing();
        return;
      }
      patch = { region: next };
    }

    if (field === "signature") {
      const next = signatureDraft.trim();
      if (next.length > 100) {
        setFieldError("个性签名最多 100 个字符");
        return;
      }
      if (next === signature) {
        stopEditing();
        return;
      }
      patch = { signature: next };
    }

    const error = await onProfileUpdate(patch);
    if (error) {
      setFieldError(error);
      return;
    }
    stopEditing();
  };

  return (
    <div className="panel-scroll settings-detail">
      <div className="settings-content">
        <SettingsSection id="settings-account" title="账号">
          <SettingsRow
            label="头像"
            description="当前头像"
            control={
              <div className="settings-actions">
                <button
                  type="button"
                  className="settings-button settings-button-primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera size={14} />
                  <span>修改头像</span>
                </button>
                <button type="button" className="settings-button" onClick={onResetAvatar}>
                  恢复默认
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }
                    await onAvatarPick(file);
                    event.currentTarget.value = "";
                  }}
                />
              </div>
            }
          >
            <div className="settings-avatar-summary">
              <Avatar name={nickname} src={avatar} size="md" />
              <span>{nickname}</span>
            </div>
          </SettingsRow>

          <SettingsRow
            label="昵称"
            description="当前显示名称"
            control={
              editingField === "nickname" ? (
                <div className="settings-edit-control">
                  <input
                    className="settings-edit-input"
                    value={nicknameDraft}
                    maxLength={20}
                    autoFocus
                    onChange={(event) => {
                      setNicknameDraft(event.target.value);
                      setFieldError("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        void saveField("nickname");
                      }
                      if (event.key === "Escape") {
                        stopEditing();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="settings-button settings-button-primary"
                    onClick={() => void saveField("nickname")}
                  >
                    保存
                  </button>
                  <button type="button" className="settings-button" onClick={stopEditing}>
                    取消
                  </button>
                </div>
              ) : (
                <div className="settings-inline-control">
                  <span>{nickname}</span>
                  <button type="button" className="settings-button" onClick={() => startEditing("nickname")}>
                    编辑
                  </button>
                </div>
              )
            }
          >
            {editingField === "nickname" && fieldError ? (
              <span className="settings-row-error">{fieldError}</span>
            ) : null}
          </SettingsRow>

          <SettingsRow label="账号" description="登录账号" control={<span>{username}</span>} />

          <SettingsRow
            label="性别"
            description="资料页显示"
            control={
              editingField === "gender" ? (
                <div className="settings-edit-control">
                  <select
                    className="settings-edit-input settings-profile-select"
                    value={genderDraft}
                    onChange={(event) => {
                      setGenderDraft(event.target.value as CurrentUser["gender"]);
                      setFieldError("");
                    }}
                  >
                    <option value="unknown">不显示</option>
                    <option value="male">男</option>
                    <option value="female">女</option>
                  </select>
                  <button
                    type="button"
                    className="settings-button settings-button-primary"
                    onClick={() => void saveField("gender")}
                  >
                    保存
                  </button>
                  <button type="button" className="settings-button" onClick={stopEditing}>
                    取消
                  </button>
                </div>
              ) : (
                <div className="settings-inline-control">
                  <span>{formatGender(gender)}</span>
                  <button type="button" className="settings-button" onClick={() => startEditing("gender")}>
                    编辑
                  </button>
                </div>
              )
            }
          />

          <SettingsRow
            label="地区"
            description="例如：广东 深圳"
            control={
              editingField === "region" ? (
                <div className="settings-edit-control">
                  <input
                    className="settings-edit-input"
                    value={regionDraft}
                    maxLength={40}
                    autoFocus
                    placeholder="例如：广东 深圳"
                    onChange={(event) => {
                      setRegionDraft(event.target.value);
                      setFieldError("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        void saveField("region");
                      }
                      if (event.key === "Escape") {
                        stopEditing();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="settings-button settings-button-primary"
                    onClick={() => void saveField("region")}
                  >
                    保存
                  </button>
                  <button type="button" className="settings-button" onClick={stopEditing}>
                    取消
                  </button>
                </div>
              ) : (
                <div className="settings-inline-control">
                  <span>{region || "未设置"}</span>
                  <button type="button" className="settings-button" onClick={() => startEditing("region")}>
                    编辑
                  </button>
                </div>
              )
            }
          >
            {editingField === "region" && fieldError ? (
              <span className="settings-row-error">{fieldError}</span>
            ) : null}
          </SettingsRow>

          <SettingsRow
            label="个性签名"
            description="显示在联系人资料页"
            control={
              editingField === "signature" ? (
                <div className="settings-edit-control settings-edit-control-column">
                  <textarea
                    className="settings-edit-input settings-edit-textarea"
                    value={signatureDraft}
                    maxLength={100}
                    autoFocus
                    placeholder="写一句个性签名"
                    onChange={(event) => {
                      setSignatureDraft(event.target.value);
                      setFieldError("");
                    }}
                    onKeyDown={(event) => {
                      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                        void saveField("signature");
                      }
                      if (event.key === "Escape") {
                        stopEditing();
                      }
                    }}
                  />
                  <div className="settings-actions settings-actions-inline">
                    <button
                      type="button"
                      className="settings-button settings-button-primary"
                      onClick={() => void saveField("signature")}
                    >
                      保存
                    </button>
                    <button type="button" className="settings-button" onClick={stopEditing}>
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="settings-inline-control settings-inline-control-wrap">
                  <span className="settings-value-text">{signature || "未设置"}</span>
                  <button type="button" className="settings-button" onClick={() => startEditing("signature")}>
                    编辑
                  </button>
                </div>
              )
            }
          >
            {editingField === "signature" && fieldError ? (
              <span className="settings-row-error">{fieldError}</span>
            ) : null}
          </SettingsRow>
        </SettingsSection>

        <SettingsSection id="settings-appearance" title="外观">
          <SettingsRow
            label="主题"
            description="界面显示方式"
            control={<SegmentedControl value={settings.theme} onChange={updateTheme} />}
          />
        </SettingsSection>

        <SettingsSection id="settings-preferences" title="偏好">
          <SettingsRow
            label="记住账号"
            description="下次打开时自动填入账号"
            control={
              <Switch
                checked={settings.rememberProfile}
                onChange={(value) => updateBoolean("rememberProfile", value)}
                label="记住账号"
              />
            }
          />
          <SettingsRow
            label="发送后清空"
            description="消息发送成功后清空输入框"
            control={
              <Switch
                checked={settings.clearAfterSend}
                onChange={(value) => updateBoolean("clearAfterSend", value)}
                label="发送后清空"
              />
            }
          />
          <SettingsRow
            label="Enter 发送"
            description="Shift + Enter 换行"
            control={
              <Switch
                checked={settings.enterToSend}
                onChange={(value) => updateBoolean("enterToSend", value)}
                label="Enter 发送"
              />
            }
          />
        </SettingsSection>

        <SettingsSection id="settings-ai" title="AI 功能">
          <SettingsRow
            label="输入补全"
            description="预测用户接下来要输入的内容，按 Tab 补全。关闭后不会调用 AI，节省 token"
            control={
              <Switch
                checked={settings.inputCompletion}
                onChange={(value) => updateBoolean("inputCompletion", value)}
                label="输入补全"
              />
            }
          />
          {settings.inputCompletion ? (
            <>
              <SettingsRow
                label="补全粒度"
                description="简单：下一个词；中等：下一个短语；复杂：下一句话"
                control={
                  <div className="settings-radio-group">
                    <label>
                      <input
                        type="radio"
                        name="completionGranularity"
                        value="simple"
                        checked={settings.completionGranularity === "simple"}
                        onChange={() => updateCompletionGranularity("simple")}
                      />
                      简单
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="completionGranularity"
                        value="medium"
                        checked={settings.completionGranularity === "medium"}
                        onChange={() => updateCompletionGranularity("medium")}
                      />
                      中等
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="completionGranularity"
                        value="complex"
                        checked={settings.completionGranularity === "complex"}
                        onChange={() => updateCompletionGranularity("complex")}
                      />
                      复杂
                    </label>
                  </div>
                }
              />
              <SettingsRow
                label="补全范围"
                description="选择在哪些会话中启用输入补全"
                control={
                  <div className="settings-radio-group">
                    <label>
                      <input
                        type="radio"
                        name="completionScope"
                        value="all"
                        checked={settings.completionScope === "all"}
                        onChange={() => updateCompletionScope("all")}
                      />
                      所有会话
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="completionScope"
                        value="ai"
                        checked={settings.completionScope === "ai"}
                        onChange={() => updateCompletionScope("ai")}
                      />
                      仅 AI 助手
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="completionScope"
                        value="normal"
                        checked={settings.completionScope === "normal"}
                        onChange={() => updateCompletionScope("normal")}
                      />
                      仅普通会话
                    </label>
                  </div>
                }
              />
            </>
          ) : null}
          <SettingsRow
            label="问答预测"
            description="根据输入预测可能的问题并显示答案。关闭后不会调用 AI，节省 token"
            control={
              <Switch
                checked={settings.questionPrediction}
                onChange={(value) => updateBoolean("questionPrediction", value)}
                label="问答预测"
              />
            }
          />
          {settings.questionPrediction ? (
            <SettingsRow
              label="预测范围"
              description="选择在哪些会话中启用问答预测"
              control={
                <div className="settings-radio-group">
                  <label>
                    <input
                      type="radio"
                      name="questionPredictionScope"
                      value="all"
                      checked={settings.questionPredictionScope === "all"}
                      onChange={() => updateQuestionPredictionScope("all")}
                    />
                    所有会话
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="questionPredictionScope"
                      value="ai"
                      checked={settings.questionPredictionScope === "ai"}
                      onChange={() => updateQuestionPredictionScope("ai")}
                    />
                    仅 AI 助手
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="questionPredictionScope"
                      value="normal"
                      checked={settings.questionPredictionScope === "normal"}
                      onChange={() => updateQuestionPredictionScope("normal")}
                    />
                    仅普通会话
                  </label>
                </div>
              }
            />
          ) : null}
          <SettingsRow
            label="AI 语义搜索"
            description="在搜索面板中启用 AI 聊天记录搜索"
            control={
              <Switch
                checked={settings.aiSearchEnabled}
                onChange={(value) => updateBoolean("aiSearchEnabled", value)}
                label="AI 语义搜索"
              />
            }
          />
        </SettingsSection>

        <SettingsSection id="settings-privacy" title="隐私">
          <SettingsRow
            label="允许通过账号搜索到我"
            description="账号可被精确搜索"
            control={
              <Switch
                checked={privacy.allowSearch}
                onChange={(value) => onPrivacyChange({ ...privacy, allowSearch: value })}
                label="允许通过账号搜索到我"
              />
            }
          />
          <SettingsRow
            label="允许别人添加我为好友"
            description="允许发送好友申请"
            control={
              <Switch
                checked={privacy.allowFriendRequest}
                onChange={(value) => onPrivacyChange({ ...privacy, allowFriendRequest: value })}
                label="允许别人添加我为好友"
              />
            }
          />
          <SettingsRow
            label="添加我时需要验证"
            description="关闭后直接成为好友"
            control={
              <Switch
                checked={privacy.requireFriendVerify}
                onChange={(value) => onPrivacyChange({ ...privacy, requireFriendVerify: value })}
                label="添加我时需要验证"
              />
            }
          />
        </SettingsSection>

        <SettingsSection id="settings-password" title="修改密码">
          <SettingsRow
            label="旧密码"
            control={
              <input
                className="settings-edit-input settings-password-input"
                type="password"
                autoComplete="current-password"
                placeholder="请输入当前密码"
                value={passwordDraft.oldPassword}
                onChange={(event) => {
                  setPasswordDraft((previous) => ({ ...previous, oldPassword: event.target.value }));
                  setPasswordError("");
                }}
              />
            }
          />
          <SettingsRow
            label="新密码"
            control={
              <div className="settings-password-field">
                <input
                  className="settings-edit-input settings-password-input"
                  type="password"
                  autoComplete="new-password"
                  placeholder="请输入 6-32 位新密码"
                  value={passwordDraft.newPassword}
                  onChange={(event) => {
                    setPasswordDraft((previous) => ({ ...previous, newPassword: event.target.value }));
                    setPasswordError("");
                  }}
                />
                {passwordStrength ? (
                  <span className={`settings-password-strength settings-password-strength-${passwordStrength.tone}`}>
                    {passwordStrength.label}
                  </span>
                ) : null}
              </div>
            }
          />
          <SettingsRow
            label="确认密码"
            control={
              <input
                className="settings-edit-input settings-password-input"
                type="password"
                autoComplete="new-password"
                placeholder="请再次输入新密码"
                value={passwordDraft.confirmPassword}
                onChange={(event) => {
                  setPasswordDraft((previous) => ({ ...previous, confirmPassword: event.target.value }));
                  setPasswordError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void submitPasswordChange();
                  }
                }}
              />
            }
          />
          <div className="settings-password-footer">
            <button
              type="button"
              className="settings-button settings-button-primary"
              disabled={passwordSaving || (passwordStrength?.tone === "weak" && passwordDraft.newPassword.trim().length < 6)}
              onClick={() => void submitPasswordChange()}
            >
              {passwordSaving ? "保存中..." : "保存"}
            </button>
          </div>
          {passwordError ? <div className="settings-row-error settings-password-error">{passwordError}</div> : null}
        </SettingsSection>
        <SettingsSection id="settings-blacklist" title="黑名单">
          {blockedFriends.length === 0 ? (
            <div className="settings-empty-state">暂无黑名单</div>
          ) : (
            <div className="settings-blocked-list">
              {blockedFriends.map((friend) => {
                const displayName = friend.remark || friend.nickname;
                return (
                  <div key={friend.friendId} className="settings-blocked-row">
                    <div className="settings-blocked-copy">
                      <Avatar name={displayName} src={friend.avatar} size="sm" />
                      <div className="settings-blocked-text">
                        <strong>{displayName}</strong>
                        <span>{friend.username}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="settings-button"
                      onClick={() => onUnblockFriend(friend.friendId)}
                    >
                      移出黑名单
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </SettingsSection>

        <SettingsSection id="settings-data" title="本地数据">
          <SettingsRow
            label="收藏"
            description="删除本地收藏的消息"
            control={
              <button type="button" className="settings-button settings-button-danger" onClick={onClearFavorites}>
                清空
              </button>
            }
          />
          <SettingsRow
            label="联系人"
            description="删除本地联系人缓存"
            control={
              <button type="button" className="settings-button settings-button-danger" onClick={onClearContacts}>
                清空
              </button>
            }
          />
          <SettingsRow
            label="登录缓存"
            description="删除保存的账号信息"
            control={
              <button type="button" className="settings-button settings-button-danger" onClick={onClearLoginCache}>
                清空
              </button>
            }
          />
        </SettingsSection>
      </div>
    </div>
  );
}
