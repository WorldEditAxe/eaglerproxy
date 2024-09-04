import { NETWORK_VERSION, VANILLA_PROTOCOL_VERSION } from "../../meta.js";
import { Enums } from "../Enums.js";
import { MineProtocol } from "../Protocol.js";
export default class CSLoginPacket {
    packetId = Enums.PacketId.CSLoginPacket;
    type = "packet";
    boundTo = Enums.PacketBounds.S;
    sentAfterHandshake = false;
    networkVersion = NETWORK_VERSION;
    gameVersion = VANILLA_PROTOCOL_VERSION;
    brand;
    version;
    username;
    _getMagicSeq() {
        return Buffer.concat([
            [0x02, 0x00, 0x02, 0x00, 0x02, 0x00],
            [this.networkVersion],
            [0x00, 0x01, 0x00],
            [this.gameVersion],
        ].map((arr) => Buffer.from(arr)));
    }
    serialize() {
        return Buffer.concat([
            [Enums.PacketId.CSLoginPacket],
            this._getMagicSeq(),
            MineProtocol.writeString(this.brand),
            MineProtocol.writeString(this.version),
            [0x00],
            MineProtocol.writeString(this.username),
        ].map((arr) => (arr instanceof Uint8Array ? arr : Buffer.from(arr))));
    }
    deserialize(packet) {
        if (packet[0] != this.packetId)
            throw TypeError("Invalid packet ID detected!");
        packet = packet.subarray(1 + this._getMagicSeq().length);
        const brand = MineProtocol.readString(packet), version = MineProtocol.readString(brand.newBuffer), username = MineProtocol.readString(version.newBuffer, 1);
        this.brand = brand.value;
        this.version = version.value;
        this.username = username.value;
        return this;
    }
}
