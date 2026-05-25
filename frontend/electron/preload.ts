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
  startAttention: (conversationId?: string) =>
    ipcRenderer.invoke("mychat-window:start-attention", conversationId),
  stopAttention: () => ipcRenderer.invoke("mychat-window:stop-attention"),
  clearAttentionConversation: (conversationId?: string) =>
    ipcRenderer.invoke("mychat-window:clear-attention-conversation", conversationId) as Promise<{
      remaining: number;
    }>,
  updateAttentionPreview: (payload: {
    title: string;
    content: string;
    count: number;
    avatar?: string;
    conversationId?: string;
    messageScope?: "private" | "group" | "system";
  }) =>
    ipcRenderer.invoke("mychat-window:update-attention-preview", payload),
  getVisibilityState: () => ipcRenderer.invoke("mychat-window:get-visibility-state") as Promise<{
    isVisible: boolean;
    isFocused: boolean;
    isMinimized: boolean;
  }>,
  getBounds: () =>
    ipcRenderer.invoke("mychat-window:get-bounds") as Promise<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>,
  moveFrame: (payload: { x: number; y: number }) =>
    ipcRenderer.invoke("mychat-window:move-frame", payload) as Promise<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>,
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
  onAttentionOpenConversation: (
    listener: (payload: { conversationId: string; activeDock: "chat" }) => void,
  ) => {
    const wrapped = (
      _event: unknown,
      payload: { conversationId: string; activeDock: "chat" },
    ) => {
      listener(payload);
    };
    ipcRenderer.on("mychat:attention-open-conversation", wrapped);
    return () => ipcRenderer.removeListener("mychat:attention-open-conversation", wrapped);
  },
});

contextBridge.exposeInMainWorld("myChatMoments", {
  open: (context?: { userId?: string }) => ipcRenderer.invoke("mychat-moments:open", context),
  getContext: () => ipcRenderer.invoke("mychat-moments:get-context") as Promise<{ userId?: string }>,
  onContextChange: (listener: (context: { userId?: string }) => void) => {
    const wrapped = (_event: unknown, context: { userId?: string }) => {
      listener(context);
    };
    ipcRenderer.on("mychat:moments-context", wrapped);
    return () => ipcRenderer.removeListener("mychat:moments-context", wrapped);
  },
  isMomentsWindow: location.search.includes("window=moments"),
});

contextBridge.exposeInMainWorld("myChatAttentionPreview", {
  open: () => ipcRenderer.invoke("mychat-attention:open"),
  dismiss: () => ipcRenderer.invoke("mychat-attention:dismiss"),
  setHover: (hovered: boolean) => ipcRenderer.invoke("mychat-attention:hover", hovered),
  onUpdate: (listener: (payload: {
    title: string;
    content: string;
    count: number;
    avatar?: string;
    conversationId?: string;
    messageScope?: "private" | "group" | "system";
  }) => void) => {
    const wrapped = (
      _event: unknown,
      payload: {
        title: string;
        content: string;
        count: number;
        avatar?: string;
        conversationId?: string;
        messageScope?: "private" | "group" | "system";
      },
    ) => {
      listener(payload);
    };
    ipcRenderer.on("mychat:attention-preview", wrapped);
    return () => ipcRenderer.removeListener("mychat:attention-preview", wrapped);
  },
});
