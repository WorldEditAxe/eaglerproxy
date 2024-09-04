import DiskDB from "../databases/DiskDB.js";
import crypto from "crypto";
import { Logger } from "../../logger.js";
import { Constants } from "../Constants.js";
import { Enums } from "../Enums.js";
import { Util } from "../Util.js";
import { SCChannelMessagePacket } from "../packets/channel/SCChannelMessage.js";
import { EaglerSkins } from "./EaglerSkins.js";
import { ImageEditor } from "./ImageEditor.js";
import { MineProtocol } from "../Protocol.js";
import ExponentialBackoffRequestController from "../ratelimit/ExponentialBackoffRequestController.js";
export class SkinServer {
    allowedSkinDomains;
    cache;
    proxy;
    backoffController;
    usingNative;
    usingCache;
    _logger;
    deleteTask;
    lifetime;
    constructor(proxy, native, sweepInterval, cacheLifetime, cacheFolder = "./skinCache", useCache = true, allowedSkinDomains) {
        this.allowedSkinDomains = allowedSkinDomains ?? ["textures.minecraft.net"];
        if (useCache) {
            this.cache = new DiskDB(cacheFolder, (v) => exportCachedSkin(v), (b) => readCachedSkin(b), (k) => k.replaceAll("-", ""));
        }
        this.proxy = proxy ?? PROXY;
        this.usingCache = useCache;
        this.usingNative = native;
        this.lifetime = cacheLifetime;
        this.backoffController = new ExponentialBackoffRequestController();
        this._logger = new Logger("SkinServer");
        this._logger.info("Started EaglercraftX skin server.");
        if (useCache)
            this.deleteTask = setInterval(async () => await this.cache.filter((ent) => Date.now() < ent.expires), sweepInterval);
    }
    unload() {
        if (this.deleteTask != null)
            clearInterval(this.deleteTask);
    }
    async handleRequest(packet, caller, proxy) {
        if (packet.messageType == Enums.ChannelMessageType.SERVER)
            throw new Error("Server message was passed to client message handler!");
        else if (packet.channel != Constants.EAGLERCRAFT_SKIN_CHANNEL_NAME)
            throw new Error("Cannot handle non-EaglerX skin channel messages!");
        {
            const rl = proxy.ratelimit.skinsConnection.consume(caller.username), rlip = proxy.ratelimit.skinsIP.consume(caller.ws._socket.remoteAddress);
            if (!rl.success || !rlip.success)
                return;
        }
        switch (packet.data[0]) {
            default:
                throw new Error("Unknown operation!");
                break;
            case Enums.EaglerSkinPacketId.CFetchSkinEaglerPlayerReq:
                const parsedPacket_0 = EaglerSkins.readClientFetchEaglerSkinPacket(packet.data);
                const player = this.proxy.fetchUserByUUID(parsedPacket_0.uuid);
                if (player) {
                    if (player.skin.type == Enums.SkinType.BUILTIN) {
                        const response = new SCChannelMessagePacket();
                        response.channel = Constants.EAGLERCRAFT_SKIN_CHANNEL_NAME;
                        response.data = EaglerSkins.writeServerFetchSkinResultBuiltInPacket(player.uuid, player.skin.builtInSkin);
                        caller.write(response);
                    }
                    else if (player.skin.type == Enums.SkinType.CUSTOM) {
                        const response = new SCChannelMessagePacket();
                        response.channel = Constants.EAGLERCRAFT_SKIN_CHANNEL_NAME;
                        response.data = EaglerSkins.writeServerFetchSkinResultCustomPacket(player.uuid, player.skin.skin, false);
                        caller.write(response);
                    }
                    else
                        this._logger.warn(`Player ${caller.username} attempted to fetch player ${player.uuid}'s skin, but their skin hasn't loaded yet!`);
                }
                break;
            case Enums.EaglerSkinPacketId.CFetchSkinReq:
                const parsedPacket_1 = EaglerSkins.readClientDownloadSkinRequestPacket(packet.data), url = new URL(parsedPacket_1.url).hostname;
                if (!this.allowedSkinDomains.some((domain) => Util.areDomainsEqual(domain, url))) {
                    this._logger.warn(`Player ${caller.username} tried to download a skin with a disallowed domain name (${url})!`);
                    break;
                }
                try {
                    let cacheHit = null, skin = null;
                    if (this.usingCache) {
                        (cacheHit = await this.cache.get(parsedPacket_1.uuid)), (skin = cacheHit != null ? cacheHit.data : null);
                        if (!skin) {
                            const fetched = await EaglerSkins.safeDownloadSkin(parsedPacket_1.url, this.backoffController);
                            skin = fetched;
                            await this.cache.set(parsedPacket_1.uuid, {
                                uuid: parsedPacket_1.uuid,
                                expires: Date.now() + this.lifetime,
                                data: fetched,
                            });
                        }
                    }
                    else {
                        skin = await EaglerSkins.safeDownloadSkin(parsedPacket_1.url, this.backoffController);
                    }
                    const processed = this.usingNative ? await ImageEditor.toEaglerSkin(skin) : await ImageEditor.toEaglerSkinJS(skin), response = new SCChannelMessagePacket();
                    response.channel = Constants.EAGLERCRAFT_SKIN_CHANNEL_NAME;
                    response.data = EaglerSkins.writeServerFetchSkinResultCustomPacket(parsedPacket_1.uuid, processed, true);
                    caller.write(response);
                }
                catch (err) {
                    this._logger.warn(`Failed to fetch skin URL ${parsedPacket_1.url} for player ${caller.username}: ${err.stack ?? err}`);
                }
        }
    }
}
function digestMd5Hex(data) {
    return crypto.createHash("md5").update(data).digest("hex");
}
function exportCachedSkin(skin) {
    const endUuid = MineProtocol.writeString(skin.uuid), encExp = MineProtocol.writeVarLong(skin.expires), encSkin = MineProtocol.writeBinary(skin.data);
    return Buffer.concat([endUuid, encExp, encSkin]);
}
function readCachedSkin(data) {
    const readUuid = MineProtocol.readString(data), readExp = MineProtocol.readVarLong(readUuid.newBuffer), readSkin = MineProtocol.readBinary(readExp.newBuffer);
    return {
        uuid: readUuid.value,
        expires: readExp.value,
        data: readSkin.value,
    };
}
