import { Enums } from "../Enums.js";
export class SCReadyPacket {
    packetId = Enums.PacketId.SCReadyPacket;
    type = "packet";
    boundTo = Enums.PacketBounds.C;
    sentAfterHandshake = false;
    serialize() {
        return Buffer.from([this.packetId]);
    }
    deserialize(packet) {
        return this;
    }
}
