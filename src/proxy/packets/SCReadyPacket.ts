import { Enums } from "../Enums.js";
import Packet from "../Packet.js";

export class SCReadyPacket implements Packet {
  packetId: Enums.PacketId = Enums.PacketId.SCReadyPacket;
  type: "packet" = "packet";
  boundTo = Enums.PacketBounds.C;
  sentAfterHandshake = false;

  public serialize() {
    return Buffer.from([this.packetId]);
  }

  public deserialize(packet: Buffer) {
    return this;
  }
}
