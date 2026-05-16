import { contextBridge, ipcRenderer } from "electron";
import type { GamingRouteResult, NetworkTestResult, RouterInfo, TestProgress } from "./diagnostics/types.js";

contextBridge.exposeInMainWorld("routerBloat", {
  detectRouter: (): Promise<RouterInfo> => ipcRenderer.invoke("router:detect"),
  runNetworkTest: (options?: { mock?: boolean; routerBrand?: string }): Promise<NetworkTestResult> =>
    ipcRenderer.invoke("network:test", options),
  runGamingRouteTest: (gameTarget: string): Promise<GamingRouteResult> => ipcRenderer.invoke("route:test", gameTarget),
  onProgress: (callback: (progress: TestProgress) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: TestProgress) => callback(progress);
    ipcRenderer.on("network:progress", listener);
    return () => ipcRenderer.removeListener("network:progress", listener);
  }
});
