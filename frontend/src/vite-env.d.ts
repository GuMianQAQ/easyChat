/// <reference types="vite/client" />

interface ElectronRuntimeConfig {
  apiBaseUrl?: string;
  wsBaseUrl?: string;
}

interface MyChatWindowState {
  isMaximized: boolean;
  isAlwaysOnTop: boolean;
}

interface MyChatWindowControls {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<{ isMaximized: boolean }>;
  close: () => Promise<void>;
  toggleAlwaysOnTop: () => Promise<{ isAlwaysOnTop: boolean }>;
  getState: () => Promise<MyChatWindowState>;
  onStateChange: (listener: (state: MyChatWindowState) => void) => () => void;
}

interface Window {
  chatRoomConfig?: ElectronRuntimeConfig;
  myChatDesktop?: boolean;
  myChatWindow?: MyChatWindowControls;
}
