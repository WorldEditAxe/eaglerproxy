import { Constants } from "../Constants.js";
import { Enums } from "../Enums.js";
import { MineProtocol } from "../Protocol.js";
import { Util } from "../Util.js";
import fetch from "node-fetch";
// TODO: convert all functions to use MineProtocol's UUID manipulation functions
export var EaglerSkins;
(function (EaglerSkins) {
    async function skinUrlFromUuid(uuid) {
        const response = (await (await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`)).json());
        const parsed = JSON.parse(Buffer.from(response.properties[0].value, "base64").toString());
        return parsed.textures.SKIN.url;
    }
    EaglerSkins.skinUrlFromUuid = skinUrlFromUuid;
    function downloadSkin(skinUrl) {
        const url = new URL(skinUrl);
        if (url.protocol != "https:" && url.protocol != "http:")
            throw new Error("Invalid skin URL protocol!");
        return new Promise(async (res, rej) => {
            const skin = await fetch(skinUrl);
            if (skin.status != 200) {
                rej({
                    url: skinUrl,
                    status: skin.status,
                });
                return;
            }
            else {
                res(Buffer.from(await skin.arrayBuffer()));
            }
        });
    }
    EaglerSkins.downloadSkin = downloadSkin;
    function safeDownloadSkin(skinUrl, backoff) {
        return new Promise((res, rej) => {
            backoff.queueTask(async (err) => {
                if (err)
                    return rej(err);
                try {
                    res(await downloadSkin(skinUrl));
                }
                catch (err) {
                    if (err.status == 429)
                        throw new Error("Ratelimited!");
                    else
                        throw new Error("Unexpected HTTP status code: " + err.status);
                }
            });
        });
    }
    EaglerSkins.safeDownloadSkin = safeDownloadSkin;
    function readClientDownloadSkinRequestPacket(message) {
        const ret = {
            id: null,
            uuid: null,
            url: null,
        };
        const id = MineProtocol.readVarInt(message), uuid = MineProtocol.readUUID(id.newBuffer), url = MineProtocol.readString(uuid.newBuffer, 1);
        ret.id = id.value;
        ret.uuid = uuid.value;
        ret.url = url.value;
        return ret;
    }
    EaglerSkins.readClientDownloadSkinRequestPacket = readClientDownloadSkinRequestPacket;
    function writeClientDownloadSkinRequestPacket(uuid, url) {
        return Buffer.concat([[Enums.EaglerSkinPacketId.CFetchSkinReq], MineProtocol.writeUUID(uuid), [0x0], MineProtocol.writeString(url)].map((arr) => (arr instanceof Uint8Array ? arr : Buffer.from(arr))));
    }
    EaglerSkins.writeClientDownloadSkinRequestPacket = writeClientDownloadSkinRequestPacket;
    function readServerFetchSkinResultBuiltInPacket(message) {
        const ret = {
            id: null,
            uuid: null,
            skinId: null,
        };
        const id = MineProtocol.readVarInt(message), uuid = MineProtocol.readUUID(id.newBuffer), skinId = MineProtocol.readVarInt(id.newBuffer.subarray(id.newBuffer.length));
        ret.id = id.value;
        ret.uuid = uuid.value;
        ret.skinId = skinId.value;
        return this;
    }
    EaglerSkins.readServerFetchSkinResultBuiltInPacket = readServerFetchSkinResultBuiltInPacket;
    function writeServerFetchSkinResultBuiltInPacket(uuid, skinId) {
        uuid = typeof uuid == "string" ? Util.uuidStringToBuffer(uuid) : uuid;
        return Buffer.concat([Buffer.from([Enums.EaglerSkinPacketId.SFetchSkinBuiltInRes]), uuid, Buffer.from([skinId >> 24, skinId >> 16, skinId >> 8, skinId & 0xff])]);
    }
    EaglerSkins.writeServerFetchSkinResultBuiltInPacket = writeServerFetchSkinResultBuiltInPacket;
    function readServerFetchSkinResultCustomPacket(message) {
        const ret = {
            id: null,
            uuid: null,
            skin: null,
        };
        const id = MineProtocol.readVarInt(message), uuid = MineProtocol.readUUID(id.newBuffer), skin = uuid.newBuffer.subarray(0, Constants.EAGLERCRAFT_SKIN_CUSTOM_LENGTH);
        ret.id = id.value;
        ret.uuid = uuid.value;
        ret.skin = skin;
        return this;
    }
    EaglerSkins.readServerFetchSkinResultCustomPacket = readServerFetchSkinResultCustomPacket;
    function writeClientFetchEaglerSkin(uuid, url) {
        uuid = typeof uuid == "string" ? Util.uuidStringToBuffer(uuid) : uuid;
        return Buffer.concat([[Enums.EaglerSkinPacketId.CFetchSkinEaglerPlayerReq], uuid, [0x00], MineProtocol.writeString(url)].map((arr) => (arr instanceof Uint8Array ? arr : Buffer.from(arr))));
    }
    EaglerSkins.writeClientFetchEaglerSkin = writeClientFetchEaglerSkin;
    function writeServerFetchSkinResultCustomPacket(uuid, skin, downloaded) {
        uuid = typeof uuid == "string" ? Util.uuidStringToBuffer(uuid) : uuid;
        return Buffer.concat([
            [Enums.EaglerSkinPacketId.SFetchSkinRes],
            uuid,
            [-1], // TODO: if buggy, use 0xff instead
            skin.subarray(0, Constants.EAGLERCRAFT_SKIN_CUSTOM_LENGTH),
        ].map((arr) => (arr instanceof Uint8Array ? arr : Buffer.from(arr))));
    }
    EaglerSkins.writeServerFetchSkinResultCustomPacket = writeServerFetchSkinResultCustomPacket;
    function readClientFetchEaglerSkinPacket(buff) {
        const ret = {
            id: null,
            uuid: null,
        };
        const id = MineProtocol.readVarInt(buff), uuid = MineProtocol.readUUID(id.newBuffer);
        ret.id = id.value;
        ret.uuid = uuid.value;
        return ret;
    }
    EaglerSkins.readClientFetchEaglerSkinPacket = readClientFetchEaglerSkinPacket;
    class EaglerSkin {
        owner;
        type;
        // update this over time
        builtInSkin;
        skin;
    }
    EaglerSkins.EaglerSkin = EaglerSkin;
})(EaglerSkins || (EaglerSkins = {}));
