import { randomUUID } from "crypto";
import pkg, { NewPingResult } from "minecraft-protocol";
import sharp from "sharp";
import { PROXY_BRANDING, PROXY_VERSION } from "../meta.js";
import { Config } from "../launcher_types.js";
import { Chat } from "./Chat.js";
const { ping } = pkg;

export namespace Motd {
  const ICON_SQRT = 64;
  const IMAGE_DATA_PREPEND = "data:image/png;base64,";

  export class MOTD {
    public jsonMotd: JSONMotd;
    public image?: Buffer;

    constructor(motd: JSONMotd, image?: Buffer) {
      this.jsonMotd = motd;
      this.image = image;
    }

    public static async generateMOTDFromPing(
      host: string,
      port: number
    ): Promise<MOTD> {
      const pingRes = await ping({ host: host, port: port });
      if (typeof pingRes.version == "string")
        throw new Error("Non-1.8 server detected!");
      else {
        const newPingRes = pingRes as NewPingResult;
        let image: Buffer;

        if (newPingRes.favicon != null) {
          if (!newPingRes.favicon.startsWith(IMAGE_DATA_PREPEND))
            throw new Error("Invalid MOTD image!");
          image = await this.generateEaglerMOTDImage(
            Buffer.from(
              newPingRes.favicon.substring(IMAGE_DATA_PREPEND.length),
              "base64"
            )
          );
        }

        return new MOTD(
          {
            brand: PROXY_BRANDING,
            cracked: true,
            data: {
              cache: true,
              icon: newPingRes.favicon != null ? true : false,
              max: newPingRes.players.max,
              motd: [
                typeof newPingRes.description == "string"
                  ? newPingRes.description
                  : Chat.chatToPlainString(newPingRes.description),
                "",
              ],
              online: newPingRes.players.online,
              players:
                newPingRes.players.sample != null
                  ? newPingRes.players.sample.map((v) => v.name)
                  : [],
            },
            name: "placeholder name",
            secure: false,
            time: Date.now(),
            type: "motd",
            uuid: randomUUID(), // replace placeholder with global. cached UUID
            vers: `${PROXY_BRANDING}/${PROXY_VERSION}`,
          },
          image
        );
      }
    }

    public static async generateMOTDFromConfig(
      config: Config["adapter"]
    ): Promise<MOTD> {
      if (typeof config.motd != "string") {
        const motd = new MOTD({
          brand: PROXY_BRANDING,
          cracked: true,
          data: {
            cache: true,
            icon: config.motd.iconURL != null ? true : false,
            max: config.maxConcurrentClients,
            motd: [config.motd.l1, config.motd.l2 ?? ""],
            online: 0,
            players: [],
          },
          name: config.name,
          secure: false,
          time: Date.now(),
          type: "motd",
          uuid: randomUUID(),
          vers: `${PROXY_BRANDING}/${PROXY_VERSION}`,
        });
        if (config.motd.iconURL != null) {
          motd.image = await this.generateEaglerMOTDImage(config.motd.iconURL);
        }
        return motd;
      } else throw new Error("MOTD is set to be forwarded in the config!");
    }

    // TODO: fix not working
    public static generateEaglerMOTDImage(
      file: string | Buffer
    ): Promise<Buffer> {
      return new Promise<Buffer>((res, rej) => {
        sharp(file)
          .resize(ICON_SQRT, ICON_SQRT, {
            kernel: "nearest",
          })
          .raw({
            depth: "uchar",
          })
          .toBuffer()
          .then((buff) => {
            for (const pixel of buff) {
              if ((pixel & 0xffffff) == 0) {
                buff[buff.indexOf(pixel)] = 0;
              }
            }
            res(buff);
          })
          .catch(rej);
      });
    }

    public toBuffer(): [string, Buffer] {
      return [JSON.stringify(this.jsonMotd), this.image];
    }
  }

  export type JSONMotd = {
    brand: string;
    cracked: true;
    data: {
      cache: true;
      icon: boolean;
      max: number;
      motd: [string, string];
      online: number;
      players: string[];
    };
    name: string;
    secure: false;
    time: ReturnType<typeof Date.now>;
    type: "motd";
    uuid: ReturnType<typeof randomUUID>;
    vers: string;
  };
}
