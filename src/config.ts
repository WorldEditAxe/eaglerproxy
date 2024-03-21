// This folder contains options for both the bridge and networking adapter.
// Environment files and .env files are available here. Set the value of any config option to process.env.<ENV name>

import { Config } from "./launcher_types.js";

export const config: Config = {
  adapter: {
    name: "EaglerProxy",
    bindHost: "0.0.0.0",
    bindPort: 8080,
    maxConcurrentClients: 20,
    useNatives: false,
    skinServer: {
      skinUrlWhitelist: undefined,
      cache: {
        useCache: true,
        folderName: "skinCache",
        skinCacheLifetime: 60 * 60 * 1000,
        skinCachePruneInterval: 10 * 60 * 1000,
      },
    },
    motd: true
      ? "FORWARD"
      : {
          iconURL: "motd.png",
          l1: "yes",
          l2: "no",
        },
    ratelimits: {
      lockout: 10,
      limits: {
        http: 100,
        ws: 100,
        motd: 100,
        skins: 100, // adjust as necessary
        skinsIp: 10000,
        connect: 100,
      },
    },
    origins: {
      allowOfflineDownloads: true,
      originWhitelist: null,
      originBlacklist: null,
    },
    server: {
      host: "127.0.0.1",
      port: 1111,
    },
    tls: undefined,
  },
};
