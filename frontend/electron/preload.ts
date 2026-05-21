import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("chatRoomConfig", {
  apiBaseUrl: process.env.VITE_API_BASE_URL || "",
  wsBaseUrl: process.env.VITE_WS_BASE_URL || "",
});

contextBridge.exposeInMainWorld("myChatDesktop", true);

contextBridge.exposeInMainWorld("myChatWindow", {
  minimize: () => ipcRenderer.invoke("mychat-window:minimize"),
  toggleMaximize: () => ipcRenderer.invoke("mychat-window:toggle-maximize"),
  close: () => ipcRenderer.invoke("mychat-window:close"),
  toggleAlwaysOnTop: () => ipcRenderer.invoke("mychat-window:toggle-always-on-top"),
  getState: () => ipcRenderer.invoke("mychat-window:get-state") as Promise<{
    isMaximized: boolean;
    isAlwaysOnTop: boolean;
  }>,
  onStateChange: (listener: (state: { isMaximized: boolean; isAlwaysOnTop: boolean }) => void) => {
    const wrapped = (_event: unknown, state: { isMaximized: boolean; isAlwaysOnTop: boolean }) => {
      listener(state);
    };
    ipcRenderer.on("mychat:window-state", wrapped);
    return () => ipcRenderer.removeListener("mychat:window-state", wrapped);
  },
});
