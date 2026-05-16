declare module "speedtest-net" {
  interface SpeedtestResult {
    download?: {
      bandwidth?: number;
      bytes?: number;
      elapsed?: number;
    };
    upload?: {
      bandwidth?: number;
      bytes?: number;
      elapsed?: number;
    };
  }

  export default function speedTest(options: { acceptLicense: boolean; acceptGdpr: boolean }): Promise<SpeedtestResult>;
}
