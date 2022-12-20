import { EAGLERCRAFT_SKIN_CHANNEL_NAME } from "./eaglerPacketDef.js";
import { processClientReqPacket, unpackChannelMessage } from "./eaglerSkin.js";
import { Logger } from "./logger.js";
import { State, ProxiedPlayer } from "./types.js";
import { doHandshake, handleMotd } from "./utils.js";

const logger = new Logger("PacketHandler")

export function handlePacket(packet: Buffer, client: ProxiedPlayer) {
    if (client.state == State.PRE_HANDSHAKE) {
        if (packet.toString() === "Accept: MOTD") {
            handleMotd(client)
        } else if (!(client as any)._handled) {
            ;(client as any)._handled = true
            doHandshake(client, packet)
                .catch(err => {
                    logger.warn(`Error occurred whilst handling handshake! Error: ${err.stack ?? err}`)
                })
        } else if (!(client as any)._handled && packet[0] == 0x17) {
            const decoded = unpackChannelMessage(packet)
            if (decoded.channel == EAGLERCRAFT_SKIN_CHANNEL_NAME) {
                client.queuedEaglerSkinPackets.push(decoded)
            }
        }
    } else if (client.state == State.POST_HANDSHAKE) {
        if (!client.remoteConnection || client.remoteConnection.socket.closed) {
            logger.warn(`Received packet from player ${client.username} that is marked as post handshake, but is disconnected from the game server? Disconnecting due to illegal state.`)
            client.ws.close()
        } else {
            if (packet[0] == 0x17) {
                const decoded = unpackChannelMessage(packet)
                if (decoded.channel == EAGLERCRAFT_SKIN_CHANNEL_NAME) {
                    processClientReqPacket(decoded, client)
                }
            } else {
                client.remoteConnection.writeRaw(packet)
            }
        }
    }
}