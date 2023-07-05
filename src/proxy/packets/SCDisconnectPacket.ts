import { Chat } from "../Chat.js";
import { Enums } from "../Enums.js";
import Packet from "../Packet.js";
import { MineProtocol } from "../Protocol.js";

export default class SCDisconnectPacket implements Packet {
  packetId: Enums.PacketId = Enums.PacketId.SCDisconnectPacket;
  type: "packet" = "packet";
  boundTo = Enums.PacketBounds.C;
  sentAfterHandshake = false;
  static readonly REASON = 0x8;

  reason: string | Chat.Chat;

  public serialize() {
    const msg =
      typeof this.reason == "string"
        ? this.reason
        : Chat.chatToPlainString(this.reason);
    return Buffer.concat(
      [
        [0xff],
        MineProtocol.writeVarInt(SCDisconnectPacket.REASON),
        MineProtocol.writeString(" " + msg + " "),
      ].map((arr) => (arr instanceof Uint8Array ? arr : Buffer.from(arr)))
    );
  }
  public deserialize(packet: Buffer) {
    if (packet[0] != this.packetId) throw new Error("Invalid packet ID!");
    packet = packet.subarray(
      1 + MineProtocol.writeVarInt(SCDisconnectPacket.REASON).length
    );
    const reason = MineProtocol.readString(packet);
    this.reason = reason.value;
    return this;
  }
}
