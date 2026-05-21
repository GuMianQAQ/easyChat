import { app, BrowserWindow, ipcMain, Menu, Tray } from "electron";
import { existsSync } from "node:fs";
import path from "node:path";

const DEV_SERVER_URL = process.env.ELECTRON_RENDERER_URL || "http://127.0.0.1:5173";
const SMALL_ICON_NAME = "mychat-small-normal.ico";
const SMALL_ICON_FALLBACK = "tray.ico";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

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

  const iconPath = candidates.find((candidate) => existsSync(candidate));
  if (!iconPath) {
    console.error("asset icon not found", candidates);
    return "";
  }

  return iconPath;
}

function emitWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send("mychat:window-state", {
    isMaximized: mainWindow.isMaximized(),
    isAlwaysOnTop: mainWindow.isAlwaysOnTop(),
  });
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
    title: "MyChat",
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

  mainWindow.on("maximize", emitWindowState);
  mainWindow.on("unmaximize", emitWindowState);
  mainWindow.on("restore", emitWindowState);
  mainWindow.on("enter-full-screen", emitWindowState);
  mainWindow.on("leave-full-screen", emitWindowState);
  mainWindow.on("always-on-top-changed", emitWindowState);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
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

function createTray() {
  if (tray) {
    return tray;
  }

  const iconPath = resolveAssetPath(SMALL_ICON_NAME, SMALL_ICON_FALLBACK);
  if (!iconPath) {
    return null;
  }

  tray = new Tray(iconPath);
  tray.setToolTip("MyChat");
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

  return tray;
}

ipcMain.handle("mychat-window:minimize", () => {
  mainWindow?.minimize();
});

ipcMain.handle("mychat-window:toggle-maximize", () => {
  if (!mainWindow) {
    return { isMaximized: false };
  }

  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }

  emitWindowState();
  return { isMaximized: mainWindow.isMaximized() };
});

ipcMain.handle("mychat-window:close", () => {
  mainWindow?.close();
});

ipcMain.handle("mychat-window:toggle-always-on-top", () => {
  if (!mainWindow) {
    return { isAlwaysOnTop: false };
  }

  const next = !mainWindow.isAlwaysOnTop();
  mainWindow.setAlwaysOnTop(next);
  emitWindowState();
  return { isAlwaysOnTop: next };
});

ipcMain.handle("mychat-window:get-state", () => ({
  isMaximized: mainWindow?.isMaximized() ?? false,
  isAlwaysOnTop: mainWindow?.isAlwaysOnTop() ?? false,
}));

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
  tray?.destroy();
  tray = null;
});
