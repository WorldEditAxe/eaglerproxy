import WebSocket from "ws"
import {
    encodeULEB128 as encodeVarInt,
    decodeULEB128 as decodeVarInt,
    encodeSLEB128 as encodeSVarInt,
    decodeSLEB128 as decodeSVarInt
} from "@thi.ng/leb128"
import { DisconnectReason, EAGLERCRAFT_SKIN_CHANNEL_NAME, EaglerPacketId, MAGIC_BUILTIN_SKIN_BYTES, MAGIC_ENDING_IDENTIFY_S_BYTES } from "./eaglerPacketDef.js"
import { Logger } from "./logger.js"
import { ChannelMessageType, Chat, ChatColor, ProxiedPlayer, State, UUID } from "./types.js"
import { toBuffer, toString as uuidToString } from "uuid-buffer"
import * as mc from "minecraft-protocol"
import { config } from "./config.js"
import sharp from "sharp"
import { createHash, randomUUID } from "crypto"
import { encodeSSkinDl, encodeSSkinDlBuiltin, packChannelMessage, processClientReqPacket } from "./eaglerSkin.js"

const logger = new Logger("LoginHandler")
const USERNAME_REGEX = /[^0-9^a-z^A-Z^_]/gi

export function genUUID(user: string): string {
    const str = `OfflinePlayer:${user}`
    let md5Bytes = createHash('md5').update(str).digest()
    md5Bytes[6]  &= 0x0f;  /* clear version        */
    md5Bytes[6]  |= 0x30;  /* set to version 3     */
    md5Bytes[8]  &= 0x3f;  /* clear variant        */
    md5Bytes[8]  |= 0x80;  /* set to IETF variant  */
    return uuidToString(md5Bytes)
}

export function bufferizeUUID(uuid: string): Buffer {
    return toBuffer(uuid)
}

export function validateUsername(user: string): void | never {
    if (user.length > 20)
        throw new Error("Username is too long!")
    if (!!user.match(USERNAME_REGEX))
        throw new Error("Invalid username. Username can only contain alphanumeric characters, and the underscore (_) character.")
}

export function chatToPlainString(chat: Chat): string {
    let ret = ''
    if (chat.text != null) ret += chat.text
    if (chat.extra != null) {
        chat.extra.forEach(extra => {
            ret += extra.text
        })
    }
    return ret
}

export function disconnect(player: ProxiedPlayer, message: Chat | string, code?: DisconnectReason) {
    if (player.state == State.POST_HANDSHAKE) {
        const message_m = (typeof message == 'string' ? JSON.stringify({ text: message }) : JSON.stringify(message)) + 0x0
        const messageLen = encodeVarInt(message_m.length)
        const d = Buffer.alloc([0x40, ...messageLen, ...Buffer.from(message_m)].length)
        d.set([0x40, ...messageLen, ...Buffer.from(message_m)])
        player.ws.send(d)
        player.ws.close()
    } else {
        const message_m = (typeof message == 'string' ? message : chatToPlainString(message))
        const messageLen = encodeVarInt(message_m.length), codeEnc = encodeVarInt(code ?? DisconnectReason.CUSTOM)
        const d = Buffer.alloc([0xff,...codeEnc, ...messageLen, ...Buffer.from(message_m)].length)
        d.set([0xff,...codeEnc, ...messageLen, ...Buffer.from(message_m)])
        player.ws.send(d)
        player.ws.close()
    }
}

export function awaitPacket(ws: WebSocket, id?: EaglerPacketId): Promise<Buffer> {
    return new Promise<Buffer>((res, rej) => {
        let resolved = false
        const msgCb = (msg: any) => {
            if (id != null && msg[0] == id) {
                resolved = true
                ws.removeEventListener('message', msgCb)
                ws.removeEventListener('close', discon)
                ws.setMaxListeners(ws.getMaxListeners() - 2 < 0 ? 5 : ws.getMaxListeners() - 2)
                res(msg)
            } else if (id == null) {
                resolved = true
                ws.removeEventListener('message', msgCb)
                ws.removeEventListener('close', discon)
                ws.setMaxListeners(ws.getMaxListeners() - 2 < 0 ? 5 : ws.getMaxListeners() - 2)
                res(msg)
            }
        }
        const discon = () => {
            resolved = true
            ws.removeEventListener('message', msgCb)
            ws.removeEventListener('close', discon)
            ws.setMaxListeners(ws.getMaxListeners() - 2 < 0 ? 5 : ws.getMaxListeners() - 2)
            rej("Connection closed")
        }
        ws.setMaxListeners(ws.getMaxListeners() + 2)
        ws.on('message', msgCb)
        ws.on('close', discon)
        setTimeout(() => {
            ws.removeEventListener('message', msgCb)
            ws.removeEventListener('close', discon)
            ws.setMaxListeners(ws.getMaxListeners() - 2 < 0 ? 5 : ws.getMaxListeners() - 2)
            rej("Timed out")
        }, 10000)
    })
}

export function loginServer(ip: string, port: number, client: ProxiedPlayer) {
    return new Promise<void>((res, rej) => {
        let blockedSuccessLogin = false
        const mcClient = mc.createClient({
            host: ip,
            port: port,
            auth: 'offline',
            version: '1.8.8',
            username: client.username
        })
        mcClient.on('error', err => {
            mcClient.end()
            rej(err)
        })
        mcClient.on('connect', () => {
            client.remoteConnection = mcClient
            mcClient.on('end', () => {
                client.ws.close()
            })
            logger.info(`Player ${client.username} has been connected to the server.`)
            res()
        })
        mcClient.on('raw', p => {
            // block the login success packet to fix the bug that prints the UUID in chat on join
            if (p[0] == 0x02 && blockedSuccessLogin) {
                client.ws.send(p)
            } else if (p[0] == 0x02) {
                blockedSuccessLogin = !blockedSuccessLogin
            } else {
                client.ws.send(p)
            }
        })
    })
}

export async function doHandshake(client: ProxiedPlayer, initialPacket: Buffer) {
    client.ws.on('close', () => {
        client.state = State.DISCONNECTED
        if (client.remoteConnection) {
            client.remoteConnection.end()
        }
        PROXY.players.delete(client.username)
        logger.info(`Client [/${client.ip}:${client.remotePort}]${client.username ? ` (${client.username})` : ""} disconnected from the server.`)
    })
    if (PROXY.players.size + 1 > PROXY.config.maxPlayers) {
        disconnect(client, ChatColor.YELLOW + "The proxy is full!", DisconnectReason.CUSTOM)
        return
    }
    const identifyC = {
        id: null,
        brandingLen: null,
        branding: null,
        verLen: null,
        ver: null
    }
    if (true) {
        // save namespace by nesting func declarations in a if true statement
        const Iid = decodeVarInt(initialPacket)
        identifyC.id = Number(Iid[0])
        const brandingLen = decodeVarInt(initialPacket.subarray(Iid[1] + 2))
        identifyC.brandingLen = Number(brandingLen[0])
        identifyC.branding = initialPacket.subarray(brandingLen[1] + Iid[1] + 2, brandingLen[1] + Iid[1] + Number(brandingLen[0]) + 2).toString()
        const verLen = decodeVarInt(initialPacket.subarray(brandingLen[1] + Iid[1] + Number(brandingLen[0]) + 2))
        identifyC.verLen = Number(verLen[0])
        identifyC.ver = initialPacket.subarray(brandingLen[1] + Number(brandingLen[0]) + Iid[1] + verLen[1] + 2).toString()
    }
    if (true) {
        const brandingLen = encodeVarInt(PROXY.brand.length), brand = PROXY.brand
        const verLen = encodeVarInt(PROXY.version.length), version = PROXY.version
        const buff = Buffer.alloc(2 + MAGIC_ENDING_IDENTIFY_S_BYTES.length + brandingLen.length + brand.length + verLen.length + version.length)
        buff.set([EaglerPacketId.IDENTIFY_SERVER, 0x01, ...brandingLen, ...Buffer.from(brand), ...verLen, ...Buffer.from(version), ...Buffer.from(MAGIC_ENDING_IDENTIFY_S_BYTES)])
        client.ws.send(buff)
    }
    client.clientBrand = identifyC.branding
    const login = await awaitPacket(client.ws)
    const loginP = {
        id: null,
        usernameLen: null,
        username: null,
        randomStrLen: null,
        randomStr: null,
        nullByte: null
    }
    if (login[0] === EaglerPacketId.LOGIN) {
        const Iid = decodeVarInt(login)
        loginP.id = Number(Iid[0])
        const usernameLen = decodeVarInt(login.subarray(Iid[1]))
        loginP.usernameLen = Number(usernameLen[0])
        loginP.username = login.subarray(Iid[1] + usernameLen[1], Iid[1] + usernameLen[1] + loginP.usernameLen).toString()
        const randomStrLen = decodeVarInt(login.subarray(Iid[1] + usernameLen[1] + loginP.usernameLen))
        loginP.randomStrLen = Number(randomStrLen[0])
        loginP.randomStr = login.subarray(Iid[1] + usernameLen[1] + loginP.usernameLen + randomStrLen[1], Iid[1] + usernameLen[1] + loginP.usernameLen + randomStrLen[1] + loginP.randomStrLen).toString()
        
        client.username = loginP.username
        client.uuid = genUUID(client.username)
        try { validateUsername(client.username) }
        catch (err) {
            disconnect(client, ChatColor.RED + err.message, DisconnectReason.CUSTOM)
            return
        }
        if (PROXY.players.has(client.username)) {
            disconnect(client, `Duplicate username: ${client.username}. Please connect under a different username.`, DisconnectReason.CUSTOM)
            return
        }
        PROXY.players.set(client.username, client)
        if (true) {
            const usernameLen = encodeVarInt(client.username.length), username = client.username
            const uuid = bufferizeUUID(client.uuid)
            const buff = Buffer.alloc(1 + usernameLen.length + username.length + uuid.length)
            buff.set([EaglerPacketId.LOGIN_ACK, ...usernameLen, ...Buffer.from(username), ...Buffer.from(uuid)])
            client.ws.send(buff)
            if (true) {
                const [skin, ready] = await Promise.all([awaitPacket(client.ws, EaglerPacketId.SKIN), awaitPacket(client.ws, EaglerPacketId.C_READY)])
                if (ready[0] != 0x08) {
                    logger.error(`Client [/${client.ip}:${client.remotePort}] sent an unexpected packet! Disconnecting.`)
                    disconnect(client, ChatColor.RED + "Received bad packet.", DisconnectReason.CUSTOM)
                    client.ws.close()
                    return
                }
                if (true) {
                    const skinP = {
                        id: null,
                        skinVerLen: null,
                        skinVer: null, // skin_v1
                        type: null, // CUSTOM or BUILTIN
                        skinId: null,
                        skinDimens: null,
                        skin: null
                    }
                    const Iid = decodeVarInt(skin)
                    skinP.id = Number(Iid[0])
                    const skinVerLen = decodeVarInt(skin.subarray(Iid[1]))
                    skinP.skinVerLen = Number(skinVerLen[0])
                    skinP.skinVer = skin.subarray(Iid[1] + skinVerLen[1], Iid[1] + skinVerLen[1] + skinP.skinVerLen).toString()
                    const typebuff = skin.subarray(Iid[1] + skinVerLen[1] + skinP.skinVerLen, Iid[1] + skinVerLen[1] + skinP.skinVerLen + MAGIC_BUILTIN_SKIN_BYTES.length)
                    if (typebuff.compare(Buffer.from(MAGIC_BUILTIN_SKIN_BYTES)) == 0) {
                        skinP.type = "BUILTIN"
                        skinP.skinId = Number(decodeVarInt(skin.subarray(Iid[1] + skinVerLen[1] + skinP.skinVerLen + MAGIC_BUILTIN_SKIN_BYTES.length))[0])
                    } else {
                        skinP.type = "CUSTOM"
                        const skinSqrt = decodeVarInt(skin.subarray(Iid[1] + skinVerLen[1] + skinP.skinVerLen)), dimensions = Number(skinSqrt[0]) * Number(skinSqrt[0]) * 3
                        skinP.skinDimens = dimensions
                        skinP.skin = skin.subarray(Iid[1] + skinVerLen[1] + skinP.skinVerLen + skinSqrt[1] + 16)
                        console.log(skinP.skin.length)
                        if (skinP.skin.length > 16385) {
                            disconnect(client, ChatColor.RED + "Invalid skin received!")
                            return
                        }
                        console.log(skinP.skin[skinP.skin.length - 1])
                    }
                    client.skin = {
                        type: skinP.type,
                        skinId: skinP.skinId,
                        customSkin: skinP.skin
                    }
                }

                const buff = Buffer.alloc(1)
                buff.set([EaglerPacketId.COMPLETE_HANDSHAKE])
                client.ws.send(buff)

                client.state = State.POST_HANDSHAKE

                logger.info(`Client [/${client.ip}:${client.remotePort}] authenticated as player ${client.username} (${client.uuid}) and passed handshake. Connecting!`)
                try { await loginServer(config.server.host, config.server.port, client) }
                catch (err) {
                    logger.error(`Could not connect to remote server at [/${config.server.host}:${config.server.port}]: ${err}`)
                    disconnect(client, ChatColor.RED + "Failed to connect to server. Please try again later.", DisconnectReason.CUSTOM)
                    client.state = State.DISCONNECTED
                    client.ws.close()
                    return
                }

                if (client.queuedEaglerSkinPackets.length > 0) {
                    for (const packet of client.queuedEaglerSkinPackets) {
                        processClientReqPacket(packet, client)
                    }
                }
            }
        }
    } else {
        logger.error(`Client [/${client.ip}:${client.remotePort}] sent an unexpected packet! Disconnecting.`)
        disconnect(client, ChatColor.RED + "Received bad packet", DisconnectReason.CUSTOM)
        client.ws.close()
    }
}

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
export type MotdServerLogo = Buffer

const ICON_SQRT = 64

export function generateMOTDImage(file: Buffer): Promise<MotdServerLogo> {
    return new Promise<MotdServerLogo>((res, rej) => {
        sharp(file)
            .resize(ICON_SQRT, ICON_SQRT, {
                kernel: 'nearest'
            })
            .raw({
                depth: 'uchar'
            })
            .toBuffer()
            .then(buff => {
                for (const pixel of buff) {
                    if ((pixel & 0xFFFFFF) == 0) {
                        buff[buff.indexOf(pixel)] = 0
                    }
                }
                res(buff)
            })
            .catch(rej)
    })
}

export function handleMotd(player: Partial<ProxiedPlayer>) {
    const names = []
    for (const [username, player] of PROXY.players) {
        if (names.length > 0) {
            names.push(`${ChatColor.GRAY}${ChatColor.ITALIC}(and ${PROXY.players.size - names.length} more)`)
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
            max: PROXY.config.maxPlayers,
            motd: PROXY.MOTD.motd,
            online: PROXY.players.size,
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