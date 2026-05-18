import { Camera } from "lucide-react";
import { useRef, useState } from "react";
import type { AuthDraft, AuthMode } from "../../types/chat";
import Avatar from "../common/Avatar";
import AnimatedCharacters from "./AnimatedCharacters";

interface LoginPageProps {
  draft: AuthDraft;
  rememberProfile: boolean;
  loginError: string;
  registerError: string;
  pending: boolean;
  onModeChange: (mode: AuthMode) => void;
  onDraftChange: (value: AuthDraft) => void;
  onRememberChange: (value: boolean) => void;
  onAvatarPick: (file: File) => Promise<void>;
  onResetAvatar: () => void;
  onRefreshCaptcha: () => void;
  onSubmitLogin: () => void;
  onSubmitRegister: () => void;
}

function LoginPage({
  draft,
  rememberProfile,
  loginError,
  registerError,
  pending,
  onModeChange,
  onDraftChange,
  onRememberChange,
  onAvatarPick,
  onResetAvatar,
  onRefreshCaptcha,
  onSubmitLogin,
  onSubmitRegister,
}: LoginPageProps) {
  const [primaryFocused, setPrimaryFocused] = useState(false);
  const [secondaryFocused, setSecondaryFocused] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const isLogin = draft.mode === "login";
  const registerPreviewName = draft.register.nickname || "访客";
  const roomLength = isLogin
    ? draft.login.password.length
    : draft.register.captchaCode.trim().length || draft.register.password.length;

  return (
    <main className="login-page">
      <section className="login-shell">
        <div className="login-left">
          <div className="login-brand">
            <span className="login-brand-mark" />
            <span>Go 简易聊天室</span>
          </div>
          <AnimatedCharacters
            nicknameFocused={primaryFocused}
            roomFocused={secondaryFocused}
            roomLength={roomLength}
          />
          <div className="login-links">
            <span>项目说明</span>
            <span>使用帮助</span>
            <span>关于</span>
          </div>
        </div>

        <div className="login-right">
          <div className="login-card">
            <div className="login-card-copy">
              <h2>{isLogin ? "欢迎回来" : "注册账号"}</h2>
              <p>{isLogin ? "请输入账号信息" : "创建你的聊天账号"}</p>
            </div>

            {isLogin ? (
              <>
                <label className="login-field">
                  <span>账号</span>
                  <input
                    type="text"
                    autoComplete="username"
                    placeholder="请输入账号"
                    value={draft.login.username}
                    onFocus={() => setPrimaryFocused(true)}
                    onBlur={() => setPrimaryFocused(false)}
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        login: { ...draft.login, username: event.target.value },
                      })
                    }
                  />
                </label>

                <label className="login-field">
                  <span>密码</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    placeholder="请输入密码"
                    value={draft.login.password}
                    onFocus={() => setSecondaryFocused(true)}
                    onBlur={() => setSecondaryFocused(false)}
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        login: { ...draft.login, password: event.target.value },
                      })
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onSubmitLogin();
                      }
                    }}
                  />
                </label>

                <label className="login-check">
                  <input
                    type="checkbox"
                    checked={rememberProfile}
                    onChange={(event) => onRememberChange(event.target.checked)}
                  />
                  <span>记住账号</span>
                </label>

                {loginError ? <p className="login-error">{loginError}</p> : null}

                <button type="button" className="login-submit" disabled={pending} onClick={onSubmitLogin}>
                  {pending ? "登录中" : "登录"}
                </button>

                <button type="button" className="login-switch" onClick={() => onModeChange("register")}>
                  没有账号？注册
                </button>
              </>
            ) : (
              <>
                <label className="login-field">
                  <span>账号</span>
                  <input
                    type="text"
                    autoComplete="username"
                    maxLength={20}
                    placeholder="请输入账号"
                    value={draft.register.username}
                    onFocus={() => setPrimaryFocused(true)}
                    onBlur={() => setPrimaryFocused(false)}
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        register: { ...draft.register, username: event.target.value },
                      })
                    }
                  />
                </label>

                <label className="login-field">
                  <span>密码</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="至少 6 位"
                    value={draft.register.password}
                    onFocus={() => setSecondaryFocused(true)}
                    onBlur={() => setSecondaryFocused(false)}
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        register: { ...draft.register, password: event.target.value },
                      })
                    }
                  />
                </label>

                <label className="login-field">
                  <span>确认密码</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="再次输入密码"
                    value={draft.register.confirmPassword}
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        register: { ...draft.register, confirmPassword: event.target.value },
                      })
                    }
                  />
                </label>

                <label className="login-field">
                  <span>昵称</span>
                  <input
                    type="text"
                    maxLength={20}
                    placeholder="请输入昵称"
                    value={draft.register.nickname}
                    onFocus={() => setPrimaryFocused(true)}
                    onBlur={() => setPrimaryFocused(false)}
                    onChange={(event) =>
                      onDraftChange({
                        ...draft,
                        register: { ...draft.register, nickname: event.target.value },
                      })
                    }
                  />
                </label>

                <div className="login-avatar-row">
                  <Avatar name={registerPreviewName} src={draft.register.avatar} size="lg" />
                  <div className="login-avatar-actions">
                    <button
                      type="button"
                      className="login-avatar-button"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      <Camera size={16} />
                      <span>选择头像</span>
                    </button>
                    <button type="button" className="login-link-button" onClick={onResetAvatar}>
                      恢复默认
                    </button>
                    <input
                      ref={avatarInputRef}
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
                </div>

                <div className="login-captcha-row">
                  <label className="login-field login-field-grow">
                    <span>图片验证码</span>
                    <input
                      type="text"
                      maxLength={8}
                      placeholder="请输入验证码"
                      value={draft.register.captchaCode}
                      onFocus={() => setSecondaryFocused(true)}
                      onBlur={() => setSecondaryFocused(false)}
                      onChange={(event) =>
                        onDraftChange({
                          ...draft,
                          register: { ...draft.register, captchaCode: event.target.value },
                        })
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          onSubmitRegister();
                        }
                      }}
                    />
                  </label>
                  <button type="button" className="login-captcha-image" onClick={onRefreshCaptcha}>
                    {draft.register.captchaImage ? (
                      <img src={draft.register.captchaImage} alt="验证码" />
                    ) : (
                      <span>加载中</span>
                    )}
                  </button>
                </div>

                {registerError ? <p className="login-error">{registerError}</p> : null}

                <button type="button" className="login-submit" disabled={pending} onClick={onSubmitRegister}>
                  {pending ? "注册中" : "注册"}
                </button>

                <button type="button" className="login-switch" onClick={() => onModeChange("login")}>
                  已有账号？登录
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
