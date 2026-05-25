/// <reference types="vite/client" />

interface ElectronRuntimeConfig {
  apiBaseUrl?: string;
  wsBaseUrl?: string;
}

interface MyChatWindowState {
  isMaximized: boolean;
  isAlwaysOnTop: boolean;
}

interface MyChatAttentionPreviewPayload {
  title: string;
  content: string;
  count: number;
  avatar?: string;
  conversationId?: string;
  messageScope?: "private" | "group" | "system";
}

interface MyChatWindowControls {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<{ isMaximized: boolean }>;
  close: () => Promise<void>;
  toggleAlwaysOnTop: () => Promise<{ isAlwaysOnTop: boolean }>;
  startAttention: (conversationId?: string) => Promise<void>;
  stopAttention: () => Promise<void>;
  clearAttentionConversation: (conversationId?: string) => Promise<{ remaining: number }>;
  updateAttentionPreview: (payload: MyChatAttentionPreviewPayload) => Promise<void>;
  getVisibilityState: () => Promise<{
    isVisible: boolean;
    isFocused: boolean;
    isMinimized: boolean;
  }>;
  getBounds: () => Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  getState: () => Promise<MyChatWindowState>;
  onStateChange: (listener: (state: MyChatWindowState) => void) => () => void;
  onAttentionOpenConversation: (
    listener: (payload: { conversationId: string; activeDock: "chat" }) => void,
  ) => () => void;
}

interface MyChatAttentionPreview {
  open: () => Promise<void>;
  dismiss: () => Promise<void>;
  setHover: (hovered: boolean) => Promise<void>;
  onUpdate: (listener: (payload: MyChatAttentionPreviewPayload) => void) => () => void;
}

interface MyChatMomentsContext {
  userId?: string;
}

interface MyChatMoments {
  open: (context?: MyChatMomentsContext) => Promise<void>;
  getContext: () => Promise<MyChatMomentsContext>;
  onContextChange: (listener: (context: MyChatMomentsContext) => void) => () => void;
  isMomentsWindow: boolean;
}

interface Window {
  chatRoomConfig?: ElectronRuntimeConfig;
  myChatDesktop?: boolean;
  myChatWindow?: MyChatWindowControls;
  myChatAttentionPreview?: MyChatAttentionPreview;
  myChatMoments?: MyChatMoments;
}
