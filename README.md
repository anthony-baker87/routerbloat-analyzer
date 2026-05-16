# RouterBloat Analyzer

RouterBloat Analyzer is a Windows-first desktop app for gamers who want to understand whether lag is coming from their local network, router, ISP, or a specific game route.

It runs short latency and load checks, compares idle and loaded ping, detects the local gateway, and turns the results into plain-English guidance instead of scary false certainty.

## Features

- Bufferbloat test with idle, download-loaded, and upload-loaded latency
- Packet loss, jitter, max latency, and latency-increase scoring
- A-F bufferbloat grade
- Local router and default gateway detection
- Active adapter detection for Ethernet, Wi-Fi, virtual, or unknown links
- Router-brand-aware recommendations for OpenWrt, ASUS, TP-Link, Netgear, Eero, and generic routers
- Gaming Route Test for a game server IP or hostname
- Copyable report with test results, diagnosis, and recommended next steps
- Mock mode for UI testing without running real network load

## Screenshots

Add screenshots here once the UI is finalized.

## Tech Stack

- Electron
- React
- Vite
- TypeScript
- Tailwind CSS
- Node.js `child_process.execFile` for sanitized Windows networking commands

## Requirements

- Windows 10 or Windows 11
- Node.js 20 or newer recommended
- npm

The MVP is Windows-first and uses commands such as `ipconfig`, `ping`, `arp`, `nslookup`, and PowerShell networking cmdlets. Admin access is not required.

## Getting Started

Install dependencies:

```powershell
npm install
```

Run the app in development:

```powershell
npm run dev
```

Build the app:

```powershell
npm run build
```

Run the built Electron app:

```powershell
npm start
```

## Using The App

For safe testing during development, leave **Mock mode** enabled and click the play button in the Network Test panel.

For real diagnostics, disable **Mock mode** and run the Network Test. The app performs short download and upload load tests, so avoid running it during an active competitive match.

For route-specific issues, enter a game server IP or hostname in **Gaming Route Test**. The app compares:

- Router/default gateway
- Cloudflare DNS, `1.1.1.1`
- Google DNS, `8.8.8.8`
- Your game server target

The route result is labeled as likely `Local`, `ISP`, `Game Route`, or `Inconclusive`.

## Scoring

Bufferbloat grade is based on loaded latency increase:

| Grade | Loaded latency increase |
| --- | --- |
| A | Under 20 ms |
| B | 20-50 ms |
| C | 50-100 ms |
| D | 100-200 ms |
| F | Over 200 ms |

## Project Structure

```text
electron/
  diagnostics/
    commands.ts          # Safe command execution wrapper
    diagnosis.ts         # Plain-English diagnosis rules
    gateway.ts           # Gateway, adapter, router detection
    loadTest.ts          # Short download/upload load checks
    ping.ts              # Windows ping parser and summaries
    recommendations.ts   # Router-specific recommendation engine
    routeTest.ts         # Gaming route comparison test
    testRunner.ts        # Main bufferbloat test orchestration
    types.ts             # Electron-side shared types
  main.ts                # Electron main process and IPC
  preload.cjs            # CommonJS preload bridge for Electron
  preload.ts             # TypeScript preload source
src/
  App.tsx                # React dashboard
  main.tsx               # Renderer entry
  main.css               # Tailwind entry and global styles
  types.ts               # Renderer-side shared types
scripts/
  copy-preload.cjs       # Copies preload.cjs into dist-electron
```

## Safety Notes

Networking commands are executed with `execFile`, not shell string interpolation. User-entered route targets are validated before being passed to `ping`.

This tool is diagnostic, not definitive. Network behavior can vary by time of day, server location, Wi-Fi conditions, ISP congestion, and game-server routing.

## Roadmap Ideas

- Game-specific server presets
- Optional `tracert` view for route hops
- Packaged installer builds
- Historical test comparison
- Export report to Markdown or JSON
- Better router vendor detection through a richer OUI database

## License

MIT
