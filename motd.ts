import { randomUUID } from "crypto";
import { WebSocket } from "ws";
import { ProxiedPlayer } from "./classes.js";
import { UUID } from "./types.js"

export type MotdPlayer = {
    name: string,
    id: UUID
}

export type MotdJSONRes = {
    brand: string,
    cracked: true,
    data: {
        cache: true,
        icon: boolean,
        max: number,
        motd: [string, string],
        online: number,
        players: string[],
    },
    name: string,
    secure: false,
    time: ReturnType<typeof Date.now>,
    type: "motd",
    uuid: ReturnType<typeof randomUUID>,
    vers: string
}

// a 16384 byte array
export type MotdServerLogo = Int8Array

export function handleMotd(player: Partial<ProxiedPlayer>) {
    const names = []
    for (const [username, player] of PROXY.players) {
        if (names.length > 0) {
            names.push(`(and ${PROXY.players.size - names.length} more)`)
            break
        } else {
            names.push(username)
        }
    }

    player.ws.send(JSON.stringify({
        brand: PROXY.brand,
        cracked: true,
        data: {
            cache: true,
            icon: PROXY.MOTD.icon ? true : false,
            max: PROXY.playerStats.max,
            motd: PROXY.MOTD.motd,
            online: PROXY.playerStats.onlineCount,
            players: names
        },
        name: PROXY.serverName,
        secure: false,
        time: Date.now(),
        type: "motd",
        uuid: PROXY.proxyUUID,
        vers: PROXY.MOTDVersion
    } as MotdJSONRes))
    if (PROXY.MOTD.icon) {
        player.ws.send(PROXY.MOTD.icon)
    }
    player.ws.close()
}