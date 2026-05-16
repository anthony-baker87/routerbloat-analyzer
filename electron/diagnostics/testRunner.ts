import { detectRouter } from "./gateway.js";
import { pingTarget } from "./ping.js";
import { runLoadTest } from "./loadTest.js";
import { diagnose } from "./diagnosis.js";
import { getRecommendations } from "./recommendations.js";
import type { BufferbloatGrade, NetworkTestResult, RouterInfo, StatusLevel, TestMetrics, TestProgress } from "./types.js";

type ProgressCallback = (progress: TestProgress) => void;

function average(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => typeof value === "number");
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function gradeFromIncrease(increase: number | null): BufferbloatGrade {
  if (increase === null) return "F";
  if (increase < 20) return "A";
  if (increase <= 50) return "B";
  if (increase <= 100) return "C";
  if (increase <= 200) return "D";
  return "F";
}

function statusFromGrade(grade: BufferbloatGrade): StatusLevel {
  if (grade === "A") return "Excellent";
  if (grade === "B") return "Good";
  if (grade === "C" || grade === "D") return "Bad";
  return "Severe";
}

function reportFor(result: Omit<NetworkTestResult, "report">): string {
  const m = result.metrics;
  return [
    "RouterBloat Analyzer Report",
    `Tested: ${new Date(result.testedAt).toLocaleString()}`,
    `Gateway: ${result.router.gatewayIp ?? "Unknown"}`,
    `Router: ${result.router.detectedBrand ?? "Unknown"} (${result.router.confidence})`,
    `Connection: ${result.router.connectionType}${result.router.adapterName ? ` via ${result.router.adapterName}` : ""}`,
    "",
    "Results",
    `Idle gateway ping: ${m.idleGateway.averageMs?.toFixed(1) ?? "n/a"} ms`,
    `Idle internet ping: ${m.idleInternetAverageMs?.toFixed(1) ?? "n/a"} ms`,
    `Loaded download ping: ${m.loadedDownloadPingMs?.toFixed(1) ?? "n/a"} ms`,
    `Loaded upload ping: ${m.loadedUploadPingMs?.toFixed(1) ?? "n/a"} ms`,
    `Jitter: ${m.jitterMs?.toFixed(1) ?? "n/a"} ms`,
    `Packet loss: ${m.packetLossPercent.toFixed(1)}%`,
    `Latency increase under load: ${m.latencyIncreaseMs?.toFixed(1) ?? "n/a"} ms`,
    `Bufferbloat grade: ${m.grade}`,
    `Status: ${m.status}`,
    "",
    "Diagnosis",
    result.diagnosis.summary,
    ...result.diagnosis.details.map((detail) => `- ${detail}`),
    ...result.diagnosis.likelyCauses.map((cause) => `- ${cause}`),
    "",
    "Recommended fixes",
    ...result.recommendations.map((item) => `- ${item}`)
  ].join("\n");
}

export async function runNetworkTest(
  options: { mock?: boolean; routerBrand?: string } = {},
  onProgress: ProgressCallback = () => {}
): Promise<NetworkTestResult> {
  if (options.mock) return runMockTest(options.routerBrand, onProgress);

  onProgress({ step: "Detecting router", percent: 8 });
  const router = await detectRouter();
  if (options.routerBrand) {
    router.detectedBrand = options.routerBrand;
    router.confidence = "manual";
  }

  const gateway = router.gatewayIp ?? "192.168.1.1";
  onProgress({ step: "Measuring idle latency", percent: 22 });
  const [idleGateway, idleCloudflare, idleGoogle] = await Promise.all([
    pingTarget(gateway, 8),
    pingTarget("1.1.1.1", 8),
    pingTarget("8.8.8.8", 8)
  ]);

  onProgress({ step: "Running download load test", percent: 45 });
  const download = await runLoadTest("download", "1.1.1.1");

  onProgress({ step: "Running upload load test", percent: 70 });
  const upload = await runLoadTest("upload", "1.1.1.1");

  onProgress({ step: "Scoring and diagnosing", percent: 88 });
  const idleInternetAverageMs = average([idleCloudflare.averageMs, idleGoogle.averageMs]);
  const loadedDownloadPingMs = download.ping.averageMs;
  const loadedUploadPingMs = upload.ping.averageMs;
  const loadedWorst = average([loadedDownloadPingMs, loadedUploadPingMs]);
  const latencyIncreaseMs = loadedWorst !== null && idleInternetAverageMs !== null ? loadedWorst - idleInternetAverageMs : null;
  const packetLossPercent = Math.max(
    idleGateway.packetLossPercent,
    idleCloudflare.packetLossPercent,
    idleGoogle.packetLossPercent,
    download.ping.packetLossPercent,
    upload.ping.packetLossPercent
  );
  const jitterMs = average([idleCloudflare.jitterMs, idleGoogle.jitterMs, download.ping.jitterMs, upload.ping.jitterMs]);
  const grade = gradeFromIncrease(latencyIncreaseMs);

  const metrics: TestMetrics = {
    idleGateway,
    idleCloudflare,
    idleGoogle,
    download,
    upload,
    idleInternetAverageMs,
    loadedDownloadPingMs,
    loadedUploadPingMs,
    jitterMs,
    packetLossPercent,
    latencyIncreaseMs,
    grade,
    status: statusFromGrade(grade)
  };
  const { diagnosis, recommendationHints } = diagnose(metrics);
  const base = {
    testedAt: new Date().toISOString(),
    router,
    metrics,
    diagnosis,
    recommendations: getRecommendations(router.detectedBrand, recommendationHints, {
      status: metrics.status,
      connectionType: router.connectionType
    }),
    mock: false
  };

  onProgress({ step: "Complete", percent: 100 });
  return { ...base, report: reportFor(base) };
}

async function runMockTest(routerBrand: string | undefined, onProgress: ProgressCallback): Promise<NetworkTestResult> {
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  for (const progress of [
    { step: "Mock: detecting router", percent: 15 },
    { step: "Mock: idle latency", percent: 35 },
    { step: "Mock: download load", percent: 60 },
    { step: "Mock: upload load", percent: 82 }
  ]) {
    onProgress(progress);
    await wait(250);
  }

  const makePing = (target: string, samples: number[]) => ({
    target,
    sent: samples.length,
    received: samples.length,
    packetLossPercent: 0,
    averageMs: average(samples),
    minMs: Math.min(...samples),
    maxMs: Math.max(...samples),
    jitterMs: average(samples.slice(1).map((sample, index) => Math.abs(sample - samples[index]))),
    samples
  });
  const router: RouterInfo = {
    gatewayIp: "192.168.1.1",
    hostname: "router.asus.local",
    macAddress: "50:46:5D:12:34:56",
    macVendor: "ASUS",
    upnpName: "ASUS Gaming Router",
    connectionType: "ethernet",
    adapterName: "Ethernet",
    detectedBrand: routerBrand || "ASUS",
    confidence: routerBrand ? "manual" : "medium",
    detectionNotes: ["Mock router profile loaded."]
  };
  const downloadPing = makePing("1.1.1.1", [23, 44, 52, 66, 49, 58, 61, 55]);
  const uploadPing = makePing("1.1.1.1", [24, 82, 118, 145, 132, 126, 138, 121]);
  const metrics: TestMetrics = {
    idleGateway: makePing("192.168.1.1", [2, 2, 3, 2, 4, 3, 2, 3]),
    idleCloudflare: makePing("1.1.1.1", [20, 21, 20, 22, 21, 20, 23, 21]),
    idleGoogle: makePing("8.8.8.8", [22, 22, 23, 21, 22, 24, 22, 23]),
    download: { phase: "download", bytesTransferred: 18_000_000, durationMs: 8000, speedMbps: 18, ping: downloadPing, errors: [] },
    upload: { phase: "upload", bytesTransferred: 5_000_000, durationMs: 8000, speedMbps: 5, ping: uploadPing, errors: [] },
    idleInternetAverageMs: 21.625,
    loadedDownloadPingMs: downloadPing.averageMs,
    loadedUploadPingMs: uploadPing.averageMs,
    jitterMs: 17.8,
    packetLossPercent: 0,
    latencyIncreaseMs: 67,
    grade: "C",
    status: "Bad"
  };
  const { diagnosis, recommendationHints } = diagnose(metrics);
  const base = {
    testedAt: new Date().toISOString(),
    router,
    metrics,
    diagnosis,
    recommendations: getRecommendations(router.detectedBrand, recommendationHints, {
      status: metrics.status,
      connectionType: router.connectionType
    }),
    mock: true
  };
  onProgress({ step: "Complete", percent: 100 });
  return { ...base, report: reportFor(base) };
}
