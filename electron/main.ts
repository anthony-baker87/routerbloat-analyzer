import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detectRouter } from "./diagnostics/gateway.js";
import { runGamingRouteTest } from "./diagnostics/routeTest.js";
import { runNetworkTest } from "./diagnostics/testRunner.js";
import type { TestProgress } from "./diagnostics/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: "#080b10",
    title: "RouterBloat Analyzer",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    void mainWindow.loadURL(devUrl);
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("router:detect", () => detectRouter());
ipcMain.handle("network:test", (event, options?: { mock?: boolean; routerBrand?: string }) =>
  runNetworkTest(options, (progress: TestProgress) => {
    event.sender.send("network:progress", progress);
  })
);
ipcMain.handle("route:test", (_event, gameTarget: string) => runGamingRouteTest(gameTarget));
