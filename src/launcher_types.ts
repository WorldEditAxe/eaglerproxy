export type Config = {
  bridge: BridgeOptions;
  adapter: AdapterOptions;
};

export type BridgeOptions = {
  enabled: boolean;
  motd:
    | "FORWARD"
    | {
        iconURL?: string;
        l1: string;
        l2?: string;
      };
};

export type AdapterOptions = {
  name: "EaglerProxy";
  bindHost: string;
  bindPort: number;
  maxConcurrentClients: 20;
  skinUrlWhitelist?: string[];
  origins: {
    allowOfflineDownloads: boolean;
    originWhitelist: string[];
    originBlacklist: string[];
  };
  motd:
    | "FORWARD"
    | {
        iconURL?: string;
        l1: string;
        l2?: string;
      };
  server: {
    host: string;
    port: number;
  };
  tls?: {
    enabled: boolean;
    key: null;
    cert: null;
  };
};
