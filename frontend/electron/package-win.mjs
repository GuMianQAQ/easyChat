import { mkdir, rm, access, writeFile, readdir, stat, copyFile } from "node:fs/promises";
import path from "node:path";
import { constants as fsConstants } from "node:fs";
import { spawn, execSync } from "node:child_process";

const SKIP_BASENAMES = new Set(["default_app.asar"]);

async function cpFiltered(src, dest) {
  const entries = await readdir(src, { withFileTypes: true });
  await mkdir(dest, { recursive: true });
  for (const entry of entries) {
    if (SKIP_BASENAMES.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await cpFiltered(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

async function forceRmDir(dir) {
  // Use cmd to forcefully delete any locked files first
  try {
    execSync(`cmd /c "del /f /s /q "${dir}" >nul 2>&1"`, { stdio: "ignore" });
  } catch {}
  try {
    execSync(`cmd /c "rmdir /s /q "${dir}" >nul 2>&1"`, { stdio: "ignore" });
  } catch {}
  // Final cleanup with Node.js in case cmd left something
  try {
    await rm(dir, { recursive: true, force: true });
  } catch {}
}

const projectRoot = path.resolve(process.cwd());
const releaseDir = path.join(projectRoot, "release");
const runtimeDir = path.join(releaseDir, "win-unpacked");
const sourceRuntimeDir = path.join(projectRoot, "node_modules", "electron", "dist");
const resourcesDir = path.join(runtimeDir, "resources");
const appDir = path.join(resourcesDir, "app");
const appAssetsDir = path.join(appDir, "assets");
const packagedExe = path.join(runtimeDir, "MyChat.exe");
const packagedPackageJson = {
  name: "mychat",
  version: "1.0.0",
  main: "dist-electron/main.cjs",
  productName: "MyChat",
  description: "MyChat desktop client",
};
const mainIconSource = path.join(projectRoot, "electron", "assets", "mychat-desktop-anime.ico");
const smallIconSource = path.join(projectRoot, "electron", "assets", "mychat-small-normal.ico");
const fallbackSmallIconSource = path.join(projectRoot, "electron", "assets", "tray.ico");
const iconAssetsSource = path.join(projectRoot, "electron", "assets");
const rceditPath = path.join(projectRoot, "node_modules", "electron-winstaller", "vendor", "rcedit.exe");

async function ensureExists(targetPath, description) {
  try {
    await access(targetPath, fsConstants.F_OK);
  } catch {
    throw new Error(`${description} not found: ${targetPath}`);
  }
}

async function main() {
  await ensureExists(sourceRuntimeDir, "Electron runtime source");
  await ensureExists(path.join(projectRoot, "dist"), "frontend dist");
  await ensureExists(path.join(projectRoot, "dist-electron", "main.cjs"), "Electron main bundle");
  await ensureExists(path.join(projectRoot, "dist-electron", "preload.cjs"), "Electron preload bundle");
  await ensureExists(rceditPath, "rcedit");
  await ensureExists(mainIconSource, "Windows app icon");
  try {
    await ensureExists(smallIconSource, "Tray/window icon");
  } catch {
    await ensureExists(fallbackSmallIconSource, "Tray/window fallback icon");
  }

  await forceRmDir(runtimeDir);
  await mkdir(runtimeDir, { recursive: true });
  await cpFiltered(sourceRuntimeDir, runtimeDir);

  await mkdir(appDir, { recursive: true });
  await forceRmDir(appDir);
  await mkdir(appDir, { recursive: true });
  await mkdir(appAssetsDir, { recursive: true });

  await cpFiltered(path.join(projectRoot, "dist"), appDir);
  await cpFiltered(path.join(projectRoot, "dist-electron"), path.join(appDir, "dist-electron"));
  await cpFiltered(iconAssetsSource, appAssetsDir);
  await rm(path.join(appDir, "package.json"), { force: true });
  await writeFile(
    path.join(appDir, "package.json"),
    `${JSON.stringify(packagedPackageJson, null, 2)}\n`,
  );

  await copyFile(path.join(runtimeDir, "electron.exe"), packagedExe);

  await new Promise((resolve, reject) => {
    const child = spawn(rceditPath, [packagedExe, "--set-icon", mainIconSource], {
      cwd: projectRoot,
      stdio: "inherit",
      windowsHide: true,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }
      reject(new Error(`rcedit exited with code ${code}`));
    });
    child.on("error", reject);
  });

  console.log(`Packaged portable app at ${packagedExe}`);
}

await main();
