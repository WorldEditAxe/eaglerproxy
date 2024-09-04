import { Enums } from "../../Enums.js";
import { MineProtocol } from "../../Protocol.js";
export class SCChannelMessagePacket {
    packetId = Enums.PacketId.SCChannelMessagePacket;
    type = "packet";
    boundTo = Enums.PacketBounds.C;
    sentAfterHandshake = true;
    messageType = Enums.ChannelMessageType.SERVER;
    channel;
    data;
    serialize() {
        return Buffer.concat([[this.packetId], MineProtocol.writeString(this.channel), this.data].map((arr) => (arr instanceof Uint8Array ? arr : Buffer.from(arr))));
    }
    deserialize(packet) {
        packet = packet.subarray(1);
        const channel = MineProtocol.readString(packet), data = channel.newBuffer;
        this.channel = channel.value;
        this.data = data;
        return this;
    }
}
