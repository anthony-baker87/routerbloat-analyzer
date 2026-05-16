import { runCommand } from "./commands.js";
import type { RouterInfo } from "./types.js";

const BRAND_HINTS: Record<string, string> = {
  asus: "ASUS",
  tplink: "TP-Link",
  "tp-link": "TP-Link",
  netgear: "Netgear",
  eero: "Eero",
  openwrt: "OpenWrt",
  linksys: "Linksys",
  ubiquiti: "Ubiquiti",
  unifi: "Ubiquiti",
  arris: "ARRIS",
  technicolor: "Technicolor",
  xfinity: "Xfinity",
  fios: "Verizon"
};

const MAC_VENDOR_HINTS: Record<string, string> = {
  "10:7B:44": "ASUS",
  "A8:5E:45": "ASUS",
  "50:46:5D": "ASUS",
  "50:C7:BF": "TP-Link",
  "14:CC:20": "TP-Link",
  "C0:25:E9": "TP-Link",
  "A0:04:60": "Netgear",
  "44:94:FC": "Netgear",
  "80:2A:A8": "Ubiquiti",
  "74:AC:B9": "Ubiquiti",
  "60:38:E0": "Eero"
};

function brandFromText(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  const hit = Object.entries(BRAND_HINTS).find(([hint]) => normalized.includes(hint));
  return hit?.[1] ?? null;
}

function brandFromMac(mac: string | null): string | null {
  if (!mac) return null;
  const oui = mac.replace(/-/g, ":").toUpperCase().split(":").slice(0, 3).join(":");
  return MAC_VENDOR_HINTS[oui] ?? null;
}

function parseDefaultGateway(ipconfig: string): string | null {
  const lines = ipconfig.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    if (/Default Gateway/i.test(lines[index])) {
      const sameLine = lines[index].match(/(\d{1,3}(?:\.\d{1,3}){3})/);
      if (sameLine) return sameLine[1];
      for (let lookahead = index + 1; lookahead < Math.min(index + 4, lines.length); lookahead += 1) {
        const nextLine = lines[lookahead].match(/(\d{1,3}(?:\.\d{1,3}){3})/);
        if (nextLine) return nextLine[1];
      }
    }
  }
  return null;
}

function classifyAdapter(name: string | null, description: string | null, medium: string | null): RouterInfo["connectionType"] {
  const text = `${name ?? ""} ${description ?? ""} ${medium ?? ""}`.toLowerCase();
  if (/wi-?fi|wireless|802\.11|wlan/.test(text)) return "wifi";
  if (/virtual|vpn|hyper-v|vmware|loopback|tunnel|tap|wan miniport/.test(text)) return "virtual";
  if (/ethernet|gbe|2\.5g|10g|realtek|intel|killer|ndisphysicalmedium802_3/.test(text)) return "ethernet";
  return "unknown";
}

async function getActiveAdapter(gatewayIp: string | null): Promise<Pick<RouterInfo, "adapterName" | "connectionType">> {
  if (!gatewayIp) return { adapterName: null, connectionType: "unknown" };

  try {
    const script = [
      `$cfg = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway.NextHop -eq '${gatewayIp}' } | Select-Object -First 1`,
      "if ($null -eq $cfg) { return }",
      "$adapter = Get-NetAdapter -InterfaceIndex $cfg.InterfaceIndex",
      "[pscustomobject]@{Name=$adapter.Name; Description=$adapter.InterfaceDescription; Medium=$adapter.NdisPhysicalMedium} | ConvertTo-Json -Compress"
    ].join("; ");
    const output = await runCommand("powershell", ["-NoProfile", "-Command", script], 6000);
    const parsed = JSON.parse(output.trim()) as { Name?: string; Description?: string; Medium?: string };
    return {
      adapterName: parsed.Name ?? null,
      connectionType: classifyAdapter(parsed.Name ?? null, parsed.Description ?? null, parsed.Medium ?? null)
    };
  } catch {
    return { adapterName: null, connectionType: "unknown" };
  }
}

async function getHostname(ip: string): Promise<string | null> {
  try {
    const output = await runCommand("nslookup", [ip], 5000);
    return output.match(/Name:\s+(.+)/i)?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
}

async function getMacAddress(ip: string): Promise<string | null> {
  try {
    await runCommand("ping", ["-n", "1", "-w", "750", ip], 2500);
    const output = await runCommand("arp", ["-a", ip], 5000);
    return output.match(/([0-9a-f]{2}[-:]){5}[0-9a-f]{2}/i)?.[0]?.replace(/-/g, ":").toUpperCase() ?? null;
  } catch {
    return null;
  }
}

async function getUpnpName(): Promise<string | null> {
  try {
    const script = "(New-Object -ComObject HNetCfg.NATUPnP).StaticPortMappingCollection | Out-Null; 'UPnP available'";
    const output = await runCommand("powershell", ["-NoProfile", "-Command", script], 5000);
    return output.trim() || null;
  } catch {
    return null;
  }
}

export async function detectRouter(): Promise<RouterInfo> {
  const detectionNotes: string[] = [];
  let gatewayIp: string | null = null;

  try {
    gatewayIp = parseDefaultGateway(await runCommand("ipconfig", [], 6000));
    if (gatewayIp) detectionNotes.push(`Default gateway detected at ${gatewayIp}.`);
  } catch {
    detectionNotes.push("Could not read default gateway from ipconfig.");
  }

  const hostname = gatewayIp ? await getHostname(gatewayIp) : null;
  const macAddress = gatewayIp ? await getMacAddress(gatewayIp) : null;
  const adapter = await getActiveAdapter(gatewayIp);
  const upnpName = await getUpnpName();
  const macVendor = brandFromMac(macAddress);
  const detectedBrand = brandFromText(hostname) ?? brandFromText(upnpName) ?? macVendor ?? brandFromText(gatewayIp);

  if (hostname) detectionNotes.push(`Gateway hostname: ${hostname}.`);
  if (macAddress) detectionNotes.push(`Gateway MAC: ${macAddress}.`);
  if (macVendor) detectionNotes.push(`MAC vendor hint: ${macVendor}.`);
  if (upnpName) detectionNotes.push(`UPnP hint: ${upnpName}.`);
  if (adapter.adapterName) detectionNotes.push(`Active adapter: ${adapter.adapterName} (${adapter.connectionType}).`);
  if (!detectedBrand) detectionNotes.push("Router brand could not be identified automatically.");

  return {
    gatewayIp,
    hostname,
    macAddress,
    macVendor,
    upnpName,
    adapterName: adapter.adapterName,
    connectionType: adapter.connectionType,
    detectedBrand,
    confidence: detectedBrand ? (macVendor === detectedBrand ? "medium" : "low") : "unknown",
    detectionNotes
  };
}
