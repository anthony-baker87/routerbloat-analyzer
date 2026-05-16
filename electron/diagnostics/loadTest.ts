import https from "node:https";
import { pingTarget } from "./ping.js";
import type { LoadResult } from "./types.js";

const DOWNLOAD_URL = "https://speed.cloudflare.com/__down?bytes=25000000";
const UPLOAD_URL = "https://speed.cloudflare.com/__up";

function mbps(bytes: number, durationMs: number): number {
  return durationMs > 0 ? (bytes * 8) / (durationMs / 1000) / 1_000_000 : 0;
}

function downloadFor(durationMs: number): Promise<{ bytes: number; errors: string[] }> {
  return new Promise((resolve) => {
    const started = Date.now();
    let bytes = 0;
    const errors: string[] = [];
    const request = https.get(DOWNLOAD_URL, (response) => {
      response.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (Date.now() - started > durationMs) request.destroy();
      });
      response.on("end", () => resolve({ bytes, errors }));
    });
    request.on("error", (error) => {
      if (Date.now() - started <= durationMs) errors.push(error.message);
      resolve({ bytes, errors });
    });
    request.setTimeout(durationMs + 1500, () => request.destroy());
  });
}

function uploadFor(durationMs: number): Promise<{ bytes: number; errors: string[] }> {
  return new Promise((resolve) => {
    const started = Date.now();
    let bytes = 0;
    const chunk = Buffer.alloc(64 * 1024, "r");
    const request = https.request(
      UPLOAD_URL,
      { method: "POST", headers: { "Content-Type": "application/octet-stream" } },
      (response) => {
        response.resume();
        response.on("end", () => resolve({ bytes, errors: [] }));
      }
    );
    const errors: string[] = [];
    request.on("error", (error) => {
      if (Date.now() - started <= durationMs) errors.push(error.message);
      resolve({ bytes, errors });
    });
    const write = () => {
      while (Date.now() - started < durationMs) {
        bytes += chunk.length;
        if (!request.write(chunk)) {
          request.once("drain", write);
          return;
        }
      }
      request.end();
    };
    write();
  });
}

export async function runLoadTest(phase: "download" | "upload", pingTargetHost: string, durationMs = 8000): Promise<LoadResult> {
  const started = Date.now();
  const loadPromise = phase === "download" ? downloadFor(durationMs) : uploadFor(durationMs);
  const pingPromise = pingTarget(pingTargetHost, Math.max(4, Math.floor(durationMs / 1000)), durationMs + 4000);
  const [load, ping] = await Promise.all([loadPromise, pingPromise]);
  const elapsed = Date.now() - started;

  return {
    phase,
    bytesTransferred: load.bytes,
    durationMs: elapsed,
    speedMbps: mbps(load.bytes, elapsed),
    ping,
    errors: load.errors
  };
}
