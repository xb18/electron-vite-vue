import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import { logger } from './logger'
import { join } from "path";
import { spawn, ChildProcess } from "child_process";
import { createHash } from "crypto";
import { platform } from "os";

let fastApiProcess: ChildProcess | null = null;

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = process.env.NODE_ENV === "development";

logger.info("main process starting up", {
  platform: process.platform,
  arch: process.arch,
  electronVersion: process.versions.electron,
  nodeVersion: process.versions.node,
});

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'Main window',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
  // win.webContents.on('will-navigate', (event, url) => { }) #344
}

app.whenReady().then(() => {
  startFastApi();
  createWindow();
})

app.on('window-all-closed', () => {
  win = null
  stopFastApi();
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})

// 启动FastAPI后端
function startFastApi() {
  logger.info("Starting FastAPI backend...");

  // 生成启动token
  function generateStartupToken(): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const hash = createHash("sha256")
      .update(`fastapi_startup_${timestamp}`)
      .digest("hex")
      .substring(0, 16);
    return `${timestamp}_${hash}`;
  }

  // 生成启动token
  const startupToken = generateStartupToken();
  logger.info("Generated startup token for backend verification");

  // 设置环境变量
  const env = {
    ...process.env,
    FASTAPI_STARTUP_TOKEN: startupToken,
  };

  if (isDev) {
    // 开发模式：使用 Python 脚本启动
    const backendDir = join(__dirname, "..", "..", "backend");
    const pythonScript = join(backendDir, "app", "main.py");

    logger.info("Development mode: Starting Python script");
    logger.info("Backend directory:", backendDir);
    logger.info("Python script:", pythonScript);

    try {
      // 使用 Python 直接运行 main.py，传递环境变量
      fastApiProcess = spawn("uv", ["run", "app/main.py"], {
        cwd: backendDir,
        stdio: ["ignore", "pipe", "pipe"],
        env: env,
      });
    } catch (error) {
      logger.error("Failed to start FastAPI in development mode:", error);
    }
  } else {
    // 生产模式：使用打包的 exe 文件
    const backendExecutable = join(
      process.resourcesPath,
      "resources",
      "fastapi-backend.exe"
    );

    logger.info("Production mode: Starting packaged executable");
    logger.info("Executable:", backendExecutable);

    try {
      fastApiProcess = spawn(backendExecutable, [], {
        stdio: ["ignore", "pipe", "pipe"],
        env: env,
      });
    } catch (error) {
      logger.error("Failed to start FastAPI in production mode:", error);
    }
  }

  // 处理FastAPI进程的输出
  if (fastApiProcess?.stdout)
    fastApiProcess.stdout.on("data", (data) => {
      logger.info(`FastAPI output: ${data}`);
    });

  if (fastApiProcess?.stderr)
    fastApiProcess.stderr.on("data", (data) => {
      logger.error(`FastAPI error: ${data}`);
    });

  fastApiProcess?.on("close", (code) => {
    logger.info(`FastAPI process exited with code ${code}`);
    fastApiProcess = null;
  });
}

function stopFastApi() {
  return new Promise((resolve, reject) => {
    if (fastApiProcess) {
      const curplatform = platform();
      logger.info("关闭FastAPI进程...", curplatform);
      if (curplatform === "win32") {
        // Windows上使用taskkill强制终止进程
        // 确保进程ID存在后再执行taskkill
        if (fastApiProcess.pid) {
          const pidstr = fastApiProcess.pid.toString();
          logger.info("taskkillProcess PID:", pidstr);
          let taskkillProcess = spawn("taskkill", ["/pid", pidstr, "/f", "/t"]);
          if (taskkillProcess?.stdout)
            taskkillProcess.stdout.on("data", (data) => {
              logger.info(`taskkillProcess output: ${data}`);
            });

          if (taskkillProcess?.stderr)
            taskkillProcess.stderr.on("data", (data) => {
              logger.error(`taskkillProcess error: ${data}`);
            });

          taskkillProcess?.on("close", (code) => {
            logger.info(`taskkillProcess process exited with code ${code}`);
            taskkillProcess = null;
            if (code === 0) {
              resolve(true); // taskkill成功时resolve为true
            } else {
              reject(new Error(`taskkill process exited with code ${code}`)); // taskkill失败时reject
            }
          });
        } else {
          logger.error("无法获取FastAPI进程ID");
          reject(new Error("无法获取FastAPI进程ID")); // 无法获取PID时reject
        }
      } else {
        // 其他平台使用kill信号
        try {
          fastApiProcess.kill("SIGTERM");
          resolve(true); // 正确resolve Promise
        } catch (error) {
          logger.error("终止FastAPI进程时出错:", error);
          reject(error); // 出错时reject
        }
      }
    } else {
      logger.info("没有运行的FastAPI进程需要停止");
      resolve(false); // 没有进程运行时resolve为false，这可以被视为一种"成功"的无操作
    }
  });
}