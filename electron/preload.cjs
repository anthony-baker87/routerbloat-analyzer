const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("routerBloat", {
  detectRouter: () => ipcRenderer.invoke("router:detect"),
  runNetworkTest: (options) => ipcRenderer.invoke("network:test", options),
  runGamingRouteTest: (gameTarget) => ipcRenderer.invoke("route:test", gameTarget),
  onProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on("network:progress", listener);
    return () => ipcRenderer.removeListener("network:progress", listener);
  }
});
