import { NETWORK_VERSION, VANILLA_PROTOCOL_VERSION } from "../../meta.js";
import { Enums } from "../Enums.js";
import Packet from "../Packet.js";
import { MineProtocol } from "../Protocol.js";

export default class CSLoginPacket implements Packet {
  packetId: Enums.PacketId = Enums.PacketId.CSLoginPacket;
  type: "packet" = "packet";
  boundTo = Enums.PacketBounds.S;
  sentAfterHandshake = false;

  networkVersion = NETWORK_VERSION;
  gameVersion = VANILLA_PROTOCOL_VERSION;
  brand: string;
  version: string;
  username: string;

  public serialize() {
    return Buffer.concat(
      [
        [Enums.PacketId.CSLoginPacket],
        [0x02],
        MineProtocol.writeShort(0x01),
        MineProtocol.writeShort(this.networkVersion),
        MineProtocol.writeShort(0x01),
        MineProtocol.writeShort(this.gameVersion),
        MineProtocol.writeString(this.brand),
        MineProtocol.writeString(this.version),
        [0x00],
        MineProtocol.writeString(this.username),
      ].map((arr) => (arr instanceof Uint8Array ? arr : Buffer.from(arr)))
    );
  }
  public deserialize(packet: Buffer) {
    if (packet[0] != this.packetId)
      throw TypeError("Invalid packet ID detected!");
    packet = packet.subarray(2);
    let fard = MineProtocol.readShort(packet);
    // Math.min used in feeble attempt at anti DoS
    let fv = Math.min(8, fard.value);
    for (let i = 0; i < fv; i++) {
      fard = MineProtocol.readShort(fard.newBuffer);
    }
    fard = MineProtocol.readShort(fard.newBuffer);
    fv = Math.min(8, fard.value);
    for (let i = 0; i < fv; i++) {
      fard = MineProtocol.readShort(fard.newBuffer);
    }
    const brand = MineProtocol.readString(fard.newBuffer),
      version = MineProtocol.readString(brand.newBuffer),
      username = MineProtocol.readString(version.newBuffer, 1);
    this.brand = brand.value;
    this.version = version.value;
    this.username = username.value;
    return this;
  }
}