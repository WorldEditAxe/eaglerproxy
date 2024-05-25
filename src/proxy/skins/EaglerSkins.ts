import { Constants } from "../Constants.js";
import { Enums } from "../Enums.js";
import { MineProtocol } from "../Protocol.js";
import { Util } from "../Util.js";
import { Player } from "../Player.js";
import fetch from "node-fetch";
import ExponentialBackoffRequestController from "../ratelimit/ExponentialBackoffRequestController.js";

// TODO: convert all functions to use MineProtocol's UUID manipulation functions

export namespace EaglerSkins {
  export type ClientFetchEaglerSkin = {
    id: Enums.EaglerSkinPacketId.CFetchSkinEaglerPlayerReq;
    uuid: string;
  };

  export type ServerFetchSkinResultBuiltIn = {
    id: Enums.EaglerSkinPacketId.SFetchSkinBuiltInRes;
    uuid: string;
    skinId: number;
  };

  export type ServerFetchSkinResultCustom = {
    id: Enums.EaglerSkinPacketId.SFetchSkinRes;
    uuid: string;
    skin: Util.BoundedBuffer<typeof Constants.EAGLERCRAFT_SKIN_CUSTOM_LENGTH>;
  };

  export type ClientDownloadSkinRequest = {
    id: Enums.EaglerSkinPacketId.CFetchSkinReq;
    uuid: string;
    url: string;
  };

  type MojangFetchProfileResponse = {
    id: string;
    name: string;
    properties: [
      {
        name: "textures";
        value: string;
        signature: string;
      }
    ];
  };

  type MojangTextureResponse = {
    timestamp: number;
    profileId: string;
    profileName: string;
    signatureRequired: boolean;
    textures: {
      SKIN: {
        url: string;
        metadata: {
          model: "slim";
        };
      };
      CAPE: {
        url: string;
      };
    };
  };

  export async function skinUrlFromUuid(uuid: string): Promise<string> {
    const response = (await (await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`)).json()) as unknown as MojangFetchProfileResponse;
    const parsed = JSON.parse(Buffer.from(response.properties[0].value, "base64").toString()) as unknown as MojangTextureResponse;
    return parsed.textures.SKIN.url;
  }

  export function downloadSkin(skinUrl: string): Promise<Buffer> {
    const url = new URL(skinUrl);
    if (url.protocol != "https:" && url.protocol != "http:") throw new Error("Invalid skin URL protocol!");
    return new Promise<Buffer>(async (res, rej) => {
      const skin = await fetch(skinUrl);
      if (skin.status != 200) {
        rej({
          url: skinUrl,
          status: skin.status,
        });
        return;
      } else {
        res(Buffer.from(await skin.arrayBuffer()));
      }
    });
  }

  export function safeDownloadSkin(skinUrl: string, backoff: ExponentialBackoffRequestController): Promise<Buffer> {
    return new Promise((res, rej) => {
      backoff.queueTask(async (err) => {
        if (err) return rej(err);
        try {
          res(await downloadSkin(skinUrl));
        } catch (err) {
          if (err.status == 429) throw new Error("Ratelimited!");
          else throw new Error("Unexpected HTTP status code: " + err.status);
        }
      });
    });
  }

  export function readClientDownloadSkinRequestPacket(message: Buffer): ClientDownloadSkinRequest {
    const ret: ClientDownloadSkinRequest = {
      id: null,
      uuid: null,
      url: null,
    };
    const id = MineProtocol.readVarInt(message),
      uuid = MineProtocol.readUUID(id.newBuffer),
      url = MineProtocol.readString(uuid.newBuffer, 1);
    ret.id = id.value;
    ret.uuid = uuid.value;
    ret.url = url.value;
    return ret;
  }

  export function writeClientDownloadSkinRequestPacket(uuid: string | Buffer, url: string): Buffer {
    return Buffer.concat([[Enums.EaglerSkinPacketId.CFetchSkinReq], MineProtocol.writeUUID(uuid), [0x0], MineProtocol.writeString(url)].map((arr) => (arr instanceof Uint8Array ? arr : Buffer.from(arr))));
  }

  export function readServerFetchSkinResultBuiltInPacket(message: Buffer): ServerFetchSkinResultBuiltIn {
    const ret: ServerFetchSkinResultBuiltIn = {
      id: null,
      uuid: null,
      skinId: null,
    };
    const id = MineProtocol.readVarInt(message),
      uuid = MineProtocol.readUUID(id.newBuffer),
      skinId = MineProtocol.readVarInt(id.newBuffer.subarray(id.newBuffer.length));
    ret.id = id.value;
    ret.uuid = uuid.value;
    ret.skinId = skinId.value;
    return this;
  }

  export function writeServerFetchSkinResultBuiltInPacket(uuid: string | Buffer, skinId: number): Buffer {
    uuid = typeof uuid == "string" ? Util.uuidStringToBuffer(uuid) : uuid;
    return Buffer.concat([Buffer.from([Enums.EaglerSkinPacketId.SFetchSkinBuiltInRes]), uuid as Buffer, Buffer.from([skinId >> 24, skinId >> 16, skinId >> 8, skinId & 0xff])]);
  }

  export function readServerFetchSkinResultCustomPacket(message: Buffer): ServerFetchSkinResultCustom {
    const ret: ServerFetchSkinResultCustom = {
      id: null,
      uuid: null,
      skin: null,
    };
    const id = MineProtocol.readVarInt(message),
      uuid = MineProtocol.readUUID(id.newBuffer),
      skin = uuid.newBuffer.subarray(0, Constants.EAGLERCRAFT_SKIN_CUSTOM_LENGTH);
    ret.id = id.value;
    ret.uuid = uuid.value;
    ret.skin = skin;
    return this;
  }

  export function writeClientFetchEaglerSkin(uuid: string | Buffer, url: string): Buffer {
    uuid = typeof uuid == "string" ? Util.uuidStringToBuffer(uuid) : uuid;
    return Buffer.concat([[Enums.EaglerSkinPacketId.CFetchSkinEaglerPlayerReq], uuid, [0x00], MineProtocol.writeString(url)].map((arr) => (arr instanceof Uint8Array ? arr : Buffer.from(arr))));
  }

  export function writeServerFetchSkinResultCustomPacket(uuid: string | Buffer, skin: Buffer, downloaded: boolean): Buffer {
    uuid = typeof uuid == "string" ? Util.uuidStringToBuffer(uuid) : uuid;
    return Buffer.concat(
      [
        [Enums.EaglerSkinPacketId.SFetchSkinRes],
        uuid,
        [-1], // TODO: if buggy, use 0xff instead
        skin.subarray(0, Constants.EAGLERCRAFT_SKIN_CUSTOM_LENGTH),
      ].map((arr) => (arr instanceof Uint8Array ? arr : Buffer.from(arr)))
    );
  }

  export function readClientFetchEaglerSkinPacket(buff: Buffer): ClientFetchEaglerSkin {
    const ret: ClientFetchEaglerSkin = {
      id: null,
      uuid: null,
    };
    const id = MineProtocol.readVarInt(buff),
      uuid = MineProtocol.readUUID(id.newBuffer);
    ret.id = id.value;
    ret.uuid = uuid.value;
    return ret;
  }

  export class EaglerSkin {
    owner: Player;
    type: Enums.SkinType;
    // update this over time
    builtInSkin?: Util.Range<0, 23>;
    skin?: Util.BoundedBuffer<typeof Constants.EAGLERCRAFT_SKIN_CUSTOM_LENGTH>;
  }
}
