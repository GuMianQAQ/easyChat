import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, screen } from "electron";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const DEV_SERVER_URL = process.env.ELECTRON_RENDERER_URL || "http://127.0.0.1:5173";
const API_BASE_URL = (process.env.VITE_API_BASE_URL || "http://127.0.0.1:8080").replace(/\/+$/, "");
const SMALL_ICON_NAME = "mychat-small-normal.ico";
const SMALL_ICON_FALLBACK = "tray.ico";
const PREVIEW_ICON_NAME = "mychat-small-normal-256.png";
const PREVIEW_ICON_FALLBACK = "mychat-small-normal.png";
const EMPTY_TRAY_ICON_NAME = "tray-empty.png";
const DEFAULT_WINDOW_TITLE = "MyChat";
const ATTENTION_WINDOW_TITLE = "MyChat - 有新消息";
const DEFAULT_TRAY_TOOLTIP = "MyChat";
const TRAY_BLINK_INTERVAL_MS = 500;
const PREVIEW_HIDE_DELAY_MS = 300;
const PREVIEW_WIDTH = 280;
const PREVIEW_HEIGHT = 104;

type AttentionPreviewScope = "private" | "group" | "system";

type AttentionPreviewPayload = {
  title?: string;
  content?: string;
  count?: number;
  avatar?: string;
  conversationId?: string;
  messageScope?: AttentionPreviewScope;
};

type AttentionOpenConversationPayload = {
  conversationId: string;
  activeDock: "chat";
};

let mainWindow: BrowserWindow | null = null;
let notificationWindow: BrowserWindow | null = null;
let momentsWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let hasAttention = false;
let trayIconPath = "";
let trayEmptyIconPath = "";
let trayBlinkTimer: NodeJS.Timeout | null = null;
let trayBlinkVisible = true;
let hidePreviewTimer: NodeJS.Timeout | null = null;
let trayHovering = false;
let previewHovering = false;
let attentionPreviewDismissed = false;
let latestAttentionTitle = "";
let latestAttentionContent = "";
let latestAttentionCount = 0;
let latestAttentionAvatar = "";
let latestAttentionConversationId = "";
let latestAttentionScope: AttentionPreviewScope = "system";
const attentionConversationIds = new Set<string>();

const MOMENTS_WINDOW_WIDTH = 500;
const MOMENTS_WINDOW_HEIGHT = 720;

function resolveAssetPath(fileName: string, fallbackName?: string) {
  const candidates = app.isPackaged
    ? [
        path.join(process.resourcesPath, "assets", fileName),
        path.join(process.resourcesPath, "app", "assets", fileName),
        path.join(app.getAppPath(), "assets", fileName),
      ]
    : [
        path.join(app.getAppPath(), "electron", "assets", fileName),
        path.join(__dirname, "..", "electron", "assets", fileName),
      ];

  if (fallbackName) {
    if (app.isPackaged) {
      candidates.push(
        path.join(process.resourcesPath, "assets", fallbackName),
        path.join(process.resourcesPath, "app", "assets", fallbackName),
        path.join(app.getAppPath(), "assets", fallbackName),
      );
    } else {
      candidates.push(
        path.join(app.getAppPath(), "electron", "assets", fallbackName),
        path.join(__dirname, "..", "electron", "assets", fallbackName),
      );
    }
  }

  const resolved = candidates.find((candidate) => existsSync(candidate));
  if (!resolved) {
    console.error("asset not found", candidates);
    return "";
  }
  return resolved;
}

function assetPathToDataUrl(assetPath: string, mimeType = "image/png") {
  if (!assetPath || !existsSync(assetPath)) {
    return "";
  }

  try {
    const image = nativeImage.createFromPath(assetPath);
    const png = image.resize({ width: 42, height: 42 }).toPNG();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    try {
      return `data:${mimeType};base64,${readFileSync(assetPath).toString("base64")}`;
    } catch {
      return "";
    }
  }
}

function resolveFallbackAvatarDataUrl() {
  const fallbackPath =
    resolveAssetPath(PREVIEW_ICON_NAME, PREVIEW_ICON_FALLBACK) ||
    resolveAssetPath("mychat-small-normal.png") ||
    resolveAssetPath(SMALL_ICON_NAME, SMALL_ICON_FALLBACK);
  return fallbackPath ? assetPathToDataUrl(fallbackPath) : "";
}

function resolveAttentionAvatarUrl(value: string | undefined) {
  const trimmed = value?.trim() || "";
  if (!trimmed) {
    return resolveFallbackAvatarDataUrl();
  }
  if (trimmed.startsWith("data:image/")) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (existsSync(trimmed)) {
    const ext = path.extname(trimmed).toLowerCase();
    const mimeType = ext === ".ico" ? "image/x-icon" : "image/png";
    return assetPathToDataUrl(trimmed, mimeType) || resolveFallbackAvatarDataUrl();
  }

  try {
    const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return new URL(normalizedPath, `${API_BASE_URL}/`).toString();
  } catch {
    return resolveFallbackAvatarDataUrl();
  }
}

function emitWindowState(window?: BrowserWindow | null) {
  const target = window ?? mainWindow;
  if (!target || target.isDestroyed()) {
    return;
  }

  target.webContents.send("mychat:window-state", {
    isMaximized: target.isMaximized(),
    isAlwaysOnTop: target.isAlwaysOnTop(),
  });
}

function bindWindowStateEvents(window: BrowserWindow) {
  const emit = () => emitWindowState(window);
  window.on("maximize", emit);
  window.on("unmaximize", emit);
  window.on("restore", emit);
  window.on("enter-full-screen", emit);
  window.on("leave-full-screen", emit);
  window.on("always-on-top-changed", emit);
}

function getSenderWindow(event: Electron.IpcMainInvokeEvent) {
  return BrowserWindow.fromWebContents(event.sender);
}

function emitAttentionOpenConversation(conversationId: string) {
  const normalizedConversationId = conversationId.trim();
  if (!normalizedConversationId || !mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const payload: AttentionOpenConversationPayload = {
    conversationId: normalizedConversationId,
    activeDock: "chat",
  };

  mainWindow.webContents.send("mychat:attention-open-conversation", payload);
}

function clearHidePreviewTimer() {
  if (!hidePreviewTimer) {
    return;
  }
  clearTimeout(hidePreviewTimer);
  hidePreviewTimer = null;
}

function hideAttentionPreview() {
  clearHidePreviewTimer();
  previewHovering = false;
  notificationWindow?.hide();
}

function scheduleHideAttentionPreview() {
  clearHidePreviewTimer();
  hidePreviewTimer = setTimeout(() => {
    if (trayHovering || previewHovering) {
      return;
    }
    hideAttentionPreview();
  }, PREVIEW_HIDE_DELAY_MS);
}

function sendAttentionPreviewUpdate() {
  if (!notificationWindow || notificationWindow.isDestroyed()) {
    return;
  }

  notificationWindow.webContents.send("mychat:attention-preview", {
    title: latestAttentionTitle || "MyChat",
    content: latestAttentionContent || "收到一条新消息",
    count: latestAttentionCount > 0 ? latestAttentionCount : 1,
    avatar: resolveAttentionAvatarUrl(latestAttentionAvatar),
    conversationId: latestAttentionConversationId,
    messageScope: latestAttentionScope,
  });
}

function buildAttentionPreviewHtml(defaultAvatarUrl: string) {
  const safeDefaultAvatarUrl = defaultAvatarUrl.replace(/"/g, "&quot;");
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MyChat Attention Preview</title>
    <style>
      :root {
        color-scheme: light;
        font-family:
          "Microsoft YaHei UI",
          "Microsoft YaHei",
          "Segoe UI",
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          sans-serif;
      }
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: transparent;
      }
      body {
        box-sizing: border-box;
        padding: 10px;
      }
      .card {
        position: relative;
        display: grid;
        grid-template-columns: 42px 1fr;
        gap: 12px;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        padding: 14px 14px 12px;
        border-radius: 12px;
        border: 1px solid rgba(31, 35, 41, 0.08);
        background: #ffffff;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
        cursor: default;
      }
      .avatar {
        width: 42px;
        height: 42px;
        border-radius: 10px;
        object-fit: cover;
        background: #eef1f5;
        display: block;
      }
      .content {
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .headline {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        min-width: 0;
      }
      .title {
        flex: 1;
        min-width: 0;
        color: #1f2329;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.35;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .badge {
        flex: none;
        min-width: 20px;
        height: 20px;
        padding: 0 6px;
        border-radius: 999px;
        background: #ff4d4f;
        color: #ffffff;
        font-size: 11px;
        line-height: 20px;
        text-align: center;
        font-weight: 600;
        box-sizing: border-box;
      }
      .message {
        margin-top: 7px;
        color: #646a73;
        font-size: 12px;
        font-weight: 400;
        line-height: 1.45;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .dismiss {
        margin-top: auto;
        margin-left: auto;
        border: 0;
        background: transparent;
        color: #4e6ef2;
        font-size: 12px;
        font-weight: 400;
        line-height: 1;
        padding: 0;
        cursor: pointer;
      }
      .dismiss:hover {
        color: #3558e6;
      }
    </style>
  </head>
  <body>
    <div class="card" id="card">
      <img class="avatar" id="avatar" src="${safeDefaultAvatarUrl}" alt="avatar" />
      <div class="content">
        <div class="headline">
          <div class="title" id="title">MyChat</div>
          <div class="badge" id="badge">1</div>
        </div>
        <div class="message" id="message">收到一条新消息</div>
        <button class="dismiss" id="dismiss">暂不处理</button>
      </div>
    </div>
    <script>
      const defaultAvatarUrl = ${JSON.stringify(safeDefaultAvatarUrl)};
      const titleEl = document.getElementById("title");
      const messageEl = document.getElementById("message");
      const badgeEl = document.getElementById("badge");
      const avatarEl = document.getElementById("avatar");
      const cardEl = document.getElementById("card");
      const dismissEl = document.getElementById("dismiss");

      avatarEl.addEventListener("error", () => {
        avatarEl.src = defaultAvatarUrl;
      });

      const off = window.myChatAttentionPreview?.onUpdate((payload) => {
        titleEl.textContent = payload.title || "MyChat";
        messageEl.textContent = payload.content || "收到一条新消息";
        badgeEl.textContent = payload.count > 99 ? "99+" : String(payload.count || 1);
        badgeEl.style.display = payload.count > 0 ? "block" : "none";
        avatarEl.src = payload.avatar || defaultAvatarUrl;
      });

      const notifyHover = (hovered) => {
        window.myChatAttentionPreview?.setHover(hovered);
      };

      cardEl.addEventListener("mouseenter", () => notifyHover(true));
      cardEl.addEventListener("mouseleave", () => notifyHover(false));
      cardEl.addEventListener("click", () => {
        window.myChatAttentionPreview?.open();
      });
      dismissEl.addEventListener("click", (event) => {
        event.stopPropagation();
        window.myChatAttentionPreview?.dismiss();
      });

      window.addEventListener("beforeunload", () => {
        if (typeof off === "function") {
          off();
        }
      });
    </script>
  </body>
</html>`;
}

function createNotificationWindow() {
  if (notificationWindow && !notificationWindow.isDestroyed()) {
    return notificationWindow;
  }

  const preloadPath = path.join(__dirname, "preload.cjs");
  const defaultAvatarUrl = resolveFallbackAvatarDataUrl();
  const html = buildAttentionPreviewHtml(defaultAvatarUrl);

  notificationWindow = new BrowserWindow({
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    show: false,
    focusable: false,
    autoHideMenuBar: true,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  notificationWindow.on("closed", () => {
    notificationWindow = null;
  });
  notificationWindow.webContents.on("did-finish-load", () => {
    sendAttentionPreviewUpdate();
  });
  notificationWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`).catch((error) => {
    console.error("failed to load attention preview", error);
  });

  return notificationWindow;
}

function positionNotificationWindow() {
  const window = createNotificationWindow();
  if (!window) {
    return;
  }

  const trayBounds = tray?.getBounds();
  let x = 0;
  let y = 0;

  if (trayBounds && trayBounds.width > 0 && trayBounds.height > 0) {
    const anchorPoint = {
      x: Math.round(trayBounds.x + trayBounds.width / 2),
      y: Math.round(trayBounds.y + trayBounds.height / 2),
    };
    const display = screen.getDisplayNearestPoint(anchorPoint);
    const area = display.workArea;

    x = anchorPoint.x - Math.round(PREVIEW_WIDTH / 2);
    y = trayBounds.y - PREVIEW_HEIGHT - 12;
    if (y < area.y + 8) {
      y = trayBounds.y + trayBounds.height + 12;
    }

    x = Math.min(Math.max(x, area.x + 8), area.x + area.width - PREVIEW_WIDTH - 8);
    y = Math.min(Math.max(y, area.y + 8), area.y + area.height - PREVIEW_HEIGHT - 8);
  } else {
    const cursor = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursor);
    const area = display.workArea;
    x = area.x + area.width - PREVIEW_WIDTH - 16;
    y = area.y + area.height - PREVIEW_HEIGHT - 16;
  }

  window.setBounds({ x, y, width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }, false);
}

function showAttentionPreview() {
  if (!hasAttention || attentionPreviewDismissed) {
    return;
  }

  clearHidePreviewTimer();
  const window = createNotificationWindow();
  if (!window) {
    return;
  }

  positionNotificationWindow();
  sendAttentionPreviewUpdate();
  window.showInactive();
}

function stopTrayBlinking() {
  if (trayBlinkTimer) {
    clearInterval(trayBlinkTimer);
    trayBlinkTimer = null;
  }

  trayBlinkVisible = true;
  if (tray && trayIconPath) {
    tray.setImage(trayIconPath);
  }
  tray?.setToolTip(DEFAULT_TRAY_TOOLTIP);
}

function startTrayBlinking() {
  if (!tray || !trayIconPath) {
    console.error("[tray] cannot blink: normal tray icon missing");
    return;
  }
  if (!trayEmptyIconPath) {
    console.error("[tray] cannot blink: empty tray icon missing");
    return;
  }
  if (trayBlinkTimer) {
    return;
  }

  trayBlinkVisible = true;
  tray.setImage(trayIconPath);
  tray.setToolTip(DEFAULT_TRAY_TOOLTIP);
  trayBlinkTimer = setInterval(() => {
    if (!tray) {
      stopTrayBlinking();
      return;
    }

    trayBlinkVisible = !trayBlinkVisible;
    tray.setImage(trayBlinkVisible ? trayIconPath : trayEmptyIconPath);
    tray.setToolTip(DEFAULT_TRAY_TOOLTIP);
  }, TRAY_BLINK_INTERVAL_MS);
}

function applyAttentionState(next: boolean) {
  hasAttention = next;
  if (!next) {
    attentionConversationIds.clear();
    attentionPreviewDismissed = false;
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.flashFrame(next);
    mainWindow.setTitle(next ? ATTENTION_WINDOW_TITLE : DEFAULT_WINDOW_TITLE);
  }

  tray?.setToolTip(DEFAULT_TRAY_TOOLTIP);
  if (next) {
    startTrayBlinking();
    if (trayHovering || previewHovering) {
      showAttentionPreview();
    }
    return;
  }

  stopTrayBlinking();
  hideAttentionPreview();
}

function showMainWindow() {
  const window = mainWindow ?? createWindow();
  if (!window) {
    return null;
  }

  if (window.isMinimized()) {
    window.restore();
  }
  if (!window.isVisible()) {
    window.show();
  }
  window.focus();
  emitWindowState();
  return window;
}

function createWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    mainWindow.focus();
    emitWindowState();
    return mainWindow;
  }

  const preloadPath = path.join(__dirname, "preload.cjs");
  const windowIconPath = resolveAssetPath(SMALL_ICON_NAME, SMALL_ICON_FALLBACK);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: DEFAULT_WINDOW_TITLE,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: "#f1f2f4",
    icon: windowIconPath || undefined,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  Menu.setApplicationMenu(null);

  mainWindow.on("close", (event) => {
    if (isQuitting) {
      return;
    }
    event.preventDefault();
    mainWindow?.hide();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.on("focus", () => {
    hideAttentionPreview();
  });
  bindWindowStateEvents(mainWindow);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    applyAttentionState(hasAttention);
    emitWindowState();
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(app.getAppPath(), "index.html")).catch((error) => {
      console.error("failed to load packaged renderer", error);
    });
    return mainWindow;
  }

  mainWindow.loadURL(DEV_SERVER_URL).catch((error) => {
    console.error("failed to load dev renderer", error);
  });
  return mainWindow;
}

function showMomentsWindow() {
  if (momentsWindow && !momentsWindow.isDestroyed()) {
    if (momentsWindow.isMinimized()) {
      momentsWindow.restore();
    }
    momentsWindow.focus();
    return;
  }

  const preloadPath = path.join(__dirname, "preload.cjs");

  momentsWindow = new BrowserWindow({
    width: MOMENTS_WINDOW_WIDTH,
    height: MOMENTS_WINDOW_HEIGHT,
    minWidth: MOMENTS_WINDOW_WIDTH,
    maxWidth: MOMENTS_WINDOW_WIDTH,
    minHeight: 500,
    show: false,
    frame: false,
    title: "朋友圈",
    autoHideMenuBar: true,
    backgroundColor: "#f5f5f7",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  Menu.setApplicationMenu(null);

  momentsWindow.on("closed", () => {
    momentsWindow = null;
  });
  momentsWindow.on("will-resize", (event, bounds) => {
    if (bounds.width !== MOMENTS_WINDOW_WIDTH) {
      event.preventDefault();
      momentsWindow?.setBounds({
        x: bounds.x,
        y: bounds.y,
        width: MOMENTS_WINDOW_WIDTH,
        height: bounds.height,
      });
    }
  });
  bindWindowStateEvents(momentsWindow);
  momentsWindow.once("ready-to-show", () => {
    momentsWindow?.show();
    emitWindowState(momentsWindow);
  });

  if (app.isPackaged) {
    momentsWindow
      .loadFile(path.join(app.getAppPath(), "index.html"), { query: { window: "moments" } })
      .catch((error) => {
        console.error("failed to load moments window", error);
      });
  } else {
    momentsWindow
      .loadURL(`${DEV_SERVER_URL}?window=moments`)
      .catch((error) => {
        console.error("failed to load moments window", error);
      });
  }
}

function createTray() {
  if (tray) {
    return tray;
  }

  const iconPath = resolveAssetPath(SMALL_ICON_NAME, SMALL_ICON_FALLBACK);
  if (!iconPath) {
    return null;
  }

  trayIconPath = iconPath;
  trayEmptyIconPath = resolveAssetPath(EMPTY_TRAY_ICON_NAME);
  tray = new Tray(iconPath);
  tray.setToolTip(DEFAULT_TRAY_TOOLTIP);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "打开 MyChat",
        click: () => {
          showMainWindow();
        },
      },
      {
        label: "退出",
        click: () => {
          isQuitting = true;
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.destroy();
          }
          app.quit();
        },
      },
    ]),
  );

  tray.on("double-click", () => {
    showMainWindow();
  });
  tray.on("mouse-enter", () => {
    trayHovering = true;
    if (hasAttention) {
      showAttentionPreview();
    }
  });
  tray.on("mouse-leave", () => {
    trayHovering = false;
    scheduleHideAttentionPreview();
  });
  tray.on("mouse-move", () => {
    trayHovering = true;
    if (hasAttention) {
      showAttentionPreview();
    }
  });

  applyAttentionState(hasAttention);
  return tray;
}

ipcMain.handle("mychat-window:minimize", (event) => {
  getSenderWindow(event)?.minimize();
});

ipcMain.handle("mychat-window:toggle-maximize", (event) => {
  const target = getSenderWindow(event);
  if (!target) {
    return { isMaximized: false };
  }
  if (target.isMaximized()) {
    target.unmaximize();
  } else {
    target.maximize();
  }
  emitWindowState(target);
  return { isMaximized: target.isMaximized() };
});

ipcMain.handle("mychat-window:close", (event) => {
  getSenderWindow(event)?.close();
});

ipcMain.handle("mychat-window:toggle-always-on-top", (event) => {
  const target = getSenderWindow(event);
  if (!target) {
    return { isAlwaysOnTop: false };
  }
  const next = !target.isAlwaysOnTop();
  target.setAlwaysOnTop(next);
  emitWindowState(target);
  return { isAlwaysOnTop: next };
});

ipcMain.handle("mychat-window:get-state", (event) => {
  const target = getSenderWindow(event);
  return {
    isMaximized: target?.isMaximized() ?? false,
    isAlwaysOnTop: target?.isAlwaysOnTop() ?? false,
  };
});

ipcMain.handle("mychat-window:get-visibility-state", (event) => {
  const target = getSenderWindow(event);
  return {
    isVisible: target?.isVisible() ?? false,
    isFocused: target?.isFocused() ?? false,
    isMinimized: target?.isMinimized() ?? false,
  };
});

ipcMain.handle("mychat-window:update-attention-preview", (_event, payload: AttentionPreviewPayload) => {
  latestAttentionTitle = (payload.title || "").trim();
  latestAttentionContent = (payload.content || "").trim();
  latestAttentionCount = Math.max(0, Number(payload.count) || 0);
  latestAttentionAvatar = (payload.avatar || "").trim();
  latestAttentionConversationId = (payload.conversationId || "").trim();
  latestAttentionScope = payload.messageScope || "system";
  if (latestAttentionConversationId) {
    attentionConversationIds.add(latestAttentionConversationId);
  }
  attentionPreviewDismissed = false;
  sendAttentionPreviewUpdate();
  if (hasAttention && (trayHovering || previewHovering)) {
    showAttentionPreview();
  }
});

ipcMain.handle("mychat-window:start-attention", (_event, conversationId?: string) => {
  const normalizedConversationId = (conversationId || "").trim();
  if (normalizedConversationId) {
    attentionConversationIds.add(normalizedConversationId);
  }
  applyAttentionState(true);
});

ipcMain.handle("mychat-window:stop-attention", () => {
  applyAttentionState(false);
});

ipcMain.handle("mychat-window:clear-attention-conversation", (_event, conversationId?: string) => {
  const normalizedConversationId = (conversationId || "").trim();
  if (normalizedConversationId) {
    attentionConversationIds.delete(normalizedConversationId);
  }
  if (attentionConversationIds.size === 0) {
    applyAttentionState(false);
  }
  return { remaining: attentionConversationIds.size };
});

ipcMain.handle("mychat-moments:open", () => {
  showMomentsWindow();
});

ipcMain.handle("mychat-attention:open", () => {
  showMainWindow();
  emitAttentionOpenConversation(latestAttentionConversationId);
  if (latestAttentionConversationId) {
    attentionConversationIds.delete(latestAttentionConversationId);
  }
  if (attentionConversationIds.size === 0) {
    applyAttentionState(false);
  }
  hideAttentionPreview();
  return { remaining: attentionConversationIds.size };
});

ipcMain.handle("mychat-attention:dismiss", () => {
  attentionPreviewDismissed = true;
  hideAttentionPreview();
});

ipcMain.handle("mychat-attention:hover", (_event, hovered: boolean) => {
  previewHovering = Boolean(hovered);
  if (previewHovering) {
    clearHidePreviewTimer();
    return;
  }
  scheduleHideAttentionPreview();
});

app.setAppUserModelId("com.mychat.desktop");

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    showMainWindow();
  });

  app.whenReady().then(() => {
    createWindow();
    createTray();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      return;
    }
    showMainWindow();
  });
}

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("will-quit", () => {
  clearHidePreviewTimer();
  stopTrayBlinking();
  notificationWindow?.destroy();
  notificationWindow = null;
  momentsWindow?.destroy();
  momentsWindow = null;
  tray?.destroy();
  tray = null;
});
