import { v3 } from "uuid";
import { encodeULEB128 as encodeVarInt, decodeULEB128 as decodeVarInt, decodeSLEB128 as decodeSVarInt } from "@thi.ng/leb128";
import { DisconnectReason, EaglerPacketId, MAGIC_ENDING_IDENTIFYS_BYTES } from "./eaglerPacketDef.js";
import { Logger } from "./logger.js";
import { State } from "./types.js";
import { toBuffer } from "uuid-buffer";
import * as mc from "minecraft-protocol";
import { config } from "./config.js";
const MAGIC_UUID = "a7e774bc-7ea4-11ed-9a58-1f9e14304a59";
const logger = new Logger("LoginHandler");
const USERNAME_REGEX = /[^0-9^a-z^A-Z^_]/gi;
export function genUUID(user) {
    return v3(user, MAGIC_UUID);
}
export function bufferizeUUID(uuid) {
    return toBuffer(uuid);
}
export function validateUsername(user) {
    if (user.length > 20)
        throw new Error("Username is too long!");
    if (!!user.match(USERNAME_REGEX))
        throw new Error("Invalid username. Username can only contain alphanumeric characters, and the underscore (_) character.");
}
export function disconnect(player, message, code) {
    if (player.state == State.POST_HANDSHAKE) {
        const messageLen = encodeVarInt(message.length);
        const d = Buffer.alloc(1 + messageLen.length + message.length);
        d.set([0x40, ...messageLen, ...Buffer.from(message)]);
        player.ws.send(d);
        player.ws.close();
    }
    else {
        const messageLen = encodeVarInt(message.length), codeEnc = encodeVarInt(code !== null && code !== void 0 ? code : DisconnectReason.CUSTOM);
        const d = Buffer.alloc(1 + codeEnc.length + messageLen.length + message.length);
        d.set([0xff, ...codeEnc, ...messageLen, ...Buffer.from(message)]);
        player.ws.send(d);
        player.ws.close();
    }
}
export function awaitPacket(ws, id) {
    return new Promise((res, rej) => {
        let resolved = false;
        const msgCb = (msg) => {
            if (id != null && msg[0] == id) {
                resolved = true;
                ws.removeEventListener('message', msgCb);
                ws.removeEventListener('close', discon);
                ws.setMaxListeners(ws.getMaxListeners() - 2 < 0 ? 5 : ws.getMaxListeners() - 2);
                res(msg);
            }
            else if (id == null) {
                resolved = true;
                ws.removeEventListener('message', msgCb);
                ws.removeEventListener('close', discon);
                ws.setMaxListeners(ws.getMaxListeners() - 2 < 0 ? 5 : ws.getMaxListeners() - 2);
                res(msg);
            }
        };
        const discon = () => {
            resolved = true;
            ws.removeEventListener('message', msgCb);
            ws.removeEventListener('close', discon);
            ws.setMaxListeners(ws.getMaxListeners() - 2 < 0 ? 5 : ws.getMaxListeners() - 2);
            rej("Connection closed");
        };
        ws.setMaxListeners(ws.getMaxListeners() + 2);
        ws.on('message', msgCb);
        ws.on('close', discon);
        setTimeout(() => {
            ws.removeEventListener('message', msgCb);
            ws.removeEventListener('close', discon);
            ws.setMaxListeners(ws.getMaxListeners() - 2 < 0 ? 5 : ws.getMaxListeners() - 2);
            rej("Timed out");
        }, 10000);
    });
}
export function loginServer(ip, port, client) {
    return new Promise((res, rej) => {
        let receivedCompression = false;
        const mcClient = mc.createClient({
            host: ip,
            port: port,
            auth: 'offline',
            version: '1.8.8',
            username: client.username
        });
        mcClient.on('error', err => {
            mcClient.end();
            rej(err);
        });
        mcClient.on('end', () => {
            client.ws.close();
        });
        mcClient.on('connect', () => {
            client.remoteConnection = mcClient;
            logger.info(`Player ${client.username} has been connected to the server.`);
            res();
        });
        mcClient.on('raw', p => {
            if (p[0] == 0x03 && !receivedCompression) {
                receivedCompression = true;
                const compT = {
                    id: null,
                    thres: null
                };
                const id = decodeVarInt(p);
                compT.id = Number(id[0]);
                const thres = decodeSVarInt(p.subarray(id[1]));
                compT.thres = thres[0];
                client.compressionThreshold = compT.thres;
                client.ws.send(p);
            }
            else {
                client.ws.send(p);
            }
        });
    });
}
export async function doHandshake(client, initialPacket) {
    client.ws.on('close', () => {
        client.state = State.DISCONNECTED;
        if (client.remoteConnection) {
            client.remoteConnection.end();
        }
        PROXY.players.delete(client.username);
        PROXY.playerStats.onlineCount -= 1;
        logger.info(`Client [/${client.ip}:${client.remotePort}]${client.username ? ` (${client.username})` : ""} disconnected from the server.`);
    });
    if (PROXY.players.size + 1 > PROXY.playerStats.max) {
        disconnect(client, "The proxy is full!", DisconnectReason.CUSTOM);
        return;
    }
    const identifyC = {
        id: null,
        brandingLen: null,
        branding: null,
        verLen: null,
        ver: null
    };
    if (true) {
        // save namespace by nesting func declarations in a if true statement
        const Iid = decodeVarInt(initialPacket);
        identifyC.id = Number(Iid[0]);
        const brandingLen = decodeVarInt(initialPacket.subarray(Iid[1] + 2));
        identifyC.brandingLen = Number(brandingLen[0]);
        identifyC.branding = initialPacket.subarray(brandingLen[1] + Iid[1] + 2, brandingLen[1] + Iid[1] + Number(brandingLen[0]) + 2).toString();
        const verLen = decodeVarInt(initialPacket.subarray(brandingLen[1] + Iid[1] + Number(brandingLen[0]) + 2));
        identifyC.verLen = Number(verLen[0]);
        identifyC.ver = initialPacket.subarray(brandingLen[1] + Number(brandingLen[0]) + Iid[1] + verLen[1] + 2).toString();
    }
    if (true) {
        const brandingLen = encodeVarInt(PROXY.brand.length), brand = PROXY.brand;
        const verLen = encodeVarInt(PROXY.version.length), version = PROXY.version;
        const buff = Buffer.alloc(2 + MAGIC_ENDING_IDENTIFYS_BYTES.length + brandingLen.length + brand.length + verLen.length + version.length);
        buff.set([EaglerPacketId.IDENTIFY_SERVER, 0x01, ...brandingLen, ...Buffer.from(brand), ...verLen, ...Buffer.from(version), ...Buffer.from(MAGIC_ENDING_IDENTIFYS_BYTES)]);
        client.ws.send(buff);
    }
    client.clientBrand = identifyC.branding;
    const login = await awaitPacket(client.ws);
    const loginP = {
        id: null,
        usernameLen: null,
        username: null,
        randomStrLen: null,
        randomStr: null,
        nullByte: null
    };
    if (login[0] === EaglerPacketId.LOGIN) {
        const Iid = decodeVarInt(login);
        loginP.id = Number(Iid[0]);
        const usernameLen = decodeVarInt(login.subarray(loginP[1]));
        loginP.usernameLen = Number(usernameLen[0]);
        loginP.username = login.subarray(Iid[1] + usernameLen[1], Iid[1] + usernameLen[1] + loginP.usernameLen).toString();
        const randomStrLen = decodeVarInt(login.subarray(Iid[1] + usernameLen[1] + loginP.usernameLen));
        loginP.randomStrLen = Number(randomStrLen[0]);
        loginP.randomStr = login.subarray(Iid[1] + usernameLen[1] + loginP.usernameLen + randomStrLen[1], Iid[1] + usernameLen[1] + loginP.usernameLen + randomStrLen[1] + loginP.randomStrLen).toString();
        client.username = loginP.username;
        client.uuid = genUUID(client.username);
        try {
            validateUsername(client.username);
        }
        catch (err) {
            disconnect(client, err.message, DisconnectReason.BAD_USERNAME);
            return;
        }
        if (PROXY.players.has(client.username)) {
            disconnect(client, `Duplicate username: ${client.username}. Please connect under a different username.`, DisconnectReason.DUPLICATE_USERNAME);
            return;
        }
        PROXY.players.set(client.username, client);
        if (true) {
            const usernameLen = encodeVarInt(client.username.length), username = client.username;
            const uuidLen = encodeVarInt(client.uuid.length), uuid = client.uuid;
            const buff = Buffer.alloc(1 + usernameLen.length + username.length + uuidLen.length + uuid.length);
            buff.set([EaglerPacketId.LOGIN_ACK, ...usernameLen, ...Buffer.from(username), ...uuidLen, ...Buffer.from(uuid)]);
            client.ws.send(buff);
            if (true) {
                const [skin, ready] = await Promise.all([awaitPacket(client.ws, EaglerPacketId.SKIN), awaitPacket(client.ws, EaglerPacketId.C_READY)]);
                if (ready[0] != 0x08) {
                    logger.error(`Client [/${client.ip}:${client.remotePort}] sent an unexpected packet! Disconnecting.`);
                    disconnect(client, "Received bad packet", DisconnectReason.UNEXPECTED_PACKET);
                    client.ws.close();
                    return;
                }
                const buff = Buffer.alloc(1);
                buff.set([EaglerPacketId.COMPLETE_HANDSHAKE]);
                client.ws.send(buff);
                client.state = State.POST_HANDSHAKE;
                PROXY.playerStats.onlineCount += 1;
                logger.info(`Client [/${client.ip}:${client.remotePort}] authenticated as player "${client.username}" and passed handshake. Connecting!`);
                try {
                    await loginServer(config.server.host, config.server.port, client);
                }
                catch (err) {
                    logger.error(`Could not connect to remote server at [/${config.server.host}:${config.server.port}]: ${err}`);
                    disconnect(client, "Failed to connect to server. Please try again later.", DisconnectReason.CUSTOM);
                    client.state = State.DISCONNECTED;
                    client.ws.close();
                    return;
                }
            }
        }
    }
    else {
        logger.error(`Client [/${client.ip}:${client.remotePort}] sent an unexpected packet! Disconnecting.`);
        disconnect(client, "Received bad packet", DisconnectReason.UNEXPECTED_PACKET);
        client.ws.close();
    }
}
