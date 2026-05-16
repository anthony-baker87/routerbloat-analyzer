import { Activity, ArrowLeft, Clipboard, Crosshair, Gauge, Gamepad2, Loader2, Play, RadioTower, Router, ShieldCheck, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import "./main.css";
import type { GamingRouteResult, LoadProfileResult, NetworkTestResult, RouterInfo, StatusLevel, TestProgress } from "./types";

const routerBrands = ["Auto detect", "OpenWrt", "ASUS", "TP-Link", "Netgear", "Eero", "Generic"];
type AppView = "home" | "network" | "route";

function fmtMs(value: number | null | undefined) {
  return typeof value === "number" ? `${value.toFixed(1)} ms` : "n/a";
}

function fmtPercent(value: number | null | undefined) {
  return typeof value === "number" ? `${value.toFixed(1)}%` : "n/a";
}

function fmtMbps(value: number | null | undefined) {
  return typeof value === "number" ? `${value.toFixed(1)} Mbps` : "n/a";
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

function ProfileCard({ profile }: { profile: LoadProfileResult }) {
  return (
    <div className="rounded-lg border border-line bg-panel/86 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">{profile.name}</div>
          <div className="mt-1 text-xs leading-5 text-slate-400">{profile.description}</div>
        </div>
        <div className={`rounded-md border px-3 py-1 text-lg font-bold ${statusTone(profile.status)}`}>{profile.grade}</div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
        <div className="rounded-md bg-ink/55 p-2">
          <div className="text-slate-500">Increase</div>
          <div className="mt-1 text-sm font-semibold text-white">{fmtMs(profile.latencyIncreaseMs)}</div>
        </div>
        <div className="rounded-md bg-ink/55 p-2">
          <div className="text-slate-500">Streams</div>
          <div className="mt-1 text-sm font-semibold text-white">{profile.streamCount}</div>
        </div>
        <div className="rounded-md bg-ink/55 p-2">
          <div className="text-slate-500">Down ping</div>
          <div className="mt-1 text-sm font-semibold text-white">{fmtMs(profile.loadedDownloadPingMs)}</div>
        </div>
        <div className="rounded-md bg-ink/55 p-2">
          <div className="text-slate-500">Up ping</div>
          <div className="mt-1 text-sm font-semibold text-white">{fmtMs(profile.loadedUploadPingMs)}</div>
        </div>
      </div>
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

function AppHeader() {
  return (
    <header className="mb-7 flex items-center gap-4">
      <span className="grid h-12 w-12 place-items-center rounded-lg border border-cyan/40 bg-cyan/12 text-cyan shadow-lg shadow-cyan/10">
        <Gamepad2 size={25} />
      </span>
      <div>
        <h1 className="text-3xl font-bold tracking-normal text-white">RouterBloat Analyzer</h1>
        <p className="mt-1 text-sm text-slate-400">Bufferbloat, jitter, loss, and route clues for latency-sensitive gaming.</p>
      </div>
    </header>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="mb-5 inline-flex h-10 items-center gap-2 rounded-md border border-line bg-panel2 px-3 text-sm font-semibold text-slate-100 transition hover:border-cyan"
    >
      <ArrowLeft size={17} />
      Back
    </button>
  );
}

function HomePage({ onNavigate }: { onNavigate: (view: AppView) => void }) {
  return (
    <section className="grid min-h-[28rem] place-items-center">
      <div className="w-full max-w-5xl">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-white">Choose a test</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Start with the network test for bufferbloat, speed, jitter, and packet loss. Use the gaming route test when a specific server feels bad.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-5">
          <button
            onClick={() => onNavigate("network")}
            className="group rounded-lg border border-line bg-panel/86 p-6 text-left transition hover:border-cyan hover:bg-panel"
          >
            <span className="mb-5 grid h-12 w-12 place-items-center rounded-md bg-cyan/12 text-cyan group-hover:bg-cyan group-hover:text-ink">
              <Activity size={23} />
            </span>
            <div className="text-xl font-semibold text-white">Network Test</div>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Measure speed, idle ping, loaded latency, jitter, packet loss, and light/medium/heavy bufferbloat profiles.
            </p>
          </button>
          <button
            onClick={() => onNavigate("route")}
            className="group rounded-lg border border-line bg-panel/86 p-6 text-left transition hover:border-mint hover:bg-panel"
          >
            <span className="mb-5 grid h-12 w-12 place-items-center rounded-md bg-mint/12 text-mint group-hover:bg-mint group-hover:text-ink">
              <Crosshair size={23} />
            </span>
            <div className="text-xl font-semibold text-white">Gaming Route Test</div>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Enter a game server IP or hostname and compare it against your router, Cloudflare DNS, and Google DNS.
            </p>
          </button>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [view, setView] = useState<AppView>("home");
  const [result, setResult] = useState<NetworkTestResult | null>(null);
  const [router, setRouter] = useState<RouterInfo | null>(null);
  const [progress, setProgress] = useState<TestProgress>({ step: "Ready", percent: 0 });
  const [progressLog, setProgressLog] = useState<TestProgress[]>([]);
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
    const unsubscribe = window.routerBloat.onProgress((nextProgress) => {
      setProgress(nextProgress);
      setProgressLog((current) => [...current, nextProgress].slice(-8));
    });
    window.routerBloat.detectRouter().then(setRouter).catch(() => undefined);
    return unsubscribe;
  }, []);

  const effectiveBrand = selectedBrand === "Auto detect" ? undefined : selectedBrand;

  async function runTest() {
    setRunning(true);
    setCopied(false);
    setProgress({ step: "Starting", percent: 2 });
    setProgressLog([{ step: "Starting", percent: 2 }]);
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

  return (
    <main className="min-h-screen px-8 py-7">
      <AppHeader />

      {bridgeError ? (
        <section className="mb-6 rounded-lg border border-rose/40 bg-rose/10 p-4 text-sm leading-6 text-rose">
          {bridgeError}
        </section>
      ) : null}

      {view === "home" ? <HomePage onNavigate={setView} /> : null}

      {view === "network" ? (
        <>
          <BackButton onBack={() => setView("home")} />

          <section className="mb-6 grid grid-cols-[1.25fr_0.75fr] gap-6">
            <div className="rounded-lg border border-line bg-panel/78 p-5">
              <div className="flex items-center justify-between gap-5">
                <div>
                  <h2 className="text-xl font-semibold text-white">Network Test</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                    Runs short idle, speed, download-loaded, and upload-loaded checks. Results are diagnostic signals, not absolute proof.
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
                <div className="w-64 text-right text-sm text-slate-400">{progress.step}</div>
              </div>
              <div className="mt-4 rounded-md border border-line bg-ink/45 p-3">
                <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">Test Log</div>
                <div className="space-y-1 text-xs leading-5 text-slate-400">
                  {progressLog.length ? (
                    progressLog.map((entry, index) => (
                      <div key={`${entry.percent}-${entry.step}-${index}`} className="flex justify-between gap-4">
                        <span className="whitespace-normal">{entry.step}</span>
                        <span className="shrink-0 text-slate-500">{entry.percent}%</span>
                      </div>
                    ))
                  ) : (
                    <div>Waiting to run a test.</div>
                  )}
                </div>
              </div>
            </div>

            <RouterPanel router={router} selectedBrand={selectedBrand} onBrandChange={setSelectedBrand} />
          </section>

          <section className="mb-6 grid grid-cols-4 gap-4 xl:grid-cols-8">
            <MetricCard label="Idle ping" value={fmtMs(metrics?.idleInternetAverageMs)} sub="1.1.1.1 and 8.8.8.8" icon={<RadioTower size={18} />} />
            <MetricCard label="Download speed" value={fmtMbps(metrics?.speedTest.download.speedMbps)} sub="Separate speed test" icon={<Activity size={18} />} />
            <MetricCard label="Upload speed" value={fmtMbps(metrics?.speedTest.upload.speedMbps)} sub="Separate speed test" icon={<Wifi size={18} />} />
            <MetricCard label="Download ping" value={fmtMs(metrics?.loadedDownloadPingMs)} sub="During download load" icon={<Activity size={18} />} />
            <MetricCard label="Upload ping" value={fmtMs(metrics?.loadedUploadPingMs)} sub="During upload load" icon={<Wifi size={18} />} />
            <MetricCard label="Jitter" value={fmtMs(metrics?.jitterMs)} sub="Average variation" icon={<Gauge size={18} />} />
            <MetricCard label="Packet loss" value={fmtPercent(metrics?.packetLossPercent)} sub="Worst observed target" icon={<ShieldCheck size={18} />} />
            <MetricCard label="Grade" value={metrics?.grade ?? "-"} sub={fmtMs(metrics?.latencyIncreaseMs) + " increase"} icon={<Gauge size={18} />} />
          </section>

          <section className="mb-6 rounded-lg border border-line bg-panel/78 p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">Load Profile Grades</h2>
              <p className="mt-1 text-sm text-slate-400">
                Light shows everyday traffic, Medium approximates gaming with background household use, and Heavy shows what happens when uploads or downloads saturate the line.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {metrics?.profiles?.length ? (
                metrics.profiles.map((profile) => <ProfileCard key={profile.name} profile={profile} />)
              ) : (
                <>
                  <div className="rounded-lg border border-line bg-ink/45 p-4 text-sm text-slate-400">Light profile appears after a test.</div>
                  <div className="rounded-lg border border-line bg-ink/45 p-4 text-sm text-slate-400">Medium profile appears after a test.</div>
                  <div className="rounded-lg border border-line bg-ink/45 p-4 text-sm text-slate-400">Heavy profile appears after a test.</div>
                </>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-line bg-panel/82 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Report & Fixes</h2>
                <p className="mt-1 text-sm text-slate-400">Diagnosis and recommended fixes based on this test result.</p>
              </div>
              <button
                onClick={copyReport}
                disabled={!result}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-panel2 px-3 text-sm text-slate-100 transition hover:border-cyan disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Clipboard size={16} />
                {copied ? "Copied" : "Copy Report"}
              </button>
            </div>

            <div className="mb-5 rounded-md border border-line bg-ink/50 p-4">
              <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">Diagnosis</div>
              <p className="text-sm leading-6 text-slate-200">
                {result?.diagnosis.summary ?? "Run a test to see whether latency likely starts at the router, local network, ISP edge, or route beyond the gateway."}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(result?.diagnosis.details ?? ["Gateway spikes point toward local network trouble.", "Stable gateway with internet spikes points toward WAN/ISP bufferbloat."]).map((item) => (
                  <div key={item} className="rounded-md bg-panel2/80 px-3 py-2 text-sm text-slate-300">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <h3 className="text-base font-semibold text-white">Recommended Fixes</h3>
              <p className="mt-1 text-sm text-slate-400">Start with the first item, retest, then move down the list only if the issue remains.</p>
            </div>
            <div className="mb-5 grid grid-cols-2 gap-2">
              {(result?.recommendations ?? [
                "Enable SQM or QoS if your router supports it.",
                "Set upload/download limits to 85-95% of real speed.",
                "Test with Ethernet before blaming the ISP.",
                "Use manual router brand selection if auto-detection misses."
              ])
                .slice(0, 8)
                .map((item) => (
                  <div key={item} className="rounded-md bg-ink/55 p-3 text-sm leading-5 text-slate-300">
                    {item}
                  </div>
                ))}
            </div>
            <pre className="max-h-64 overflow-auto rounded-md border border-line bg-ink/70 p-4 text-xs leading-5 text-slate-300">
              {result?.report ?? "The generated report will appear here after a test."}
            </pre>
          </section>
        </>
      ) : null}

      {view === "route" ? (
        <>
          <BackButton onBack={() => setView("home")} />
          <GamingRoutePanel />
        </>
      ) : null}
    </main>
  );
}
