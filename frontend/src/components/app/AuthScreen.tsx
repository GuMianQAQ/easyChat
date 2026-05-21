import LoginPage from "../login/LoginPage";
import DesktopWindowFrame from "./DesktopWindowFrame";
import type { AuthDraft, AuthMode } from "../../types/chat";

interface AuthScreenProps {
  draft: AuthDraft;
  rememberProfile: boolean;
  loginError: string;
  registerError: string;
  pending: boolean;
  onModeChange: (mode: AuthMode) => void;
  onDraftChange: (next: AuthDraft) => void;
  onRememberChange: (value: boolean) => void;
  onAvatarPick: (file: File) => Promise<void>;
  onResetAvatar: () => void;
  onRefreshCaptcha: () => void;
  onSubmitLogin: () => void;
  onSubmitRegister: () => void;
}

export default function AuthScreen(props: AuthScreenProps) {
  return (
    <DesktopWindowFrame>
      <LoginPage {...props} />
    </DesktopWindowFrame>
  );
}
