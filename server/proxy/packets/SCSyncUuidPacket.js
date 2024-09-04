import { Enums } from "../Enums.js";
import { MineProtocol } from "../Protocol.js";
import { Util } from "../Util.js";
export class SCSyncUuidPacket {
    packetId = Enums.PacketId.SCSyncUuidPacket;
    type = "packet";
    boundTo = Enums.PacketBounds.C;
    sentAfterHandshake = false;
    username;
    uuid;
    serialize() {
        return Buffer.concat([
            [this.packetId],
            MineProtocol.writeString(this.username),
            Util.uuidStringToBuffer(this.uuid),
        ].map((arr) => (arr instanceof Uint8Array ? arr : Buffer.from(arr))));
    }
    deserialize(packet) {
        packet = packet.subarray(1);
        const username = MineProtocol.readString(packet), uuid = username.newBuffer.subarray(0, 15);
        this.username = username.value;
        this.uuid = Util.uuidBufferToString(uuid);
        return this;
    }
}
