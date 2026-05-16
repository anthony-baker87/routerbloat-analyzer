/// <reference types="vite/client" />

import type { GamingRouteResult, NetworkTestResult, RouterInfo, TestProgress } from "./types";

declare global {
  interface Window {
    routerBloat?: {
      detectRouter: () => Promise<RouterInfo>;
      runNetworkTest: (options?: { routerBrand?: string }) => Promise<NetworkTestResult>;
      runGamingRouteTest: (gameTarget: string) => Promise<GamingRouteResult>;
      onProgress: (callback: (progress: TestProgress) => void) => () => void;
    };
  }
}
