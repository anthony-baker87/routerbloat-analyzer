import { execFile } from "node:child_process";

const SAFE_COMMANDS = new Set(["ipconfig", "ping", "arp", "nslookup", "powershell"]);

export function runCommand(command: string, args: string[], timeoutMs = 8000): Promise<string> {
  if (!SAFE_COMMANDS.has(command)) {
    return Promise.reject(new Error(`Command is not allowed: ${command}`));
  }

  if (command !== "powershell" && args.some((arg) => /[;&|><`]/.test(arg))) {
    return Promise.reject(new Error("Unsafe command argument rejected"));
  }

  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: timeoutMs, windowsHide: true }, (error, stdout, stderr) => {
      if (error && !stdout) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout.toString());
    });
  });
}
