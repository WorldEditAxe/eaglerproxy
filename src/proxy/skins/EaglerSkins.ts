import { Constants } from "../Constants.js";
import { Enums } from "../Enums.js";
import { MineProtocol } from "../Protocol.js";
import { Util } from "../Util.js";
import sharp from "sharp";
import { Proxy } from "../Proxy.js";
import { Player } from "../Player.js";
import { CSChannelMessagePacket } from "../packets/channel/CSChannelMessage.js";
import { SCChannelMessagePacket } from "../packets/channel/SCChannelMessage.js";
import { Logger } from "../../logger.js";
import fetch from "node-fetch";

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
    const response = (await (
      await fetch(
        `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`
      )
    ).json()) as unknown as MojangFetchProfileResponse;
    const parsed = JSON.parse(
      Buffer.from(response.properties[0].value, "base64").toString()
    ) as unknown as MojangTextureResponse;
    console.log(parsed.textures.SKIN.url);
    return parsed.textures.SKIN.url;
  }

  export function downloadSkin(skinUrl: string): Promise<Buffer> {
    const url = new URL(skinUrl);
    if (url.protocol != "https:" && url.protocol != "http:")
      throw new Error("Invalid skin URL protocol!");
    return new Promise<Buffer>(async (res, rej) => {
      const skin = await fetch(skinUrl);
      if (skin.status != 200) {
        rej(`Tried to fetch ${skinUrl}, got HTTP ${skin.status} instead!`);
        return;
      } else {
        res(Buffer.from(await skin.arrayBuffer()));
      }
    });
  }

  export function readClientDownloadSkinRequestPacket(
    message: Buffer
  ): ClientDownloadSkinRequest {
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

  export function writeClientDownloadSkinRequestPacket(
    uuid: string | Buffer,
    url: string
  ): Buffer {
    return Buffer.concat(
      [
        [Enums.EaglerSkinPacketId.CFetchSkinReq],
        MineProtocol.writeUUID(uuid),
        [0x0],
        MineProtocol.writeString(url),
      ].map((arr) => (arr instanceof Uint8Array ? arr : Buffer.from(arr)))
    );
  }

  export function readServerFetchSkinResultBuiltInPacket(
    message: Buffer
  ): ServerFetchSkinResultBuiltIn {
    const ret: ServerFetchSkinResultBuiltIn = {
      id: null,
      uuid: null,
      skinId: null,
    };
    const id = MineProtocol.readVarInt(message),
      uuid = MineProtocol.readUUID(id.newBuffer),
      skinId = MineProtocol.readVarInt(
        id.newBuffer.subarray(id.newBuffer.length)
      );
    ret.id = id.value;
    ret.uuid = uuid.value;
    ret.skinId = skinId.value;
    return this;
  }

  export function writeServerFetchSkinResultBuiltInPacket(
    uuid: string | Buffer,
    skinId: number
  ): Buffer {
    uuid = typeof uuid == "string" ? Util.uuidStringToBuffer(uuid) : uuid;
    console.log(1);
    return Buffer.concat([
      Buffer.from([Enums.EaglerSkinPacketId.SFetchSkinBuiltInRes]),
      uuid as Buffer,
      Buffer.from([skinId >> 24, skinId >> 16, skinId >> 8, skinId & 0xff]),
    ]);
  }

  export function readServerFetchSkinResultCustomPacket(
    message: Buffer
  ): ServerFetchSkinResultCustom {
    const ret: ServerFetchSkinResultCustom = {
      id: null,
      uuid: null,
      skin: null,
    };
    const id = MineProtocol.readVarInt(message),
      uuid = MineProtocol.readUUID(id.newBuffer),
      skin = uuid.newBuffer.subarray(
        0,
        Constants.EAGLERCRAFT_SKIN_CUSTOM_LENGTH
      );
    ret.id = id.value;
    ret.uuid = uuid.value;
    ret.skin = skin;
    return this;
  }

  // TODO: fix bug where some people are missing left arm and leg
  export function writeServerFetchSkinResultCustomPacket(
    uuid: string | Buffer,
    skin: Buffer,
    downloaded: boolean
  ): Buffer {
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

  export function readClientFetchEaglerSkinPacket(
    buff: Buffer
  ): ClientFetchEaglerSkin {
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

  export function writeClientFetchEaglerSkin(
    uuid: string | Buffer,
    url: string
  ): Buffer {
    uuid = typeof uuid == "string" ? Util.uuidStringToBuffer(uuid) : uuid;
    return Buffer.concat(
      [
        [Enums.EaglerSkinPacketId.CFetchSkinEaglerPlayerReq],
        uuid,
        [0x00],
        MineProtocol.writeString(url),
      ].map((arr) => (arr instanceof Uint8Array ? arr : Buffer.from(arr)))
    );
  }

  export async function copyRawPixels(
    imageIn: sharp.Sharp,
    imageOut: sharp.Sharp,
    dx1: number,
    dy1: number,
    dx2: number,
    dy2: number,
    sx1: number,
    sy1: number,
    sx2: number,
    sy2: number
  ): Promise<sharp.Sharp> {
    const inMeta = await imageIn.metadata(),
      outMeta = await imageOut.metadata();

    if (dx1 > dx2) {
      return _copyRawPixels(
        imageIn,
        imageOut,
        sx1,
        sy1,
        dx2,
        dy1,
        sx2 - sx1,
        sy2 - sy1,
        inMeta.width!,
        outMeta.width!,
        true
      );
    } else {
      return _copyRawPixels(
        imageIn,
        imageOut,
        sx1,
        sy1,
        dx1,
        dy1,
        sx2 - sx1,
        sy2 - sy1,
        inMeta.width!,
        outMeta.width!,
        false
      );
    }
  }

  async function _copyRawPixels(
    imageIn: sharp.Sharp,
    imageOut: sharp.Sharp,
    srcX: number,
    srcY: number,
    dstX: number,
    dstY: number,
    width: number,
    height: number,
    imgSrcWidth: number,
    imgDstWidth: number,
    flip: boolean
  ): Promise<sharp.Sharp> {
    const inData = await imageIn.raw().toBuffer();
    const outData = await imageOut.raw().toBuffer();
    const outMeta = await imageOut.metadata();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let srcIndex = (srcY + y) * imgSrcWidth + srcX + x;
        let dstIndex = (dstY + y) * imgDstWidth + dstX + x;

        if (flip) {
          srcIndex = (srcY + y) * imgSrcWidth + srcX + (width - x - 1);
        }

        for (let c = 0; c < 4; c++) {
          // Assuming RGBA channels
          outData[dstIndex * 4 + c] = inData[srcIndex * 4 + c];
        }
      }
    }

    return sharp(outData, {
      raw: {
        width: outMeta.width!,
        height: outMeta.height!,
        channels: 4,
      },
    });
  }

  export async function toEaglerSkin(
    image: Buffer
  ): Promise<
    Util.BoundedBuffer<typeof Constants.EAGLERCRAFT_SKIN_CUSTOM_LENGTH>
  > {
    const meta = await sharp(image).metadata();
    let sharpImage = sharp(image);
    if (meta.height != 64) {
      // assume 32 height skin
      let imageOut = sharp(
        await sharpImage
          .extend({ bottom: 32, background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .toBuffer()
      );

      imageOut = await copyRawPixels(
        sharpImage,
        imageOut,
        24,
        48,
        20,
        52,
        4,
        16,
        8,
        20
      );
      imageOut = await copyRawPixels(
        sharpImage,
        imageOut,
        28,
        48,
        24,
        52,
        8,
        16,
        12,
        20
      );
      imageOut = await copyRawPixels(
        sharpImage,
        imageOut,
        20,
        52,
        16,
        64,
        8,
        20,
        12,
        32
      );
      imageOut = await copyRawPixels(
        sharpImage,
        imageOut,
        24,
        52,
        20,
        64,
        4,
        20,
        8,
        32
      );
      imageOut = await copyRawPixels(
        sharpImage,
        imageOut,
        28,
        52,
        24,
        64,
        0,
        20,
        4,
        32
      );
      imageOut = await copyRawPixels(
        sharpImage,
        imageOut,
        32,
        52,
        28,
        64,
        12,
        20,
        16,
        32
      );
      imageOut = await copyRawPixels(
        sharpImage,
        imageOut,
        40,
        48,
        36,
        52,
        44,
        16,
        48,
        20
      );
      imageOut = await copyRawPixels(
        sharpImage,
        imageOut,
        44,
        48,
        40,
        52,
        48,
        16,
        52,
        20
      );
      imageOut = await copyRawPixels(
        sharpImage,
        imageOut,
        36,
        52,
        32,
        64,
        48,
        20,
        52,
        32
      );
      imageOut = await copyRawPixels(
        sharpImage,
        imageOut,
        40,
        52,
        36,
        64,
        44,
        20,
        48,
        32
      );
      imageOut = await copyRawPixels(
        sharpImage,
        imageOut,
        44,
        52,
        40,
        64,
        40,
        20,
        44,
        32
      );
      imageOut = await copyRawPixels(
        sharpImage,
        imageOut,
        48,
        52,
        44,
        64,
        52,
        20,
        56,
        32
      );

      sharpImage = imageOut;
    }

    const r = await sharpImage
      .extractChannel("red")
      .raw({ depth: "uchar" })
      .toBuffer();
    const g = await sharpImage
      .extractChannel("green")
      .raw({ depth: "uchar" })
      .toBuffer();
    const b = await sharpImage
      .extractChannel("blue")
      .raw({ depth: "uchar" })
      .toBuffer();
    const a = await sharpImage
      .ensureAlpha()
      .extractChannel(3)
      .toColorspace("b-w")
      .raw({ depth: "uchar" })
      .toBuffer();
    const newBuff = Buffer.alloc(Constants.EAGLERCRAFT_SKIN_CUSTOM_LENGTH);
    for (let i = 1; i < 64 ** 2; i++) {
      const bytePos = i * 4;
      newBuff[bytePos] = a[i];
      newBuff[bytePos + 1] = b[i];
      newBuff[bytePos + 2] = g[i];
      newBuff[bytePos + 3] = r[i];
    }
    return newBuff;
  }

  export class SkinServer {
    public allowedSkinDomains: string[];
    public proxy: Proxy;
    private _logger: Logger;

    constructor(proxy: Proxy, allowedSkinDomains?: string[]) {
      this.allowedSkinDomains = allowedSkinDomains ?? [
        "textures.minecraft.net",
      ];
      this.proxy = proxy ?? PROXY;
      this._logger = new Logger("SkinServer");
      this._logger.info("Started EaglercraftX skin server.");
    }

    public async handleRequest(packet: CSChannelMessagePacket, caller: Player) {
      if (packet.messageType == Enums.ChannelMessageType.SERVER)
        throw new Error("Server message was passed to client message handler!");
      else if (packet.channel != Constants.EAGLERCRAFT_SKIN_CHANNEL_NAME)
        throw new Error("Cannot handle non-EaglerX skin channel messages!");
      switch (packet.data[0] as Enums.EaglerSkinPacketId) {
        default:
          throw new Error("Unknown operation!");
          break;
        case Enums.EaglerSkinPacketId.CFetchSkinEaglerPlayerReq:
          const parsedPacket_0 = EaglerSkins.readClientFetchEaglerSkinPacket(
            packet.data
          );
          const player = this.proxy.fetchUserByUUID(parsedPacket_0.uuid);
          if (player) {
            if (player.skin.type == Enums.SkinType.BUILTIN) {
              const response = new SCChannelMessagePacket();
              response.channel = Constants.EAGLERCRAFT_SKIN_CHANNEL_NAME;
              response.data =
                EaglerSkins.writeServerFetchSkinResultBuiltInPacket(
                  player.uuid,
                  player.skin.builtInSkin
                );
              caller.write(response);
            } else if (player.skin.type == Enums.SkinType.CUSTOM) {
              const response = new SCChannelMessagePacket();
              response.channel = Constants.EAGLERCRAFT_SKIN_CHANNEL_NAME;
              response.data =
                EaglerSkins.writeServerFetchSkinResultCustomPacket(
                  player.uuid,
                  player.skin.skin,
                  false
                );
              caller.write(response);
            } else
              this._logger.warn(
                `Player ${caller.username} attempted to fetch player ${player.uuid}'s skin, but their skin hasn't loaded yet!`
              );
          }
          break;
        case Enums.EaglerSkinPacketId.CFetchSkinReq:
          const parsedPacket_1 =
              EaglerSkins.readClientDownloadSkinRequestPacket(packet.data),
            url = new URL(parsedPacket_1.url).hostname;
          if (
            !this.allowedSkinDomains.some((domain) =>
              Util.areDomainsEqual(domain, url)
            )
          ) {
            this._logger.warn(
              `Player ${caller.username} tried to download a skin with a disallowed domain name(${url})!`
            );
            break;
          }
          try {
            const fetched = await EaglerSkins.downloadSkin(parsedPacket_1.url),
              processed = await EaglerSkins.toEaglerSkin(fetched),
              response = new SCChannelMessagePacket();
            response.channel = Constants.EAGLERCRAFT_SKIN_CHANNEL_NAME;
            response.data = EaglerSkins.writeServerFetchSkinResultCustomPacket(
              parsedPacket_1.uuid,
              processed,
              true
            );
            caller.write(response);
          } catch (err) {
            this._logger.warn(
              `Failed to fetch skin URL ${parsedPacket_1.url} for player ${
                caller.username
              }: ${err.stack ?? err}`
            );
          }
      }
    }
  }

  export class EaglerSkin {
    owner: Player;
    type: Enums.SkinType;
    // update this over time
    builtInSkin?: Util.Range<0, 23>;
    skin?: Util.BoundedBuffer<typeof Constants.EAGLERCRAFT_SKIN_CUSTOM_LENGTH>;
  }
}
