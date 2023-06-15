import EventEmitter from "events"
import pkg, { Client, ClientOptions, createClient, states } from "minecraft-protocol"
import { WebSocket } from "ws"
import { Logger } from "../logger.js"
import { Chat } from "./Chat.js"
import { Constants } from "./Constants.js"
import { Enums } from "./Enums.js"
import Packet from "./Packet.js"
import SCDisconnectPacket from "./packets/SCDisconnectPacket.js"
import { MineProtocol } from "./Protocol.js"
import { EaglerSkins } from "./skins/EaglerSkins.js"
import { Util } from "./Util.js"
import { BungeeUtil } from "./BungeeUtil.js"

const { createSerializer, createDeserializer } = pkg

export class Player extends EventEmitter {
    public ws: WebSocket
    public username?: string
    public skin?: EaglerSkins.EaglerSkin
    public uuid?: string
    public state?: Enums.ClientState = Enums.ClientState.PRE_HANDSHAKE
    public serverConnection?: Client

    private _switchingServers: boolean = false
    private _logger: Logger
    private _alreadyConnected: boolean = false
    private _serializer: any
    private _deserializer: any
    private _kickMessage: string
    
    constructor(ws: WebSocket, playerName?: string, serverConnection?: Client) {
        super()
        this._logger = new Logger(`PlayerHandler-${playerName}`)
        this.ws = ws
        this.username = playerName
        this.serverConnection = serverConnection
        if (this.username != null) this.uuid = Util.generateUUIDFromPlayer(this.username)
        this._serializer = createSerializer({
            state: states.PLAY,
            isServer: true,
            version: "1.8.9",
            customPackets: null
        })
        this._deserializer = createDeserializer({
            state: states.PLAY,
            isServer: false,
            version: "1.8.9",
            customPackets: null
        })
        // this._serializer.pipe(this.ws)
    }

    public initListeners() {
        this.ws.on('close', () => {
            this.state = Enums.ClientState.DISCONNECTED
            if (this.serverConnection) this.serverConnection.end()
            this.emit('disconnect', this)
        })
        this.ws.on('message', (msg: Buffer) => {
            if (msg instanceof Buffer == false) return
            const decoder = PACKET_REGISTRY.get(msg[0])
            if (decoder && decoder.sentAfterHandshake) {
                if (!decoder && this.state != Enums.ClientState.POST_HANDSHAKE && msg.length >= 1) {
                    this._logger.warn(`Packet with ID 0x${Buffer.from([msg[0]]).toString('hex')} is missing a corresponding packet handler! Processing for this packet will be skipped.`)
                } else {
                    let parsed: Packet, err: boolean
                    try {
                        parsed = new decoder.class()
                        parsed.deserialize(msg)
                    } catch (err) {
                        if (this.state != Enums.ClientState.POST_HANDSHAKE) this._logger.warn(`Packet ID 0x${Buffer.from([msg[0]]).toString('hex')} failed to parse! The packet will be skipped.`)
                        err = true
                    }
                    if (!err) {
                        this.emit('proxyPacket', parsed, this)
                        return
                    }
                }
            }
        })
    }

    public write(packet: Packet) {
        this.ws.send(packet.serialize())
    }

    public async read(packetId?: Enums.PacketId, filter?: (packet: Packet) => boolean): Promise<Packet> {
        let res
        await Util.awaitPacket(this.ws, packet => {
            if ((packetId != null && packetId == packet[0]) || (packetId == null)) {
                const decoder = PACKET_REGISTRY.get(packet[0])
                if (decoder != null && decoder.packetId == packet[0] && (this.state == Enums.ClientState.PRE_HANDSHAKE || decoder.sentAfterHandshake) && decoder.boundTo == Enums.PacketBounds.S) {
                    let parsed: Packet, err = false
                    try {
                        parsed = new decoder.class()
                        parsed.deserialize(packet)
                    } catch (_err) {
                        err = true
                    }
                    if (!err) {
                        if (filter && filter(parsed)) {
                            res = parsed
                            return true
                        } else if (filter == null) {
                            res = parsed
                            return true
                        }
                    }
                }
            }
            return false
        })
        return res
    }

    public disconnect(message: Chat.Chat | string) {
        if (this.state == Enums.ClientState.POST_HANDSHAKE) {
            this.ws.send(Buffer.concat([
                [0x40],
                MineProtocol.writeString((typeof message == 'string' ? message : JSON.stringify(message)))
            ].map(arr => arr instanceof Uint8Array ? arr : Buffer.from(arr))))
            this.ws.close()
        } else {
            const packet = new SCDisconnectPacket()
            packet.reason = message
            this.ws.send(packet.serialize())
            this.ws.close()
        }
    }

    public async connect(options: ClientOptions) {
        if (this._alreadyConnected)
            throw new Error(`Invalid state: Player has already been connected to a server, and .connect() was just called. Please use switchServers() instead.`)
        this._alreadyConnected = true
        this.serverConnection = createClient(Object.assign({
            version: '1.8.9',
            keepAlive: false,
            hideErrors: false
        }, options))
        await this._bindListenersMineClient(this.serverConnection)
    }

    public async switchServers(options: ClientOptions) {
        if (!this._alreadyConnected)
            throw new Error(`Invalid state: Player hasn't already been connected to a server, and .switchServers() has been called. Please use .connect() when initially connecting to a server, and only use .switchServers() if you want to switch servers.`)
        this._switchingServers = true
        this.ws.send(this._serializer.createPacketBuffer({
            name: 'chat', 
            params: {
                message: `${Enums.ChatColor.GRAY}Switching servers...`,
                position: 1
            }
        }))
        this.ws.send(this._serializer.createPacketBuffer({
            name: 'playerlist_header', 
            params: {
                header: JSON.stringify({
                    text: ""
                }),
                footer: JSON.stringify({
                    text: ""
                })
            }
        }))
        this.serverConnection.end()
        this.serverConnection = createClient(Object.assign({
            version: '1.8.9',
            keepAlive: false,
            hideErrors: false
        }, options))
        await this._bindListenersMineClient(this.serverConnection, true)
        this.emit('switchServer', this.serverConnection, this)
    }

    private async _bindListenersMineClient(client: Client, switchingServers?: boolean) {
        return new Promise((res, rej) => {
            let stream = false, uuid
            const listener = msg => {
                if (stream) {
                    client.writeRaw(msg)
                }
            }, errListener = err => {
                if (!stream) {
                    rej(err)
                } else {
                    this.disconnect(`${Enums.ChatColor.RED}Something went wrong: ${err.stack ?? err}`)
                }
            }
            client.on('error', errListener)
            client.on('end', reason => {
                if (!this._switchingServers) this.disconnect(this._kickMessage ?? reason)
                this.ws.removeListener('message', listener)
            })
            client.once('connect', () => {
                this.emit('joinServer', client, this)
            })
            client.on('packet', (packet, meta) => {
                if (meta.name == 'kick_disconnect') {
                    let json
                    try { json = JSON.parse(packet.reason) }
                    catch {}
                    if (json != null) {
                        this._kickMessage = Chat.chatToPlainString(json)
                    } else this._kickMessage = packet.reason
                }
                if (!stream) {
                    if (switchingServers) {
                        if (meta.name == 'login' && meta.state == states.PLAY && uuid) {
                            const pckSeq = BungeeUtil.getRespawnSequence(packet, this._serializer)
                            this.ws.send(this._serializer.createPacketBuffer({
                                name: "login",
                                params: packet
                            }))
                            pckSeq.forEach(p => this.ws.send(p))
                            stream = true
                            res(null)
                        } else if (meta.name == 'success' && meta.state == states.LOGIN && !uuid) {
                            uuid = packet.uuid
                        }
                    } else {
                        if (meta.name == 'login' && meta.state == states.PLAY && uuid) {
                            this.ws.send(this._serializer.createPacketBuffer({
                                name: "login",
                                params: packet
                            }))
                            stream = true
                            res(null)
                        } else if (meta.name == 'success' && meta.state == states.LOGIN && !uuid) {
                            uuid = packet.uuid
                        }
                    }
                } else {
                    this.ws.send(this._serializer.createPacketBuffer({
                        name: meta.name,
                        params: packet
                    }))
                }
            })
            this.ws.on('message', listener)
        })
    }
}

interface PlayerEvents {
    'switchServer': (connection: Client, player: Player) => void,
    'joinServer': (connection: Client, player: Player) => void,
    // for vanilla game packets, bind to connection object instead
    'proxyPacket': (packet: Packet, player: Player) => void,
    'vanillaPacket': (packet: Packet & { cancel: boolean }, origin: 'CLIENT' | 'SERVER', player: Player) => Packet & { cancel: boolean },
    'disconnect': (player: Player) => void
}

export declare interface Player {
    on<U extends keyof PlayerEvents>(
        event: U, listener: PlayerEvents[U]
      ): this;
    
      emit<U extends keyof PlayerEvents>(
        event: U, ...args: Parameters<PlayerEvents[U]>
      ): boolean;
}