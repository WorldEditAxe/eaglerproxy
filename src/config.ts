// This folder contains options for both the bridge and networking adapter.
// Environment files and .env files are available here. Set the value of any config option to process.env.<ENV name>

import { Config } from "./launcher_types.js";

export const config: Config = {
  bridge: {
    enabled: false,
    motd: null,
  },
  adapter: {
    name: "EaglerProxy",
    bindHost: "0.0.0.0",
    bindPort: 8080,
    maxConcurrentClients: 20,
    useNatives: false,
    skinServer: {
      skinUrlWhitelist: undefined,
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
        skins: 1000,
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
      host: "0.0.0.0",
      port: 25565,
    },
    tls: undefined,
  },
};
