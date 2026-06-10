import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  confirmRegion: (rect: { x: number; y: number; w: number; h: number }) =>
    ipcRenderer.invoke("mychat-capture:confirm-region", rect),
  cancel: () => ipcRenderer.invoke("mychat-capture:cancel-selector"),
});
