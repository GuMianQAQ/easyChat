import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("chatRoomConfig", {
  apiBaseUrl: process.env.VITE_API_BASE_URL || "",
  wsBaseUrl: process.env.VITE_WS_BASE_URL || "",
});
