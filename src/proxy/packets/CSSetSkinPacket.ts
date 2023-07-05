import { Constants } from "../Constants.js";
import { Enums } from "../Enums.js";
import Packet from "../Packet.js";
import { MineProtocol } from "../Protocol.js";

export class CSSetSkinPacket implements Packet {
  packetId: Enums.PacketId = Enums.PacketId.CSSetSkinPacket;
  type: "packet" = "packet";
  boundTo: Enums.PacketBounds = Enums.PacketBounds.S;
  sentAfterHandshake: boolean = false;

  version: string | "skin_v1" = "skin_v1";
  skinType: Omit<Enums.SkinType, "NOT_LOADED">;
  skinDimensions?: number;
  skin?: Buffer;
  skinId?: number;

  public serialize() {
    if (this.skinType == Enums.SkinType.BUILTIN) {
      return Buffer.concat([
        Buffer.from([this.packetId]),
        MineProtocol.writeString(this.version),
        MineProtocol.writeVarInt(this.skinDimensions),
        this.skin,
      ]);
    } else {
      return Buffer.concat(
        [
          [this.packetId],
          MineProtocol.writeString(this.version),
          Constants.MAGIC_ENDING_CLIENT_UPLOAD_SKIN_BUILTIN,
          [this.skinId],
        ].map((arr) => (arr instanceof Uint8Array ? arr : Buffer.from(arr)))
      );
    }
  }

  public deserialize(packet: Buffer) {
    packet = packet.subarray(1);
    const version = MineProtocol.readString(packet);
    let skinType: Enums.SkinType;
    if (
      !Constants.MAGIC_ENDING_CLIENT_UPLOAD_SKIN_BUILTIN.some(
        (byte, index) => byte !== version.newBuffer[index]
      )
    ) {
      // built in
      skinType = Enums.SkinType.BUILTIN;
      const id = MineProtocol.readVarInt(
        version.newBuffer.subarray(
          Constants.MAGIC_ENDING_CLIENT_UPLOAD_SKIN_BUILTIN.length
        )
      );
      this.version = version.value;
      this.skinType = skinType;
      this.skinId = id.value;
      return this;
    } else {
      // custom
      skinType = Enums.SkinType.CUSTOM;
      const dimensions = MineProtocol.readVarInt(version.newBuffer),
        skin = dimensions.newBuffer.subarray(3).subarray(0, 16384);
      this.version = version.value;
      this.skinType = skinType;
      this.skinDimensions = dimensions.value;
      this.skin = skin;
      return this;
    }
  }
}
