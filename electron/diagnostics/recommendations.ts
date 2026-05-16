import type { LoadProfileResult, StatusLevel } from "./types.js";

const DATABASE: Record<string, string[]> = {
  OpenWrt: [
    "OpenWrt: enable SQM QoS on the WAN interface.",
    "OpenWrt: use CAKE with diffserv4 if available.",
    "OpenWrt: start with bandwidth limits around 90-95% of measured speed, then lower the upload limit first if upload latency remains high."
  ],
  ASUS: [
    "ASUS: enable Adaptive QoS or Traditional QoS.",
    "ASUS: manually set real upload/download bandwidth instead of leaving auto bandwidth detection on.",
    "ASUS: place the gaming PC/console in the highest priority category."
  ],
  "TP-Link": [
    "TP-Link: enable QoS or Game Accelerator if your model supports it.",
    "TP-Link: set real upload/download bandwidth manually.",
    "TP-Link: prioritize the gaming device when the firmware supports device priority."
  ],
  Netgear: [
    "Netgear: enable Dynamic QoS.",
    "Netgear: prioritize the gaming device.",
    "Netgear: manually cap upload if latency spikes mostly during upload."
  ],
  Eero: [
    "Eero: enable Optimize for Conferencing and Gaming.",
    "Eero: if latency still rises under upload, reduce heavy cloud backup or upload traffic while gaming."
  ],
  Generic: [
    "Enable SQM/QoS if your router supports it.",
    "Set upload/download bandwidth manually instead of relying on automatic detection.",
    "If your ISP gateway has weak QoS controls, consider bridge mode or passthrough with a router that supports SQM/CAKE."
  ]
};

interface RecommendationContext {
  status?: StatusLevel;
  connectionType?: "ethernet" | "wifi" | "virtual" | "unknown";
  profiles?: LoadProfileResult[];
  downloadSpeedMbps?: number;
  uploadSpeedMbps?: number;
  loadedDownloadPingMs?: number | null;
  loadedUploadPingMs?: number | null;
  idleInternetAverageMs?: number | null;
  packetLossPercent?: number;
}

function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}

export function getRecommendations(brand: string | null, extras: string[] = [], context: RecommendationContext = {}): string[] {
  const key = brand && DATABASE[brand] ? brand : "Generic";
  const profiles = context.profiles ?? [];
  const light = profiles.find((profile) => profile.name === "Light");
  const medium = profiles.find((profile) => profile.name === "Medium");
  const heavy = profiles.find((profile) => profile.name === "Heavy");
  const uploadIncrease =
    context.loadedUploadPingMs !== null && context.loadedUploadPingMs !== undefined && context.idleInternetAverageMs !== null && context.idleInternetAverageMs !== undefined
      ? context.loadedUploadPingMs - context.idleInternetAverageMs
      : null;
  const downloadIncrease =
    context.loadedDownloadPingMs !== null && context.loadedDownloadPingMs !== undefined && context.idleInternetAverageMs !== null && context.idleInternetAverageMs !== undefined
      ? context.loadedDownloadPingMs - context.idleInternetAverageMs
      : null;
  const uploadDominant = uploadIncrease !== null && downloadIncrease !== null && uploadIncrease > downloadIncrease + 20;
  const onlyHeavyIsBad = light?.grade === "A" && medium && ["A", "B"].includes(medium.grade) && heavy && ["C", "D", "F"].includes(heavy.grade);
  const connectionAdvice =
    context.connectionType === "wifi"
      ? ["Because this test is on Wi-Fi, repeat once over Ethernet before changing router QoS settings."]
      : context.connectionType === "ethernet"
        ? ["You are already on Ethernet, so Wi-Fi is unlikely to explain this result."]
        : [];

  if (context.status === "Excellent") {
    return dedupe([
      "No router changes are needed based on this test.",
      "Your loaded latency and packet loss look healthy for gaming.",
      ...connectionAdvice,
      "If a specific game still feels bad, run the Gaming Route Test against that server."
    ]);
  }

  if (context.status === "Good") {
    return dedupe([
      "No urgent router changes are needed.",
      "Your connection looks playable, but background uploads/downloads may still be worth watching during matches.",
      ...extras,
      ...connectionAdvice,
      "If latency gets worse at peak hours, run another test when the problem is happening."
    ]);
  }

  const targeted: string[] = [];

  if (uploadDominant) {
    targeted.push("Primary issue: upload-side queueing. Start by limiting upload bandwidth before changing download settings.");
    if (context.uploadSpeedMbps) {
      targeted.push(`Try an upload QoS/SQM cap around ${(context.uploadSpeedMbps * 0.9).toFixed(0)} Mbps, then retest Medium and Heavy profiles.`);
      targeted.push(`If Heavy is still C/D/F, lower upload in small steps: ${(context.uploadSpeedMbps * 0.85).toFixed(0)} Mbps, then ${(context.uploadSpeedMbps * 0.8).toFixed(0)} Mbps.`);
    }
    targeted.push("Pause or schedule cloud backup, game capture uploads, seeders, and large file sync while playing latency-sensitive games.");
  } else if (downloadIncrease !== null && downloadIncrease > 30) {
    targeted.push("Primary issue: download-side queueing. Set a download QoS/SQM cap slightly below measured download speed.");
    if (context.downloadSpeedMbps) {
      targeted.push(`Try a download QoS/SQM cap around ${(context.downloadSpeedMbps * 0.9).toFixed(0)} Mbps, then retest.`);
    }
  }

  if (onlyHeavyIsBad) {
    targeted.push("Light/Medium look acceptable, so gaming should be fine unless another device is saturating the connection.");
    targeted.push("Focus on controlling large uploads/downloads from other devices rather than changing every router setting.");
  } else if (medium && ["C", "D", "F"].includes(medium.grade)) {
    targeted.push("Medium load is already degraded, so household background traffic can affect games. Prioritize the gaming device and enable QoS/SQM.");
  }

  if ((context.packetLossPercent ?? 0) > 0) {
    targeted.push("Packet loss was observed. If it repeats, check cabling/router logs and run the Gaming Route Test to see whether loss starts beyond the gateway.");
  }

  const validation = [
    "After each QoS/SQM change, rerun the Network Test and compare Light, Medium, and Heavy grades.",
    "Use the Gaming Route Test for a specific game server if bufferbloat looks controlled but one game still feels bad."
  ];

  return dedupe([...targeted, ...DATABASE[key], ...extras, ...connectionAdvice, ...DATABASE.Generic, ...validation]);
}
