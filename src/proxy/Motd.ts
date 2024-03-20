import { randomUUID } from "crypto";
import pkg, { NewPingResult } from "minecraft-protocol";
import { PROXY_BRANDING, PROXY_VERSION } from "../meta.js";
import { Config } from "../launcher_types.js";
import { Chat } from "./Chat.js";
import { Constants } from "./Constants.js";
import { ImageEditor } from "./skins/ImageEditor.js";
const { ping } = pkg;

export namespace Motd {
  export class MOTD {
    public jsonMotd: JSONMotd;
    public image?: Buffer;
    public usingNatives: boolean;

    constructor(motd: JSONMotd, native: boolean, image?: Buffer) {
      this.jsonMotd = motd;
      this.image = image;
      this.usingNatives = native;
    }

    public static async generateMOTDFromPing(host: string, port: number, useNatives: boolean): Promise<MOTD> {
      const pingRes = await ping({ host: host, port: port });
      if (typeof pingRes.version == "string") throw new Error("Non-1.8 server detected!");
      else {
        const newPingRes = pingRes as NewPingResult;
        let image: Buffer;

        if (newPingRes.favicon != null) {
          if (!newPingRes.favicon.startsWith(Constants.IMAGE_DATA_PREPEND)) throw new Error("Invalid MOTD image!");
          image = useNatives
            ? await ImageEditor.generateEaglerMOTDImage(Buffer.from(newPingRes.favicon.substring(Constants.IMAGE_DATA_PREPEND.length), "base64"))
            : await ImageEditor.generateEaglerMOTDImageJS(Buffer.from(newPingRes.favicon.substring(Constants.IMAGE_DATA_PREPEND.length), "base64"));
        }

        return new MOTD(
          {
            brand: PROXY_BRANDING,
            cracked: true,
            data: {
              cache: true,
              icon: newPingRes.favicon != null ? true : false,
              max: newPingRes.players.max,
              motd: [typeof newPingRes.description == "string" ? newPingRes.description : Chat.chatToPlainString(newPingRes.description), ""],
              online: newPingRes.players.online,
              players: newPingRes.players.sample != null ? newPingRes.players.sample.map((v) => v.name) : [],
            },
            name: "placeholder name",
            secure: false,
            time: Date.now(),
            type: "motd",
            uuid: randomUUID(), // replace placeholder with global. cached UUID
            vers: `${PROXY_BRANDING}/${PROXY_VERSION}`,
          },
          useNatives,
          image
        );
      }
    }

    public static async generateMOTDFromConfig(config: Config["adapter"], useNatives: boolean): Promise<MOTD> {
      if (typeof config.motd != "string") {
        const motd = new MOTD(
          {
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
          },
          useNatives
        );
        if (config.motd.iconURL != null) {
          motd.image = useNatives ? await ImageEditor.generateEaglerMOTDImage(config.motd.iconURL) : await ImageEditor.generateEaglerMOTDImageJS(config.motd.iconURL); // TODO: swap between native and pure JS
        }
        return motd;
      } else throw new Error("MOTD is set to be forwarded in the config!");
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
