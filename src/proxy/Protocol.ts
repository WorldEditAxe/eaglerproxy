import {
  encodeULEB128 as _encodeVarInt,
  decodeULEB128 as _decodeVarInt,
} from "@thi.ng/leb128";
import { Enums } from "./Enums.js";
import { Util } from "./Util.js";

// reference: https://wiki.vg/index.php?title=Protocol&oldid=7368 (id: 73)
// use https://hexed.it/ for hex analysis, dumps.ts for example dumps
// this simple wrapper only contains utilities for reading & writing VarInts and strings, which are the
// datatypes being used thus far. There may be more, but however, they will be added here as needed.

export namespace MineProtocol {
  export type ReadResult<T> = {
    value: T;
    // the new buffer, but with the bytes being read being completely removed
    // very useful when it comes to chaining
    newBuffer: Buffer;
  };

  export type UUID = string;

  export function writeVarInt(int: number): Buffer {
    return Buffer.from(_encodeVarInt(int));
  }

  export function readVarInt(
    buff: Buffer,
    offset?: number
  ): ReadResult<number> {
    buff = offset ? buff.subarray(offset) : buff;
    const read = _decodeVarInt(buff),
      len = read[1];
    return {
      // potential oversight?
      value: Number(read[0]),
      newBuffer: buff.subarray(len),
    };
  }

  export function writeString(str: string): Buffer {
    const bufferized = Buffer.from(str, "utf8"),
      len = writeVarInt(bufferized.length);
    return Buffer.concat([len, bufferized]);
  }

  export function readString(
    buff: Buffer,
    offset?: number
  ): ReadResult<string> {
    buff = offset ? buff.subarray(offset) : buff;
    const len = readVarInt(buff),
      str = len.newBuffer.subarray(0, len.value).toString("utf8");
    return {
      value: str,
      newBuffer: len.newBuffer.subarray(len.value),
    };
  }

  const _readShort = (a: number, b: number) => (a << 8) | (b << 0);

  export function readShort(buff: Buffer, offset?: number): ReadResult<number> {
    buff = offset ? buff.subarray(offset) : buff;
    return {
      value: _readShort(buff[0], buff[1]),
      newBuffer: buff.subarray(2),
    };
  }

  export function writeShort(num: number): Buffer {
    const alloc = Buffer.alloc(2);
    alloc.writeInt16BE(num);
    return alloc;
  }

  export function readUUID(buff: Buffer, offset?: number): ReadResult<string> {
    buff = offset ? buff.subarray(offset) : buff;
    return {
      value: Util.uuidBufferToString(buff.subarray(0, 16)),
      newBuffer: buff.subarray(16),
    };
  }

  export function writeUUID(uuid: string | Buffer): Buffer {
    return typeof uuid == "string" ? Util.uuidStringToBuffer(uuid) : uuid;
  }
}
