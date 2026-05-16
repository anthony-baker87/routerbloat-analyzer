import { detectRouter } from "./gateway.js";
import { pingTarget } from "./ping.js";
import type { GamingRouteResult, PingSummary, RouteComparisonTarget } from "./types.js";

const HOST_PATTERN = /^(?=.{1,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
const IPV4_PATTERN = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

function validateGameTarget(target: string): string {
  const normalized = target.trim();
  if (!normalized) throw new Error("Enter a game server IP or hostname.");
  if (normalized.startsWith("-")) throw new Error("Target cannot start with a command option.");
  if (!IPV4_PATTERN.test(normalized) && !HOST_PATTERN.test(normalized)) {
    throw new Error("Enter a valid IPv4 address or hostname.");
  }
  return normalized;
}

function ms(value: number | null): number {
  return value ?? Number.POSITIVE_INFINITY;
}

function loss(value: PingSummary): number {
  return value.packetLossPercent;
}

function compareRoute(targets: RouteComparisonTarget[]): Pick<GamingRouteResult, "summary" | "likelyScope" | "details"> {
  const router = targets.find((target) => target.label === "Router")?.ping;
  const cloudflare = targets.find((target) => target.label === "Cloudflare DNS")?.ping;
  const google = targets.find((target) => target.label === "Google DNS")?.ping;
  const game = targets.find((target) => target.label === "Game server")?.ping;

  if (!router || !cloudflare || !google || !game) {
    return {
      likelyScope: "Inconclusive",
      summary: "The route test did not collect enough data.",
      details: ["Try again, or verify the game server target responds to ping."]
    };
  }

  const publicAverage = [cloudflare.averageMs, google.averageMs]
    .filter((value): value is number => typeof value === "number")
    .reduce((sum, value, _index, values) => sum + value / values.length, 0);
  const publicLoss = Math.max(loss(cloudflare), loss(google));
  const details: string[] = [];

  // Local loss or router latency is the strongest sign that traffic is struggling before it reaches the ISP.
  if (loss(router) > 0 || ms(router.averageMs) > 15 || ms(router.maxMs) > 40) {
    details.push("The router result is worse than expected for a local gateway.");
    details.push("This likely points to Wi-Fi, Ethernet, router CPU load, or local network congestion.");
    return {
      likelyScope: "Local",
      summary: "Likely local network issue.",
      details
    };
  }

  if (publicLoss > 0 || ms(cloudflare.averageMs) > ms(router.averageMs) + 80 || ms(google.averageMs) > ms(router.averageMs) + 80) {
    details.push("Public DNS targets show loss or elevated latency while the router is stable.");
    details.push("This likely points to ISP congestion, modem/WAN issues, or a broader upstream route problem.");
    return {
      likelyScope: "ISP",
      summary: "Likely ISP or WAN-side issue.",
      details
    };
  }

  if (loss(game) > publicLoss || ms(game.averageMs) > publicAverage + 50 || ms(game.maxMs) > publicAverage + 100) {
    details.push("Cloudflare and Google look healthier than the game target.");
    details.push("This likely points to a game-server route, peering, or regional server issue.");
    return {
      likelyScope: "Game Route",
      summary: "Likely specific to the game route.",
      details
    };
  }

  details.push("Router, public DNS, and game target results are broadly similar.");
  details.push("No clear route-specific fault appeared in this short ping test.");
  return {
    likelyScope: "Inconclusive",
    summary: "No obvious local, ISP, or game-route fault pattern.",
    details
  };
}

export async function runGamingRouteTest(gameTarget: string): Promise<GamingRouteResult> {
  const target = validateGameTarget(gameTarget);
  const router = await detectRouter();
  const gatewayIp = router.gatewayIp ?? "192.168.1.1";
  const comparisons: RouteComparisonTarget[] = [
    { label: "Router", target: gatewayIp, ping: await pingTarget(gatewayIp, 10) },
    { label: "Cloudflare DNS", target: "1.1.1.1", ping: await pingTarget("1.1.1.1", 10) },
    { label: "Google DNS", target: "8.8.8.8", ping: await pingTarget("8.8.8.8", 10) },
    { label: "Game server", target, ping: await pingTarget(target, 10) }
  ];
  const diagnosis = compareRoute(comparisons);

  return {
    testedAt: new Date().toISOString(),
    gameTarget: target,
    router,
    comparisons,
    ...diagnosis
  };
}
