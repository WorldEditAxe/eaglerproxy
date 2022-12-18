import { Config } from "./types.js";

export const config: Config = {
    name: "BasedProxy",
    port: 80, // 443 if using TLS
    maxPlayers: 20,
    motd: {
        iconURL: null,
        l1: "hi",
        l2: "lol"
    },
    server: {
        host: "127.0.0.1",
        port: 25565
    },
    security: { // provide path to key & cert if you want to enable encryption/secure websockets
        enabled: false,
        key: null,
        cert: null
    }
}