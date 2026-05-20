/// <reference types="vite/client" />

interface ElectronRuntimeConfig {
  apiBaseUrl?: string;
  wsBaseUrl?: string;
}

interface Window {
  chatRoomConfig?: ElectronRuntimeConfig;
}
