import https from "node:https";

const DOWNLOAD_URL = "https://speed.cloudflare.com/__down";
const UPLOAD_URL = "https://speed.cloudflare.com/__up";
const DOWNLOAD_CHUNK_BYTES = 50_000_000;
const FALLBACK_DOWNLOAD_URLS = [
  "https://proof.ovh.net/files/100Mb.dat",
  "https://proof.ovh.net/files/10Mb.dat"
];

export interface TrafficResult {
  bytes: number;
  errors: string[];
}

export function mbps(bytes: number, durationMs: number): number {
  return durationMs > 0 ? (bytes * 8) / (durationMs / 1000) / 1_000_000 : 0;
}

export function downloadStream(durationMs: number): Promise<TrafficResult> {
  return new Promise((resolve) => {
    const started = Date.now();
    let bytes = 0;
    const errors: string[] = [];

    const startRequest = () => {
      if (Date.now() - started >= durationMs) {
        resolve({ bytes, errors });
        return;
      }

      let settled = false;
      const url = `${DOWNLOAD_URL}?bytes=${DOWNLOAD_CHUNK_BYTES}&cacheBust=${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const request = https.get(url, { headers: { "Cache-Control": "no-cache" } }, (response) => {
        if (response.statusCode && response.statusCode >= 400) {
          errors.push(`Download request returned HTTP ${response.statusCode}.`);
          response.resume();
          response.on("end", () => {
            if (Date.now() - started < durationMs) {
              startRequest();
              return;
            }
            resolve({ bytes, errors });
          });
          return;
        }

        response.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (Date.now() - started >= durationMs && !settled) {
            settled = true;
            request.destroy();
            resolve({ bytes, errors });
          }
        });
        response.on("end", () => {
          if (!settled) startRequest();
        });
      });
      request.on("error", (error) => {
        if (settled) return;
        settled = true;
        if (Date.now() - started < durationMs) {
          errors.push(error.message);
          startRequest();
          return;
        }
        resolve({ bytes, errors });
      });
      request.setTimeout(Math.max(1500, durationMs - (Date.now() - started) + 500), () => {
        if (settled) return;
        settled = true;
        request.destroy();
        resolve({ bytes, errors });
      });
    };

    startRequest();
  });
}

function downloadFallbackStream(durationMs: number, sourceIndex = 0): Promise<TrafficResult> {
  return new Promise((resolve) => {
    const started = Date.now();
    let bytes = 0;
    const errors: string[] = [];

    const startRequest = () => {
      if (Date.now() - started >= durationMs) {
        resolve({ bytes, errors });
        return;
      }

      const source = FALLBACK_DOWNLOAD_URLS[sourceIndex % FALLBACK_DOWNLOAD_URLS.length];
      let settled = false;
      const request = https.get(`${source}?cacheBust=${Date.now()}-${Math.random().toString(16).slice(2)}`, (response) => {
        if (response.statusCode && response.statusCode >= 400) {
          errors.push(`Fallback download returned HTTP ${response.statusCode}.`);
          response.resume();
          response.on("end", () => {
            if (Date.now() - started < durationMs) startRequest();
            else resolve({ bytes, errors });
          });
          return;
        }

        response.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (Date.now() - started >= durationMs && !settled) {
            settled = true;
            request.destroy();
            resolve({ bytes, errors });
          }
        });
        response.on("end", () => {
          if (!settled) startRequest();
        });
      });
      request.on("error", (error) => {
        if (settled) return;
        settled = true;
        errors.push(error.message);
        if (Date.now() - started < durationMs) startRequest();
        else resolve({ bytes, errors });
      });
      request.setTimeout(Math.max(1500, durationMs - (Date.now() - started) + 500), () => {
        if (settled) return;
        settled = true;
        request.destroy();
        resolve({ bytes, errors });
      });
    };

    startRequest();
  });
}

export async function resilientDownloadStream(durationMs: number): Promise<TrafficResult> {
  const primary = await downloadStream(durationMs);
  if (primary.bytes > 1_000_000) return primary;

  const fallback = await downloadFallbackStream(durationMs);
  return {
    bytes: fallback.bytes,
    errors: [...primary.errors, ...fallback.errors]
  };
}

export function uploadStream(durationMs: number): Promise<TrafficResult> {
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

export async function runParallelTraffic(
  durationMs: number,
  streamCount: number,
  streamFactory: (durationMs: number) => Promise<TrafficResult>
): Promise<TrafficResult> {
  const results = await Promise.all(Array.from({ length: streamCount }, () => streamFactory(durationMs)));
  return {
    bytes: results.reduce((sum, result) => sum + result.bytes, 0),
    errors: results.flatMap((result) => result.errors)
  };
}
