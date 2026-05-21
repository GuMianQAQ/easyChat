import { cp, mkdir, rm, access, writeFile } from "node:fs/promises";
import path from "node:path";
import { constants as fsConstants } from "node:fs";
import { spawn } from "node:child_process";

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

  await rm(runtimeDir, { recursive: true, force: true });
  await mkdir(runtimeDir, { recursive: true });
  await cp(sourceRuntimeDir, runtimeDir, { recursive: true });

  await mkdir(appDir, { recursive: true });
  await rm(appDir, { recursive: true, force: true });
  await mkdir(appDir, { recursive: true });
  await mkdir(appAssetsDir, { recursive: true });

  await cp(path.join(projectRoot, "dist"), appDir, { recursive: true });
  await cp(path.join(projectRoot, "dist-electron"), path.join(appDir, "dist-electron"), {
    recursive: true,
  });
  await cp(iconAssetsSource, appAssetsDir, { recursive: true });
  await rm(path.join(appDir, "package.json"), { force: true });
  await writeFile(
    path.join(appDir, "package.json"),
    `${JSON.stringify(packagedPackageJson, null, 2)}\n`,
  );

  await cp(path.join(runtimeDir, "electron.exe"), packagedExe);

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
