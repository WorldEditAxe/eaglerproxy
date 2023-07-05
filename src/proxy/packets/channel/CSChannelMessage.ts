import { Enums } from "../../Enums.js";
import Packet from "../../Packet.js";
import { MineProtocol } from "../../Protocol.js";

export class CSChannelMessagePacket implements Packet {
  packetId: Enums.PacketId = Enums.PacketId.CSChannelMessagePacket;
  type: "packet" = "packet";
  boundTo = Enums.PacketBounds.S;
  sentAfterHandshake = true;

  readonly messageType: Enums.ChannelMessageType =
    Enums.ChannelMessageType.CLIENT;
  channel: string;
  data: Buffer;

  public serialize() {
    return Buffer.concat(
      [[this.packetId], MineProtocol.writeString(this.channel), this.data].map(
        (arr) => (arr instanceof Uint8Array ? arr : Buffer.from(arr))
      )
    );
  }

  public deserialize(packet: Buffer) {
    packet = packet.subarray(1);
    const channel = MineProtocol.readString(packet),
      data = channel.newBuffer;
    this.channel = channel.value;
    this.data = data;
    return this;
  }
}
