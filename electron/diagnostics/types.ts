export type BufferbloatGrade = "A" | "B" | "C" | "D" | "F";
export type StatusLevel = "Excellent" | "Good" | "Bad" | "Severe";

export interface RouterInfo {
  gatewayIp: string | null;
  hostname: string | null;
  macAddress: string | null;
  macVendor: string | null;
  upnpName: string | null;
  connectionType: "ethernet" | "wifi" | "virtual" | "unknown";
  adapterName: string | null;
  detectedBrand: string | null;
  confidence: "high" | "medium" | "low" | "manual" | "unknown";
  detectionNotes: string[];
}

export interface PingSummary {
  target: string;
  sent: number;
  received: number;
  packetLossPercent: number;
  averageMs: number | null;
  minMs: number | null;
  maxMs: number | null;
  jitterMs: number | null;
  samples: number[];
}

export interface LoadResult {
  phase: "download" | "upload";
  bytesTransferred: number;
  durationMs: number;
  speedMbps: number;
  streamCount: number;
  ping: PingSummary;
  errors: string[];
}

export interface SpeedPhaseResult {
  phase: "download" | "upload";
  bytesTransferred: number;
  durationMs: number;
  speedMbps: number;
  streamCount: number;
  errors: string[];
}

export interface SpeedTestResult {
  download: SpeedPhaseResult;
  upload: SpeedPhaseResult;
}

export type LoadProfileName = "Light" | "Medium" | "Heavy";

export interface LoadProfileResult {
  name: LoadProfileName;
  description: string;
  streamCount: number;
  durationMs: number;
  download: LoadResult;
  upload: LoadResult;
  loadedDownloadPingMs: number | null;
  loadedUploadPingMs: number | null;
  latencyIncreaseMs: number | null;
  grade: BufferbloatGrade;
  status: StatusLevel;
}

export interface TestMetrics {
  idleGateway: PingSummary;
  idleCloudflare: PingSummary;
  idleGoogle: PingSummary;
  download: LoadResult;
  upload: LoadResult;
  speedTest: SpeedTestResult;
  profiles: LoadProfileResult[];
  idleInternetAverageMs: number | null;
  loadedDownloadPingMs: number | null;
  loadedUploadPingMs: number | null;
  jitterMs: number | null;
  packetLossPercent: number;
  latencyIncreaseMs: number | null;
  grade: BufferbloatGrade;
  status: StatusLevel;
}

export interface Diagnosis {
  summary: string;
  details: string[];
  likelyCauses: string[];
}

export interface NetworkTestResult {
  testedAt: string;
  router: RouterInfo;
  metrics: TestMetrics;
  diagnosis: Diagnosis;
  recommendations: string[];
  report: string;
}

export interface RouteComparisonTarget {
  label: string;
  target: string;
  ping: PingSummary;
}

export interface GamingRouteResult {
  testedAt: string;
  gameTarget: string;
  router: RouterInfo;
  comparisons: RouteComparisonTarget[];
  summary: string;
  likelyScope: "Local" | "ISP" | "Game Route" | "Inconclusive";
  details: string[];
}

export interface TestProgress {
  step: string;
  percent: number;
}
