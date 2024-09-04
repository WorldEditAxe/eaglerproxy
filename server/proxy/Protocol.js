import { encodeULEB128 as _encodeVarInt, decodeULEB128 as _decodeVarInt } from "@thi.ng/leb128";
import { Util } from "./Util.js";
// reference: https://wiki.vg/index.php?title=Protocol&oldid=7368 (id: 73)
// use https://hexed.it/ for hex analysis, dumps.ts for example dumps
// this simple wrapper only contains utilities for reading & writing VarInts and strings, which are the
// datatypes being used thus far. There may be more, but however, they will be added here as needed.
export var MineProtocol;
(function (MineProtocol) {
    function writeVarInt(int) {
        return Buffer.from(_encodeVarInt(int));
    }
    MineProtocol.writeVarInt = writeVarInt;
    function readVarInt(buff, offset) {
        buff = offset ? buff.subarray(offset) : buff;
        const read = _decodeVarInt(buff), len = read[1];
        return {
            // potential oversight?
            value: Number(read[0]),
            newBuffer: buff.subarray(len),
        };
    }
    MineProtocol.readVarInt = readVarInt;
    function writeVarLong(long) {
        return writeVarInt(long);
    }
    MineProtocol.writeVarLong = writeVarLong;
    function readVarLong(buff, offset) {
        return readVarInt(buff, offset);
    }
    MineProtocol.readVarLong = readVarLong;
    function writeBinary(data) {
        return Buffer.concat([writeVarInt(data.length), data]);
    }
    MineProtocol.writeBinary = writeBinary;
    function readBinary(buff, offset) {
        buff = offset ? buff.subarray(offset) : buff;
        const len = readVarInt(buff), data = len.newBuffer.subarray(0, len.value);
        return {
            value: data,
            newBuffer: len.newBuffer.subarray(len.value),
        };
    }
    MineProtocol.readBinary = readBinary;
    function writeString(str) {
        const bufferized = Buffer.from(str, "utf8"), len = writeVarInt(bufferized.length);
        return Buffer.concat([len, bufferized]);
    }
    MineProtocol.writeString = writeString;
    function readString(buff, offset) {
        buff = offset ? buff.subarray(offset) : buff;
        const len = readVarInt(buff), str = len.newBuffer.subarray(0, len.value).toString("utf8");
        return {
            value: str,
            newBuffer: len.newBuffer.subarray(len.value),
        };
    }
    MineProtocol.readString = readString;
    const _readShort = (a, b) => (a << 8) | (b << 0);
    function readShort(buff, offset) {
        buff = offset ? buff.subarray(offset) : buff;
        return {
            value: _readShort(buff[0], buff[1]),
            newBuffer: buff.subarray(2),
        };
    }
    MineProtocol.readShort = readShort;
    function writeShort(num) {
        const alloc = Buffer.alloc(2);
        alloc.writeInt16BE(num);
        return alloc;
    }
    MineProtocol.writeShort = writeShort;
    function readUUID(buff, offset) {
        buff = offset ? buff.subarray(offset) : buff;
        return {
            value: Util.uuidBufferToString(buff.subarray(0, 16)),
            newBuffer: buff.subarray(16),
        };
    }
    MineProtocol.readUUID = readUUID;
    function writeUUID(uuid) {
        return typeof uuid == "string" ? Util.uuidStringToBuffer(uuid) : uuid;
    }
    MineProtocol.writeUUID = writeUUID;
})(MineProtocol || (MineProtocol = {}));
