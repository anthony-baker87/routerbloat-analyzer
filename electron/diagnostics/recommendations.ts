const DATABASE: Record<string, string[]> = {
  OpenWrt: [
    "Enable SQM QoS.",
    "Use CAKE if it is available for your device.",
    "Set download and upload bandwidth to 85-95% of measured speed."
  ],
  ASUS: [
    "Enable Adaptive QoS.",
    "Manually set upload and download bandwidth limits.",
    "Prioritize the gaming device."
  ],
  "TP-Link": [
    "Enable QoS.",
    "Set real upload and download bandwidth manually.",
    "Prioritize the gaming device when the firmware supports it."
  ],
  Netgear: [
    "Enable Dynamic QoS.",
    "Prioritize the gaming device.",
    "Manually cap upload if latency spikes mostly during upload."
  ],
  Eero: ["Enable Optimize for Conferencing and Gaming."],
  Generic: [
    "Test again over Ethernet.",
    "Avoid an ISP combo router if bufferbloat remains severe.",
    "Enable SQM or QoS if available.",
    "Limit upload and download slightly below maximum speed."
  ]
};

interface RecommendationContext {
  status?: "Excellent" | "Good" | "Bad" | "Severe";
  connectionType?: "ethernet" | "wifi" | "virtual" | "unknown";
}

function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}

export function getRecommendations(brand: string | null, extras: string[] = [], context: RecommendationContext = {}): string[] {
  const key = brand && DATABASE[brand] ? brand : "Generic";
  const connectionAdvice =
    context.connectionType === "wifi"
      ? ["Test once over Ethernet to separate Wi-Fi issues from router or ISP issues."]
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
      ...extras,
      ...connectionAdvice,
      "If latency gets worse at peak hours, run another test when the problem is happening."
    ]);
  }

  const generic = DATABASE.Generic.filter((item) => {
    if (context.connectionType === "ethernet" && item === "Test again over Ethernet.") return false;
    return !extras.includes(item);
  });

  return dedupe([...DATABASE[key], ...extras, ...connectionAdvice, ...generic]);
}
