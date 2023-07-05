import { Enums } from "../Enums.js";
import Packet from "../Packet.js";
import { MineProtocol } from "../Protocol.js";

export class CSUsernamePacket implements Packet {
  packetId: Enums.PacketId = Enums.PacketId.CSUsernamePacket;
  type: "packet" = "packet";
  boundTo = Enums.PacketBounds.S;
  sentAfterHandshake = false;

  username: string;
  static readonly DEFAULT = "default";

  public serialize() {
    return Buffer.concat(
      [
        [this.packetId],
        MineProtocol.writeString(this.username),
        MineProtocol.writeString(CSUsernamePacket.DEFAULT),
        [0x0],
      ].map((arr) => (arr instanceof Uint8Array ? arr : Buffer.from(arr)))
    );
  }

  public deserialize(packet: Buffer) {
    packet = packet.subarray(1);
    const username = MineProtocol.readString(packet);
    this.username = username.value;
    return this;
  }
}
