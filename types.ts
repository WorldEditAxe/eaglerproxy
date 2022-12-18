import { randomUUID } from "crypto"
import { WebSocketServer } from "ws"
import { ProxiedPlayer } from "./classes.js"
import { Logger } from "./logger.js"
import { BRANDING, NETWORK_VERSION, VERSION } from "./meta.js"

export type UUID = ReturnType<typeof randomUUID>

export enum State {
    PRE_HANDSHAKE,
    POST_HANDSHAKE,
    DISCONNECTED
}

export type MOTD = {
    icon?: Int8Array, // 16384
    motd: [string, string]
}

export type PlayerStats = {
    max: number,
    onlineCount: number
}

export type ProxyGlobals = {
    brand: typeof BRANDING,
    version: typeof VERSION,
    MOTDVersion: typeof NETWORK_VERSION,

    serverName: string,
    secure: false,
    proxyUUID: UUID,
    MOTD: MOTD,

    playerStats: PlayerStats,
    wsServer: WebSocketServer,
    players: Map<string, ProxiedPlayer>,
    logger: Logger,
    config: Config
}

export type Config = {
    name: string,
    port: number,
    maxPlayers: number,
    motd: {
        iconURL?: string,
        l1: string,
        l2: string
    },
    server: {
        host: string,
        port: number
    },
    security: {
        enabled: boolean
        key: string,
        cert: string
    }
}