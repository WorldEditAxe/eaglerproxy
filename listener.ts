import { ProxiedPlayer } from "./classes.js";
import { Logger } from "./logger.js";
import { handleMotd } from "./motd.js";
import { State } from "./types.js";
import { doHandshake } from "./utils.js";

const logger = new Logger("PacketHandler")

export function handlePacket(packet: Buffer, client: ProxiedPlayer) {
    if (client.state == State.PRE_HANDSHAKE) {
        if (packet.toString() === "Accept: MOTD") {
            handleMotd(client)
        } else if (!(client as any)._handled) {
            ;(client as any)._handled = true
            doHandshake(client, packet)
        }
    } else if (client.state == State.POST_HANDSHAKE) {
        if (!client.remoteConnection || client.remoteConnection.socket.closed) {
            logger.warn(`Player ${client.username} is marked as post handshake, but is disconnected from the game server? Disconnecting due to illegal state.`)
            client.ws.close()
        } else {
            client.remoteConnection.writeRaw(packet)
        }
    }
}