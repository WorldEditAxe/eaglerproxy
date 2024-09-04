import { Enums } from "../Enums.js";
import { MineProtocol } from "../Protocol.js";
export class CSUsernamePacket {
    packetId = Enums.PacketId.CSUsernamePacket;
    type = "packet";
    boundTo = Enums.PacketBounds.S;
    sentAfterHandshake = false;
    username;
    static DEFAULT = "default";
    serialize() {
        return Buffer.concat([
            [this.packetId],
            MineProtocol.writeString(this.username),
            MineProtocol.writeString(CSUsernamePacket.DEFAULT),
            [0x0],
        ].map((arr) => (arr instanceof Uint8Array ? arr : Buffer.from(arr))));
    }
    deserialize(packet) {
        packet = packet.subarray(1);
        const username = MineProtocol.readString(packet);
        this.username = username.value;
        return this;
    }
}
