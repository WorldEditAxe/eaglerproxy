export type Config = {
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
  name: string;
  bindHost: string;
  bindPort: number;
  maxConcurrentClients: number;
  useNatives?: boolean;
  skinServer: {
    skinUrlWhitelist?: string[];
    cache: {
      useCache: boolean;
      folderName?: string;
      skinCacheLifetime?: number;
      skinCachePruneInterval?: number;
    };
  };
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
  ratelimits: {
    lockout: number;
    limits: {
      http: number;
      ws: number;
      motd: number;
      connect: number;
      skins: number;
      skinsIp: number;
    };
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
