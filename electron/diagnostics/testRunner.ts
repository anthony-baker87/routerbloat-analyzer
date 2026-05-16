import { detectRouter } from "./gateway.js";
import { pingTarget } from "./ping.js";
import { runLoadTest } from "./loadTest.js";
import { runSpeedTest } from "./speedTest.js";
import { diagnose } from "./diagnosis.js";
import { getRecommendations } from "./recommendations.js";
import type { BufferbloatGrade, LoadProfileResult, NetworkTestResult, StatusLevel, TestMetrics, TestProgress } from "./types.js";

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
    `Download speed: ${m.speedTest.download.speedMbps.toFixed(1)} Mbps`,
    `Upload speed: ${m.speedTest.upload.speedMbps.toFixed(1)} Mbps`,
    `Loaded download ping: ${m.loadedDownloadPingMs?.toFixed(1) ?? "n/a"} ms`,
    `Loaded upload ping: ${m.loadedUploadPingMs?.toFixed(1) ?? "n/a"} ms`,
    `Jitter: ${m.jitterMs?.toFixed(1) ?? "n/a"} ms`,
    `Packet loss: ${m.packetLossPercent.toFixed(1)}%`,
    `Latency increase under load: ${m.latencyIncreaseMs?.toFixed(1) ?? "n/a"} ms`,
    `Bufferbloat grade: ${m.grade}`,
    `Status: ${m.status}`,
    "",
    "Load profiles",
    ...m.profiles.flatMap((profile) => [
      `${profile.name} (${profile.description}): grade ${profile.grade}, increase ${profile.latencyIncreaseMs?.toFixed(1) ?? "n/a"} ms`,
      `  Download: ${profile.download.speedMbps.toFixed(1)} Mbps, loaded ping ${profile.loadedDownloadPingMs?.toFixed(1) ?? "n/a"} ms`,
      `  Upload: ${profile.upload.speedMbps.toFixed(1)} Mbps, loaded ping ${profile.loadedUploadPingMs?.toFixed(1) ?? "n/a"} ms`
    ]),
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

const LOAD_PROFILES = [
  {
    name: "Light",
    description: "Browsing / small background traffic",
    streamCount: 1,
    durationMs: 7000
  },
  {
    name: "Medium",
    description: "Gaming with household background traffic",
    streamCount: 3,
    durationMs: 9000
  },
  {
    name: "Heavy",
    description: "Large downloads, uploads, or HD+ streaming",
    streamCount: 6,
    durationMs: 12000
  }
] as const;

function scoreProfile(profile: Omit<LoadProfileResult, "latencyIncreaseMs" | "grade" | "status">, idleInternetAverageMs: number | null): LoadProfileResult {
  const loadedAverages = [profile.loadedDownloadPingMs, profile.loadedUploadPingMs].filter((value): value is number => typeof value === "number");
  const loadedWorst = loadedAverages.length ? Math.max(...loadedAverages) : null;
  const latencyIncreaseMs = loadedWorst !== null && idleInternetAverageMs !== null ? loadedWorst - idleInternetAverageMs : null;
  const grade = gradeFromIncrease(latencyIncreaseMs);
  return {
    ...profile,
    latencyIncreaseMs,
    grade,
    status: statusFromGrade(grade)
  };
}

export async function runNetworkTest(
  options: { routerBrand?: string } = {},
  onProgress: ProgressCallback = () => {}
): Promise<NetworkTestResult> {
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

  onProgress({ step: "Measuring download and upload speed", percent: 30 });
  const speedTest = await runSpeedTest();

  const idleInternetAverageMs = average([idleCloudflare.averageMs, idleGoogle.averageMs]);
  const profiles: LoadProfileResult[] = [];

  for (const [index, profile] of LOAD_PROFILES.entries()) {
    const basePercent = 35 + index * 17;
    onProgress({ step: `${profile.name} load: download`, percent: basePercent });
    const download = await runLoadTest("download", "1.1.1.1", {
      durationMs: profile.durationMs,
      streamCount: profile.streamCount
    });

    onProgress({ step: `${profile.name} load: upload`, percent: basePercent + 8 });
    const upload = await runLoadTest("upload", "1.1.1.1", {
      durationMs: profile.durationMs,
      streamCount: profile.streamCount
    });

    profiles.push(
      scoreProfile(
        {
          ...profile,
          download,
          upload,
          loadedDownloadPingMs: download.ping.averageMs,
          loadedUploadPingMs: upload.ping.averageMs
        },
        idleInternetAverageMs
      )
    );
  }

  onProgress({ step: "Scoring and diagnosing", percent: 88 });
  const heavyProfile = profiles[profiles.length - 1];
  const download = heavyProfile.download;
  const upload = heavyProfile.upload;
  const loadedDownloadPingMs = download.ping.averageMs;
  const loadedUploadPingMs = upload.ping.averageMs;
  const latencyIncreaseMs = heavyProfile.latencyIncreaseMs;
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
    speedTest,
    profiles,
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
      connectionType: router.connectionType,
      profiles: metrics.profiles,
      downloadSpeedMbps: metrics.speedTest.download.speedMbps,
      uploadSpeedMbps: metrics.speedTest.upload.speedMbps,
      loadedDownloadPingMs: metrics.loadedDownloadPingMs,
      loadedUploadPingMs: metrics.loadedUploadPingMs,
      idleInternetAverageMs: metrics.idleInternetAverageMs,
      packetLossPercent: metrics.packetLossPercent
    })
  };

  onProgress({ step: "Complete", percent: 100 });
  return { ...base, report: reportFor(base) };
}
