import { Enums } from "../Enums.js";
import Packet from "../Packet.js";

export class CSReadyPacket implements Packet {
  packetId: Enums.PacketId = Enums.PacketId.CSReadyPacket;
  type: "packet" = "packet";
  boundTo = Enums.PacketBounds.S;
  sentAfterHandshake = false;

  public serialize() {
    return Buffer.from([this.packetId]);
  }

  public deserialize(packet: Buffer) {
    return this;
  }
}
