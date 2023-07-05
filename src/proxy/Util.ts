import { createHash } from "crypto";
import { encodeULEB128, decodeULEB128 } from "@thi.ng/leb128";
import { Chat } from "./Chat.js";
import { WebSocket } from "ws";
import { Enums } from "./Enums.js";
import { Player } from "./Player.js";
import * as http from "http";
import { Config } from "../launcher_types.js";
import { parseDomain, ParseResultType } from "parse-domain";
import { access, readdir } from "fs/promises";
import { resolve } from "path";

export namespace Util {
  export const encodeVarInt: typeof encodeULEB128 = encodeULEB128;
  export const decodeVarInt: typeof decodeULEB128 = decodeULEB128;

  // annotation for range
  // b = beginning, e = end
  export type Range<B, E> = number;

  export type BoundedBuffer<S extends number> = Buffer;

  const USERNAME_REGEX = /[^0-9^a-z^A-Z^_]/gi;

  export function generateUUIDFromPlayer(user: string): string {
    const str = `OfflinePlayer:${user}`;
    let md5Bytes = createHash("md5").update(str).digest();
    md5Bytes[6] &= 0x0f; /* clear version        */
    md5Bytes[6] |= 0x30; /* set to version 3     */
    md5Bytes[8] &= 0x3f; /* clear variant        */
    md5Bytes[8] |= 0x80; /* set to IETF variant  */
    return uuidBufferToString(md5Bytes);
  }

  // excerpt from uuid-buffer

  export function uuidStringToBuffer(uuid: string): Buffer {
    if (!uuid) return Buffer.alloc(16); // Return empty buffer
    const hexStr = uuid.replace(/-/g, "");
    if (uuid.length != 36 || hexStr.length != 32)
      throw new Error(`Invalid UUID string: ${uuid}`);
    return Buffer.from(hexStr, "hex");
  }

  export function uuidBufferToString(buffer: Buffer): string {
    if (buffer.length != 16)
      throw new Error(`Invalid buffer length for uuid: ${buffer.length}`);
    if (buffer.equals(Buffer.alloc(16))) return null; // If buffer is all zeros, return null
    const str = buffer.toString("hex");
    return `${str.slice(0, 8)}-${str.slice(8, 12)}-${str.slice(
      12,
      16
    )}-${str.slice(16, 20)}-${str.slice(20)}`;
  }

  export function awaitPacket(
    ws: WebSocket,
    filter?: (msg: Buffer) => boolean
  ): Promise<Buffer> {
    return new Promise<Buffer>((res, rej) => {
      let resolved = false;
      const msgCb = (msg: any) => {
        if (filter != null && filter(msg)) {
          resolved = true;
          ws.removeListener("message", msgCb);
          ws.removeListener("close", discon);
          ws.setMaxListeners(
            ws.getMaxListeners() - 2 < 0 ? 5 : ws.getMaxListeners() - 2
          );
          res(msg);
        } else if (filter == null) {
          resolved = true;
          ws.removeListener("message", msgCb);
          ws.removeListener("close", discon);
          ws.setMaxListeners(
            ws.getMaxListeners() - 2 < 0 ? 5 : ws.getMaxListeners() - 2
          );
          res(msg);
        }
      };
      const discon = () => {
        resolved = true;
        ws.removeListener("message", msgCb);
        ws.removeListener("close", discon);
        ws.setMaxListeners(
          ws.getMaxListeners() - 2 < 0 ? 5 : ws.getMaxListeners() - 2
        );
        rej("Connection closed");
      };
      ws.setMaxListeners(ws.getMaxListeners() + 2);
      ws.on("message", msgCb);
      ws.on("close", discon);
      setTimeout(() => {
        ws.removeListener("message", msgCb);
        ws.removeListener("close", discon);
        ws.setMaxListeners(
          ws.getMaxListeners() - 2 < 0 ? 5 : ws.getMaxListeners() - 2
        );
        rej("Timed out");
      }, 10000);
    });
  }

  export function validateUsername(user: string): void | never {
    if (user.length > 20) throw new Error("Username is too long!");
    if (user.length < 3) throw new Error("Username is too short!");
    if (!!user.match(USERNAME_REGEX))
      throw new Error(
        "Invalid username. Username can only contain alphanumeric characters, and the underscore (_) character."
      );
  }

  export function areDomainsEqual(d1: string, d2: string): boolean {
    if (d1.endsWith("*."))
      d1 = d1.replace(
        "*.",
        "WILDCARD-LOL-EXTRA-LONG-SUBDOMAIN-TO-LOWER-CHANCES-OF-COLLISION."
      );
    const parseResult1 = parseDomain(d1),
      parseResult2 = parseDomain(d2);
    if (
      parseResult1.type != ParseResultType.Invalid &&
      parseResult2.type != ParseResultType.Invalid
    ) {
      if (
        parseResult1.type == ParseResultType.Ip &&
        parseResult2.type == ParseResultType.Ip
      ) {
        return parseResult1.hostname == parseResult2.hostname ? true : false;
      } else if (
        parseResult1.type == ParseResultType.Listed &&
        parseResult2.type == ParseResultType.Listed
      ) {
        if (
          parseResult1.subDomains[0] ==
          "WILDCARD-LOL-EXTRA-LONG-SUBDOMAIN-TO-LOWER-CHANCES-OF-COLLISION"
        ) {
          // wildcard
          const domainPlusTld1 =
            parseResult1.domain +
            ("." + parseResult1.topLevelDomains.join("."));
          const domainPlusTld2 =
            parseResult2.domain +
            ("." + parseResult2.topLevelDomains.join("."));
          return domainPlusTld1 == domainPlusTld2 ? true : false;
        } else {
          // no wildcard
          return d1 == d2 ? true : false;
        }
      } else if (
        parseResult1.type == ParseResultType.NotListed &&
        parseResult2.type == ParseResultType.NotListed
      ) {
        if (
          parseResult1.labels[0] ==
          "WILDCARD-LOL-EXTRA-LONG-SUBDOMAIN-TO-LOWER-CHANCES-OF-COLLISION"
        ) {
          // wildcard
          const domainPlusTld1 = parseResult1.labels.slice(2).join(".");
          const domainPlusTld2 = parseResult1.labels.slice(2).join(".");
          return domainPlusTld1 == domainPlusTld2 ? true : false;
        } else {
          // no wildcard
          return d1 == d2 ? true : false;
        }
      } else if (
        parseResult1.type == ParseResultType.Reserved &&
        parseResult2.type == ParseResultType.Reserved
      ) {
        if (
          parseResult1.hostname == "" &&
          parseResult1.hostname === parseResult2.hostname
        )
          return true;
        else {
          // uncertain, fallback to exact hostname matching
          return d1 == d2 ? true : false;
        }
      }
    } else {
      return false;
    }
  }

  async function* _getFiles(dir: string) {
    const dirents = await readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
      const res = resolve(dir, dirent.name);
      if (dirent.isDirectory()) {
        yield* _getFiles(res);
      } else {
        yield res;
      }
    }
  }

  export async function recursiveFileSearch(dir: string): Promise<string[]> {
    const ents = [];
    for await (const f of _getFiles(dir)) {
      ents.push(f);
    }
    return ents;
  }

  export async function fsExists(path: string): Promise<boolean> {
    try {
      await access(path);
    } catch (err) {
      if (err.code == "ENOENT") return false;
      else return true;
    }
    return true;
  }

  export type PlayerPosition = {
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
  };

  export type PositionPacket = {
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    flags: number;
  };

  export function generatePositionPacket(
    currentPos: PlayerPosition,
    newPos: PositionPacket
  ): PositionPacket {
    const DEFAULT_RELATIVITY = 0x01; // relative to X-axis
    const newPosPacket = {
      x: newPos.x - currentPos.x * 2,
      y: newPos.y,
      z: newPos.z,
      yaw: newPos.yaw,
      pitch: newPos.pitch,
      flags: DEFAULT_RELATIVITY,
    };
    return newPosPacket;
  }
}
