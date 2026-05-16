import { mbps, resilientDownloadStream, runParallelTraffic, uploadStream } from "./traffic.js";
import type { SpeedTestResult } from "./types.js";

type SpeedtestNet = (options: { acceptLicense: boolean; acceptGdpr: boolean }) => Promise<{
  download?: { bandwidth?: number; bytes?: number; elapsed?: number };
  upload?: { bandwidth?: number; bytes?: number; elapsed?: number };
}>;

async function measureSpeed(phase: "download" | "upload", durationMs: number, streamCount: number) {
  const started = Date.now();
  const traffic = await runParallelTraffic(durationMs, streamCount, phase === "download" ? resilientDownloadStream : uploadStream);
  const elapsed = Date.now() - started;

  return {
    phase,
    bytesTransferred: traffic.bytes,
    durationMs: elapsed,
    speedMbps: mbps(traffic.bytes, elapsed),
    streamCount,
    errors: traffic.errors
  };
}

async function runOoklaSpeedTest(): Promise<SpeedTestResult | null> {
  try {
    const imported = (await import("speedtest-net")) as { default?: SpeedtestNet } & SpeedtestNet;
    const speedTest = imported.default ?? imported;
    const result = await speedTest({ acceptLicense: true, acceptGdpr: true });
    const downloadBandwidth = result.download?.bandwidth;
    const uploadBandwidth = result.upload?.bandwidth;

    if (!downloadBandwidth || !uploadBandwidth) return null;

    return {
      download: {
        phase: "download",
        bytesTransferred: result.download?.bytes ?? 0,
        durationMs: result.download?.elapsed ?? 0,
        speedMbps: (downloadBandwidth * 8) / 1_000_000,
        streamCount: 0,
        errors: []
      },
      upload: {
        phase: "upload",
        bytesTransferred: result.upload?.bytes ?? 0,
        durationMs: result.upload?.elapsed ?? 0,
        speedMbps: (uploadBandwidth * 8) / 1_000_000,
        streamCount: 0,
        errors: []
      }
    };
  } catch {
    return null;
  }
}

export async function runSpeedTest(): Promise<SpeedTestResult> {
  const ookla = await runOoklaSpeedTest();
  if (ookla) return ookla;

  const download = await measureSpeed("download", 10000, 6);
  const upload = await measureSpeed("upload", 10000, 6);
  return {
    download,
    upload
  };
}
