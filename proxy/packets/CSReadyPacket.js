import { Enums } from "../Enums.js";
export class CSReadyPacket {
    packetId = Enums.PacketId.CSReadyPacket;
    type = "packet";
    boundTo = Enums.PacketBounds.S;
    sentAfterHandshake = false;
    serialize() {
        return Buffer.from([this.packetId]);
    }
    deserialize(packet) {
        return this;
    }
}
