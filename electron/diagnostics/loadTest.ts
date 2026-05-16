import { pingTarget } from "./ping.js";
import { mbps, resilientDownloadStream, runParallelTraffic, uploadStream } from "./traffic.js";
import type { LoadResult } from "./types.js";

export async function runLoadTest(
  phase: "download" | "upload",
  pingTargetHost: string,
  options: { durationMs?: number; streamCount?: number } = {}
): Promise<LoadResult> {
  const durationMs = options.durationMs ?? 15000;
  const streamCount = options.streamCount ?? 6;
  const started = Date.now();
  const loadPromise = runParallelTraffic(durationMs, streamCount, phase === "download" ? resilientDownloadStream : uploadStream);
  const pingPromise = pingTarget(pingTargetHost, Math.max(8, Math.ceil(durationMs / 1000) + 2), durationMs + 8000);
  const [load, ping] = await Promise.all([loadPromise, pingPromise]);
  const elapsed = Date.now() - started;

  return {
    phase,
    bytesTransferred: load.bytes,
    durationMs: elapsed,
    speedMbps: mbps(load.bytes, elapsed),
    streamCount,
    ping,
    errors: load.errors
  };
}
