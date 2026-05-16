import type { Diagnosis, TestMetrics } from "./types.js";

function valueOrZero(value: number | null): number {
  return value ?? 0;
}

export function diagnose(metrics: TestMetrics): { diagnosis: Diagnosis; recommendationHints: string[] } {
  const details: string[] = [];
  const likelyCauses: string[] = [];
  const recommendationHints: string[] = [];

  const gatewayIdle = valueOrZero(metrics.idleGateway.averageMs);
  const gatewayMax = valueOrZero(metrics.idleGateway.maxMs);
  const internetIdle = valueOrZero(metrics.idleInternetAverageMs);
  const downloadLoaded = valueOrZero(metrics.loadedDownloadPingMs);
  const uploadLoaded = valueOrZero(metrics.loadedUploadPingMs);

  // The diagnostic compares local gateway behavior with public resolver behavior.
  // If the gateway also degrades, the issue is likely before traffic reaches the ISP.
  if (gatewayMax - gatewayIdle > 30 || metrics.idleGateway.packetLossPercent > 0) {
    details.push("Gateway latency or loss changed during basic testing.");
    likelyCauses.push("Likely router, Wi-Fi, Ethernet, or local network issue.");
    recommendationHints.push("If possible, test from the gaming device over Ethernet.");
  }

  if (gatewayMax - gatewayIdle <= 30 && metrics.latencyIncreaseMs !== null && metrics.latencyIncreaseMs > 50) {
    details.push("Gateway looks comparatively stable while internet latency rises under load.");
    likelyCauses.push("Likely ISP, modem, router WAN queue, or upstream bufferbloat issue.");
    recommendationHints.push("Enable SQM/QoS and cap bandwidth slightly below the measured maximum.");
  }

  if (uploadLoaded - downloadLoaded > 40) {
    details.push("Upload-loaded ping is much worse than download-loaded ping.");
    likelyCauses.push("Likely upload-side queue saturation.");
    recommendationHints.push("Prioritize upload SQM/QoS and set the upload limit first.");
  }

  if (metrics.idleGateway.packetLossPercent > 0) {
    details.push("Packet loss appears at the gateway.");
    likelyCauses.push("Likely local link, Wi-Fi interference, cable, or router issue.");
  } else if (metrics.packetLossPercent > 0) {
    details.push("Packet loss appears beyond the gateway.");
    likelyCauses.push("Likely ISP route congestion or upstream packet loss.");
    recommendationHints.push("Run tracert to the affected game server and share results with the ISP.");
  }

  if (metrics.latencyIncreaseMs !== null && metrics.latencyIncreaseMs < 20 && metrics.packetLossPercent === 0) {
    details.push("Loaded latency stayed close to idle latency.");
    likelyCauses.push("No major bufferbloat signal found in this short test.");
  }

  const summary =
    metrics.status === "Excellent"
      ? "Excellent: loaded latency stayed low."
      : metrics.status === "Good"
        ? "Good: some loaded latency increase, but it is likely manageable."
        : metrics.status === "Bad"
          ? "Bad: likely bufferbloat or congestion under load."
          : "Severe: loaded latency increase is high and likely to affect games or voice chat.";

  return {
    diagnosis: {
      summary,
      details: details.length ? details : ["Short test completed without a specific fault pattern."],
      likelyCauses: [...new Set(likelyCauses)]
    },
    recommendationHints: [...new Set(recommendationHints)]
  };
}
