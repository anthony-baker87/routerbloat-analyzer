import { Activity, Clipboard, Crosshair, Gauge, Gamepad2, Loader2, Play, RadioTower, Router, ShieldCheck, Wifi } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import "./main.css";
import type { GamingRouteResult, NetworkTestResult, RouterInfo, StatusLevel, TestProgress } from "./types";

const routerBrands = ["Auto detect", "OpenWrt", "ASUS", "TP-Link", "Netgear", "Eero", "Generic"];

function fmtMs(value: number | null | undefined) {
  return typeof value === "number" ? `${value.toFixed(1)} ms` : "n/a";
}

function fmtPercent(value: number | null | undefined) {
  return typeof value === "number" ? `${value.toFixed(1)}%` : "n/a";
}

function statusTone(status?: StatusLevel) {
  if (status === "Excellent") return "text-mint border-mint/50 bg-mint/10";
  if (status === "Good") return "text-cyan border-cyan/50 bg-cyan/10";
  if (status === "Bad") return "text-amber border-amber/50 bg-amber/10";
  return "text-rose border-rose/50 bg-rose/10";
}

function MetricCard({
  label,
  value,
  sub,
  icon
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-panel/86 p-4 shadow-xl shadow-black/20">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-sm text-slate-400">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-md border border-line bg-panel2 text-cyan">{icon}</span>
      </div>
      <div className="text-2xl font-semibold tracking-normal text-white">{value}</div>
      {sub ? <div className="mt-2 text-sm text-slate-400">{sub}</div> : null}
    </div>
  );
}

function RouterPanel({
  router,
  selectedBrand,
  onBrandChange
}: {
  router: RouterInfo | null;
  selectedBrand: string;
  onBrandChange: (brand: string) => void;
}) {
  return (
    <section className="rounded-lg border border-line bg-panel/80 p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-cyan/12 text-cyan">
            <Router size={20} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">Router Detection</h2>
            <p className="text-sm text-slate-400">Gateway, brand hints, and manual fallback</p>
          </div>
        </div>
        <select
          value={selectedBrand}
          onChange={(event) => onBrandChange(event.target.value)}
          className="h-10 rounded-md border border-line bg-panel2 px-3 text-sm text-white outline-none focus:border-cyan"
        >
          {routerBrands.map((brand) => (
            <option key={brand}>{brand}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md bg-ink/60 p-3">
          <div className="text-slate-500">Gateway</div>
          <div className="mt-1 font-medium text-white">{router?.gatewayIp ?? "Not detected yet"}</div>
        </div>
        <div className="rounded-md bg-ink/60 p-3">
          <div className="text-slate-500">Brand</div>
          <div className="mt-1 font-medium text-white">{selectedBrand !== "Auto detect" ? selectedBrand : router?.detectedBrand ?? "Unknown"}</div>
        </div>
        <div className="rounded-md bg-ink/60 p-3">
          <div className="text-slate-500">Hostname</div>
          <div className="mt-1 truncate font-medium text-white">{router?.hostname ?? "n/a"}</div>
        </div>
        <div className="rounded-md bg-ink/60 p-3">
          <div className="text-slate-500">MAC vendor</div>
          <div className="mt-1 font-medium text-white">{router?.macVendor ?? "n/a"}</div>
        </div>
        <div className="rounded-md bg-ink/60 p-3">
          <div className="text-slate-500">Connection</div>
          <div className="mt-1 font-medium capitalize text-white">{router?.connectionType ?? "unknown"}</div>
        </div>
        <div className="rounded-md bg-ink/60 p-3">
          <div className="text-slate-500">Adapter</div>
          <div className="mt-1 truncate font-medium text-white">{router?.adapterName ?? "n/a"}</div>
        </div>
      </div>
      {router?.detectionNotes.length ? (
        <div className="mt-4 space-y-1 text-xs leading-5 text-slate-400">
          {router.detectionNotes.slice(0, 4).map((note) => (
            <div key={note}>{note}</div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function scopeTone(scope?: GamingRouteResult["likelyScope"]) {
  if (scope === "Local") return "border-amber/50 bg-amber/10 text-amber";
  if (scope === "ISP") return "border-rose/50 bg-rose/10 text-rose";
  if (scope === "Game Route") return "border-cyan/50 bg-cyan/10 text-cyan";
  return "border-line bg-panel2 text-slate-300";
}

function GamingRoutePanel() {
  const [target, setTarget] = useState("");
  const [routeResult, setRouteResult] = useState<GamingRouteResult | null>(null);
  const [routeRunning, setRouteRunning] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  async function runRouteTest() {
    setRouteRunning(true);
    setRouteError(null);
    try {
      if (!window.routerBloat) throw new Error("Electron preload bridge is unavailable.");
      const next = await window.routerBloat.runGamingRouteTest(target);
      setRouteResult(next);
    } catch (error) {
      setRouteError(error instanceof Error ? error.message : "Route test failed.");
    } finally {
      setRouteRunning(false);
    }
  }

  return (
    <section className="mb-6 rounded-lg border border-line bg-panel/82 p-5">
      <div className="mb-4 flex items-center justify-between gap-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-mint/12 text-mint">
            <Crosshair size={20} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">Gaming Route Test</h2>
            <p className="text-sm text-slate-400">Compare router, public DNS, and a game server target.</p>
          </div>
        </div>
        <div className="flex min-w-[28rem] items-center gap-2">
          <input
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !routeRunning) void runRouteTest();
            }}
            placeholder="Game server IP or hostname"
            className="h-11 flex-1 rounded-md border border-line bg-ink/70 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-mint"
          />
          <button
            onClick={runRouteTest}
            disabled={routeRunning}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-mint px-4 font-semibold text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {routeRunning ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
            Test Route
          </button>
        </div>
      </div>

      {routeError ? <div className="mb-4 rounded-md border border-rose/40 bg-rose/10 p-3 text-sm text-rose">{routeError}</div> : null}

      <div className="grid grid-cols-[1fr_1.1fr] gap-5">
        <div>
          <div className={`mb-3 rounded-md border px-4 py-3 ${scopeTone(routeResult?.likelyScope)}`}>
            <div className="text-xs uppercase tracking-wider opacity-80">Likely Scope</div>
            <div className="mt-1 text-xl font-bold">{routeResult?.likelyScope ?? "Not tested"}</div>
          </div>
          <p className="rounded-md bg-ink/55 p-4 text-sm leading-6 text-slate-200">
            {routeResult?.summary ??
              "Enter a reachable game server address to see whether latency or packet loss looks local, ISP-related, or specific to that route."}
          </p>
          <div className="mt-3 space-y-2">
            {(routeResult?.details ?? ["Router issues suggest local network trouble.", "DNS trouble with a stable router suggests ISP or WAN-side trouble.", "Only the game server looking worse suggests a game-route issue."]).map((detail) => (
              <div key={detail} className="rounded-md bg-panel2/80 px-3 py-2 text-sm text-slate-300">
                {detail}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {(routeResult?.comparisons ?? [
            { label: "Router", target: "Gateway", ping: null },
            { label: "Cloudflare DNS", target: "1.1.1.1", ping: null },
            { label: "Google DNS", target: "8.8.8.8", ping: null },
            { label: "Game server", target: target || "Target", ping: null }
          ]).map((comparison) => (
            <div key={`${comparison.label}-${comparison.target}`} className="rounded-lg border border-line bg-ink/55 p-3">
              <div className="truncate text-sm font-semibold text-white">{comparison.label}</div>
              <div className="mt-1 truncate text-xs text-slate-500">{comparison.target}</div>
              <div className="mt-4 text-2xl font-semibold text-white">{fmtMs(comparison.ping?.averageMs)}</div>
              <div className="mt-2 text-xs leading-5 text-slate-400">
                <div>Loss {fmtPercent(comparison.ping?.packetLossPercent)}</div>
                <div>Jitter {fmtMs(comparison.ping?.jitterMs)}</div>
                <div>Max {fmtMs(comparison.ping?.maxMs)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [result, setResult] = useState<NetworkTestResult | null>(null);
  const [router, setRouter] = useState<RouterInfo | null>(null);
  const [progress, setProgress] = useState<TestProgress>({ step: "Ready", percent: 0 });
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState("Auto detect");
  const [copied, setCopied] = useState(false);
  const metrics = result?.metrics;

  useEffect(() => {
    if (!window.routerBloat) {
      setBridgeError("Electron preload bridge is unavailable. Restart the app after running npm run build.");
      return undefined;
    }
    const unsubscribe = window.routerBloat.onProgress(setProgress);
    window.routerBloat.detectRouter().then(setRouter).catch(() => undefined);
    return unsubscribe;
  }, []);

  const effectiveBrand = selectedBrand === "Auto detect" ? undefined : selectedBrand;

  async function runTest() {
    setRunning(true);
    setCopied(false);
    setProgress({ step: "Starting", percent: 2 });
    try {
      if (!window.routerBloat) throw new Error("Electron preload bridge is unavailable.");
      const next = await window.routerBloat.runNetworkTest({ routerBrand: effectiveBrand });
      setResult(next);
      setRouter(next.router);
    } catch (error) {
      setBridgeError(error instanceof Error ? error.message : "Network test failed.");
    } finally {
      setRunning(false);
    }
  }

  async function copyReport() {
    if (!result?.report) return;
    await navigator.clipboard.writeText(result.report);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const gradeTone = useMemo(() => {
    if (!metrics) return "border-line text-slate-300 bg-panel2";
    return statusTone(metrics.status);
  }, [metrics]);

  return (
    <main className="min-h-screen px-8 py-7">
      <header className="mb-7 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-lg border border-cyan/40 bg-cyan/12 text-cyan shadow-lg shadow-cyan/10">
            <Gamepad2 size={25} />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-normal text-white">RouterBloat Analyzer</h1>
            <p className="mt-1 text-sm text-slate-400">Bufferbloat, jitter, loss, and route clues for latency-sensitive gaming.</p>
          </div>
        </div>
        <div className={`rounded-lg border px-5 py-3 text-right ${gradeTone}`}>
          <div className="text-xs uppercase tracking-wider opacity-80">Status</div>
          <div className="text-2xl font-bold">{metrics?.status ?? "Ready"}</div>
        </div>
      </header>

      {bridgeError ? (
        <section className="mb-6 rounded-lg border border-rose/40 bg-rose/10 p-4 text-sm leading-6 text-rose">
          {bridgeError}
        </section>
      ) : null}

      <section className="mb-6 grid grid-cols-[1.25fr_0.75fr] gap-6">
        <div className="rounded-lg border border-line bg-panel/78 p-5">
          <div className="flex items-center justify-between gap-5">
            <div>
              <h2 className="text-xl font-semibold text-white">Network Test</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                Runs short idle, download-loaded, and upload-loaded checks. Results are diagnostic signals, not absolute proof.
              </p>
            </div>
            <button
              onClick={runTest}
              aria-label="Run Network Test"
              title="Run Network Test"
              disabled={running}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-cyan text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {running ? <Loader2 className="animate-spin" size={19} /> : <Play size={19} />}
            </button>
          </div>

          <div className="mt-5 flex items-center gap-4">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink">
              <div className="h-full rounded-full bg-cyan transition-all" style={{ width: `${progress.percent}%` }} />
            </div>
            <div className="w-48 truncate text-right text-sm text-slate-400">{progress.step}</div>
          </div>
        </div>

        <RouterPanel router={router} selectedBrand={selectedBrand} onBrandChange={setSelectedBrand} />
      </section>

      <section className="mb-6 grid grid-cols-6 gap-4">
        <MetricCard label="Idle ping" value={fmtMs(metrics?.idleInternetAverageMs)} sub="1.1.1.1 and 8.8.8.8" icon={<RadioTower size={18} />} />
        <MetricCard label="Download ping" value={fmtMs(metrics?.loadedDownloadPingMs)} sub={`${metrics?.download.speedMbps.toFixed(1) ?? "0.0"} Mbps load`} icon={<Activity size={18} />} />
        <MetricCard label="Upload ping" value={fmtMs(metrics?.loadedUploadPingMs)} sub={`${metrics?.upload.speedMbps.toFixed(1) ?? "0.0"} Mbps load`} icon={<Wifi size={18} />} />
        <MetricCard label="Jitter" value={fmtMs(metrics?.jitterMs)} sub="Average variation" icon={<Gauge size={18} />} />
        <MetricCard label="Packet loss" value={fmtPercent(metrics?.packetLossPercent)} sub="Worst observed target" icon={<ShieldCheck size={18} />} />
        <MetricCard label="Grade" value={metrics?.grade ?? "-"} sub={fmtMs(metrics?.latencyIncreaseMs) + " increase"} icon={<Gauge size={18} />} />
      </section>

      <GamingRoutePanel />

      <section className="grid grid-cols-[0.95fr_1.05fr] gap-6">
        <div className="rounded-lg border border-line bg-panel/82 p-5">
          <h2 className="mb-3 text-lg font-semibold text-white">Diagnosis</h2>
          <p className="rounded-md border border-line bg-ink/50 p-4 text-sm leading-6 text-slate-200">
            {result?.diagnosis.summary ?? "Run a test to see whether latency likely starts at the router, local network, ISP edge, or route beyond the gateway."}
          </p>
          <div className="mt-4 space-y-2">
            {(result?.diagnosis.details ?? ["Gateway spikes point toward local network trouble.", "Stable gateway with internet spikes points toward WAN/ISP bufferbloat."]).map((item) => (
              <div key={item} className="rounded-md bg-panel2/80 px-3 py-2 text-sm text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-panel/82 p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Report & Fixes</h2>
            <button
              onClick={copyReport}
              disabled={!result}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-panel2 px-3 text-sm text-slate-100 transition hover:border-cyan disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Clipboard size={16} />
              {copied ? "Copied" : "Copy Report"}
            </button>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {(result?.recommendations ?? [
              "Enable SQM or QoS if your router supports it.",
              "Set upload/download limits to 85-95% of real speed.",
              "Test with Ethernet before blaming the ISP.",
              "Use manual router brand selection if auto-detection misses."
            ])
              .slice(0, 6)
              .map((item) => (
                <div key={item} className="rounded-md bg-ink/55 p-3 text-sm leading-5 text-slate-300">
                  {item}
                </div>
              ))}
          </div>
          <pre className="max-h-56 overflow-auto rounded-md border border-line bg-ink/70 p-4 text-xs leading-5 text-slate-300">
            {result?.report ?? "The generated report will appear here after a test."}
          </pre>
        </div>
      </section>
    </main>
  );
}
