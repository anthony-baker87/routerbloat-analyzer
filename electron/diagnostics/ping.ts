import { runCommand } from "./commands.js";
import type { PingSummary } from "./types.js";

function summarize(target: string, sent: number, samples: number[]): PingSummary {
  const received = samples.length;
  const averageMs = received ? samples.reduce((sum, value) => sum + value, 0) / received : null;
  const minMs = received ? Math.min(...samples) : null;
  const maxMs = received ? Math.max(...samples) : null;
  const jitterMs =
    received > 1
      ? samples.slice(1).reduce((sum, sample, index) => sum + Math.abs(sample - samples[index]), 0) / (received - 1)
      : null;

  return {
    target,
    sent,
    received,
    packetLossPercent: sent ? ((sent - received) / sent) * 100 : 100,
    averageMs,
    minMs,
    maxMs,
    jitterMs,
    samples
  };
}

export async function pingTarget(target: string, count = 8, timeoutMs = 12000): Promise<PingSummary> {
  const safeCount = Math.max(1, Math.min(count, 30));
  try {
    const output = await runCommand("ping", ["-n", String(safeCount), "-w", "1000", target], timeoutMs);
    const samples = [...output.matchAll(/time[=<]?\s*(\d+)ms/gi)].map((match) => Number(match[1]));
    return summarize(target, safeCount, samples);
  } catch {
    return summarize(target, safeCount, []);
  }
}
