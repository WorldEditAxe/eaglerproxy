import { Config } from "./types.js";

export const config: Config = {
    name: "BasedProxy",
    bindHost: "0.0.0.0",
    bindPort: 80, // 443 if using TLS
    maxPlayers: 20,
    motd: {
        iconURL: "./icon.webp",
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

export const BRANDING: Readonly<string> = Object.freeze("EaglerXProxy")
export const VERSION: Readonly<string> = "1.0.0"
export const NETWORK_VERSION: Readonly<string> = Object.freeze(BRANDING + "/" + VERSION)