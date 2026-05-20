import { app, BrowserWindow, Menu, Tray } from "electron";
import { existsSync } from "node:fs";
import path from "node:path";

const DEV_SERVER_URL = process.env.ELECTRON_RENDERER_URL || "http://127.0.0.1:5173";
const TRAY_ICON_NAME = "tray.ico";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function resolveTrayIconPath() {
  const candidates = app.isPackaged
    ? [
        path.join(process.resourcesPath, "app", "assets", TRAY_ICON_NAME),
        path.join(app.getAppPath(), "assets", TRAY_ICON_NAME),
      ]
    : [
        path.join(app.getAppPath(), "electron", "assets", TRAY_ICON_NAME),
        path.join(__dirname, "..", "electron", "assets", TRAY_ICON_NAME),
      ];

  const iconPath = candidates.find((candidate) => existsSync(candidate));
  if (!iconPath) {
    console.error("tray icon not found", candidates);
    return "";
  }

  return iconPath;
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
    return mainWindow;
  }

  const preloadPath = path.join(__dirname, "preload.cjs");
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "MyChat",
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#f5f7fa",
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

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
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

  const iconPath = resolveTrayIconPath();
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
