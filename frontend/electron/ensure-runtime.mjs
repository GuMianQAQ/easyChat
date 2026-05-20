import { cp, mkdir, access, writeFile, rm, readFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const projectRoot = path.resolve(process.cwd());
const electronPackageDir = path.join(projectRoot, "node_modules", "electron");
const runtimeDir = path.join(electronPackageDir, "dist");
const runtimeExe = path.join(runtimeDir, "electron.exe");
const pathFile = path.join(electronPackageDir, "path.txt");
const releaseRuntimeDir = path.join(projectRoot, "release", "win-unpacked");
const electronCacheDir = path.join(projectRoot, ".electron-cache");
const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || "", "AppData", "Local");
const cachedZip = path.join(localAppData, "electron", "Cache");

async function exists(targetPath) {
  try {
    await access(targetPath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function copyReleaseRuntime() {
  await rm(runtimeDir, { recursive: true, force: true });
  await mkdir(path.dirname(runtimeDir), { recursive: true });
  await cp(releaseRuntimeDir, runtimeDir, { recursive: true });
  await writeFile(pathFile, "electron.exe", "utf8");
}

async function extractCachedZip() {
  const packageJson = JSON.parse(await readFile(path.join(electronPackageDir, "package.json"), "utf8"));
  const zipPath = path.join(cachedZip, `electron-v${packageJson.version}-win32-x64.zip`);
  if (!(await exists(zipPath))) {
    return false;
  }

  await rm(runtimeDir, { recursive: true, force: true });
  await mkdir(runtimeDir, { recursive: true });

  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${runtimeDir}' -Force`,
    ],
    { stdio: "inherit" },
  );

  if (result.status !== 0) {
    throw new Error("Electron runtime restore from cache failed.");
  }

  if (!(await exists(pathFile))) {
    await writeFile(pathFile, "electron.exe", "utf8");
  }

  return true;
}

async function downloadRuntime() {
  const result = spawnSync(
    process.execPath,
    [path.join(electronPackageDir, "install.js")],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        electron_config_cache: electronCacheDir,
      },
    },
  );

  if (result.status !== 0) {
    throw new Error("Electron runtime download failed.");
  }
}

async function main() {
  if (await exists(runtimeExe) && (await exists(pathFile))) {
    return;
  }

  if (await extractCachedZip()) {
    return;
  }

  if (await exists(path.join(releaseRuntimeDir, "electron.exe"))) {
    await copyReleaseRuntime();
    return;
  }

  await downloadRuntime();
}

await main();
