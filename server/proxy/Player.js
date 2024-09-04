import EventEmitter from "events";
import pkg, { createClient, states } from "minecraft-protocol";
import { Logger } from "../logger.js";
import { Chat } from "./Chat.js";
import { Enums } from "./Enums.js";
import SCDisconnectPacket from "./packets/SCDisconnectPacket.js";
import { MineProtocol } from "./Protocol.js";
import { Util } from "./Util.js";
import { BungeeUtil } from "./BungeeUtil.js";
const { createSerializer, createDeserializer } = pkg;
export class Player extends EventEmitter {
    ws;
    username;
    skin;
    uuid;
    state = Enums.ClientState.PRE_HANDSHAKE;
    serverConnection;
    _switchingServers = false;
    _logger;
    _alreadyConnected = false;
    translator;
    serverSerializer;
    clientSerializer;
    serverDeserializer;
    clientDeserializer;
    _kickMessage;
    constructor(ws, playerName, serverConnection) {
        super();
        this._logger = new Logger(`PlayerHandler-${playerName}`);
        this.ws = ws;
        this.username = playerName;
        this.serverConnection = serverConnection;
        if (this.username != null)
            this.uuid = Util.generateUUIDFromPlayer(this.username);
        this.serverSerializer = createSerializer({
            state: states.PLAY,
            isServer: true,
            version: "1.8.9",
            customPackets: null,
        });
        this.clientSerializer = createSerializer({
            state: states.PLAY,
            isServer: false,
            version: "1.8.9",
            customPackets: null,
        });
        this.serverDeserializer = createDeserializer({
            state: states.PLAY,
            isServer: true,
            version: "1.8.9",
            customPackets: null,
        });
        this.clientDeserializer = createSerializer({
            state: states.PLAY,
            isServer: true,
            version: "1.8.9",
            customPackets: null,
        });
    }
    initListeners() {
        this.ws.on("close", () => {
            this.state = Enums.ClientState.DISCONNECTED;
            if (this.serverConnection)
                this.serverConnection.end();
            this.emit("disconnect", this);
        });
        this.ws.on("message", (msg) => {
            if (msg instanceof Buffer == false)
                return;
            const decoder = PACKET_REGISTRY.get(msg[0]);
            if (decoder && decoder.sentAfterHandshake) {
                if (!decoder && this.state != Enums.ClientState.POST_HANDSHAKE && msg.length >= 1) {
                    this._logger.warn(`Packet with ID 0x${Buffer.from([msg[0]]).toString("hex")} is missing a corresponding packet handler! Processing for this packet will be skipped.`);
                }
                else {
                    let parsed, err;
                    try {
                        parsed = new decoder.class();
                        parsed.deserialize(msg);
                    }
                    catch (err) {
                        if (this.state != Enums.ClientState.POST_HANDSHAKE)
                            this._logger.warn(`Packet ID 0x${Buffer.from([msg[0]]).toString("hex")} failed to parse! The packet will be skipped.`);
                        err = true;
                    }
                    if (!err) {
                        this.emit("proxyPacket", parsed, this);
                        return;
                    }
                }
            }
            else {
                try {
                    const parsed = this.serverDeserializer.parsePacketBuffer(msg)?.data, translated = this.translator.translatePacketClient(parsed.params, parsed), packetData = {
                        name: translated[0],
                        params: translated[1],
                        cancel: false,
                    };
                    this.emit("vanillaPacket", packetData, "CLIENT", this);
                    if (!packetData.cancel) {
                        this._sendPacketToServer(this.clientSerializer.createPacketBuffer({
                            name: packetData.name,
                            params: packetData.params,
                        }));
                    }
                }
                catch (err) {
                    this._logger.debug(`Client ${this.username} sent an unrecognized packet that could not be parsed!\n${err.stack ?? err}`);
                }
            }
        });
    }
    write(packet) {
        this.ws.send(packet.serialize());
    }
    async read(packetId, filter) {
        let res;
        await Util.awaitPacket(this.ws, (packet) => {
            if ((packetId != null && packetId == packet[0]) || packetId == null) {
                const decoder = PACKET_REGISTRY.get(packet[0]);
                if (decoder != null && decoder.packetId == packet[0] && (this.state == Enums.ClientState.PRE_HANDSHAKE || decoder.sentAfterHandshake) && decoder.boundTo == Enums.PacketBounds.S) {
                    let parsed, err = false;
                    try {
                        parsed = new decoder.class();
                        parsed.deserialize(packet);
                    }
                    catch (_err) {
                        err = true;
                    }
                    if (!err) {
                        if (filter && filter(parsed)) {
                            res = parsed;
                            return true;
                        }
                        else if (filter == null) {
                            res = parsed;
                            return true;
                        }
                    }
                }
            }
            return false;
        });
        return res;
    }
    disconnect(message) {
        if (this.state == Enums.ClientState.POST_HANDSHAKE) {
            this.ws.send(Buffer.concat([[0x40], MineProtocol.writeString(typeof message == "string" ? message : JSON.stringify(message))].map((arr) => (arr instanceof Uint8Array ? arr : Buffer.from(arr)))));
            this.ws.close();
        }
        else {
            const packet = new SCDisconnectPacket();
            packet.reason = message;
            this.ws.send(packet.serialize());
            this.ws.close();
        }
    }
    async connect(options) {
        if (this._alreadyConnected)
            throw new Error(`Invalid state: Player has already been connected to a server, and .connect() was just called. Please use switchServers() instead.`);
        this._alreadyConnected = true;
        this.serverConnection = createClient(Object.assign({
            version: "1.8.9",
            keepAlive: false,
            hideErrors: false,
        }, options));
        await this._bindListenersMineClient(this.serverConnection);
    }
    switchServers(options) {
        if (!this._alreadyConnected)
            throw new Error(`Invalid state: Player hasn't already been connected to a server, and .switchServers() has been called. Please use .connect() when initially connecting to a server, and only use .switchServers() if you want to switch servers.`);
        return new Promise(async (res, rej) => {
            const oldConnection = this.serverConnection;
            this._switchingServers = true;
            this.ws.send(this.serverSerializer.createPacketBuffer({
                name: "chat",
                params: {
                    message: `${Enums.ChatColor.GRAY}Switching servers...`,
                    position: 1,
                },
            }));
            this.ws.send(this.serverSerializer.createPacketBuffer({
                name: "playerlist_header",
                params: {
                    header: JSON.stringify({
                        text: "",
                    }),
                    footer: JSON.stringify({
                        text: "",
                    }),
                },
            }));
            this.serverConnection = createClient(Object.assign({
                version: "1.8.9",
                keepAlive: false,
                hideErrors: false,
            }, options));
            await this._bindListenersMineClient(this.serverConnection, true, () => oldConnection.end())
                .then(() => {
                this.emit("switchServer", this.serverConnection, this);
                res();
            })
                .catch((err) => {
                this.serverConnection = oldConnection;
                rej(err);
            });
        });
    }
    async _bindListenersMineClient(client, switchingServers, onSwitch) {
        return new Promise((res, rej) => {
            let stream = false, uuid;
            const listener = (msg) => {
                if (stream) {
                    client.writeRaw(msg);
                }
            }, errListener = (err) => {
                if (!stream) {
                    rej(err);
                }
                else {
                    this.disconnect(`${Enums.ChatColor.RED}Something went wrong: ${err.stack ?? err}`);
                }
            };
            setTimeout(() => {
                if (!stream && this.state != Enums.ClientState.DISCONNECTED) {
                    client.end("Timed out waiting for server connection.");
                    this.disconnect(Enums.ChatColor.RED + "Timed out waiting for server connection!");
                    throw new Error("Timed out waiting for server connection!");
                }
            }, 30000);
            client.on("error", errListener);
            client.on("end", (reason) => {
                if (!this._switchingServers && !switchingServers) {
                    this.disconnect(this._kickMessage ?? reason);
                }
                this.ws.removeListener("message", listener);
            });
            client.once("connect", () => {
                this.emit("joinServer", client, this);
            });
            client.on("packet", (packet, meta) => {
                if (meta.name == "kick_disconnect") {
                    let json;
                    try {
                        json = JSON.parse(packet.reason);
                    }
                    catch { }
                    if (json != null) {
                        this._kickMessage = Chat.chatToPlainString(json);
                    }
                    else
                        this._kickMessage = packet.reason;
                    this._switchingServers = false;
                    this.disconnect(this._kickMessage);
                }
                else if (meta.name == "disconnect") {
                    let json;
                    try {
                        json = JSON.parse(packet.reason);
                    }
                    catch { }
                    if (json != null) {
                        this._kickMessage = Chat.chatToPlainString(json);
                    }
                    else
                        this._kickMessage = packet.reason;
                    this._switchingServers = false;
                    this.disconnect(this._kickMessage);
                }
                if (!stream) {
                    if (switchingServers) {
                        if (meta.name == "login" && meta.state == states.PLAY && uuid) {
                            this.translator = new BungeeUtil.PacketUUIDTranslator(client.uuid, this.uuid);
                            const pckSeq = BungeeUtil.getRespawnSequence(packet, this.serverSerializer);
                            this.ws.send(this.serverSerializer.createPacketBuffer({
                                name: "login",
                                params: packet,
                            }));
                            pckSeq.forEach((p) => this.ws.send(p));
                            stream = true;
                            if (onSwitch)
                                onSwitch();
                            res(null);
                        }
                        else if (meta.name == "success" && meta.state == states.LOGIN && !uuid) {
                            uuid = packet.uuid;
                        }
                    }
                    else {
                        if (meta.name == "login" && meta.state == states.PLAY && uuid) {
                            this.translator = new BungeeUtil.PacketUUIDTranslator(client.uuid, this.uuid);
                            this.ws.send(this.serverSerializer.createPacketBuffer({
                                name: "login",
                                params: packet,
                            }));
                            stream = true;
                            if (onSwitch)
                                onSwitch();
                            res(null);
                        }
                        else if (meta.name == "success" && meta.state == states.LOGIN && !uuid) {
                            uuid = packet.uuid;
                        }
                    }
                }
                else {
                    const translated = this.translator.translatePacketServer(packet, meta), eventData = {
                        name: translated[0],
                        params: translated[1],
                        cancel: false,
                    };
                    this.emit("vanillaPacket", eventData, "SERVER", this);
                    if (!eventData.cancel) {
                        this.ws.send(this.serverSerializer.createPacketBuffer({
                            name: eventData.name,
                            params: eventData.params,
                        }));
                    }
                }
            });
            this._sendPacketToServer = listener;
        });
    }
}
