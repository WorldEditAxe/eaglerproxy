import { Logger } from "../logger.js";
import mcp, { states } from "minecraft-protocol";

const { createSerializer, createDeserializer } = mcp;

export namespace BungeeUtil {
  export class PacketUUIDTranslator {
    public serverSidePlayerUUID: string;
    public clientSidePlayerUUID: string;

    static readonly CAST_UUID_SERVER: string[] = [
      "update_attributes",
      "named_entity_spawn",
      // drop this packet (twitch.tv integration not available anymore)
      "player_info",
    ];
    static readonly CAST_UUID_CLIENT: string[] = ["spectate"];

    private _logger: Logger;

    constructor(ssPlayerUUID: string, csPlayerUUID: string) {
      this.serverSidePlayerUUID = ssPlayerUUID;
      this.clientSidePlayerUUID = csPlayerUUID;
      this._logger = new Logger("PacketTranslator");
    }

    public translatePacketClient(packet: any, meta: any): [string, object] {
      if (meta.name == "spectate") {
        if (packet.target == this.clientSidePlayerUUID) {
          packet.target = this.serverSidePlayerUUID;
        } else if (packet.target == this.serverSidePlayerUUID) {
          packet.target = this.clientSidePlayerUUID;
        }
      }
      return [meta.name, packet];
    }

    public translatePacketServer(packet: any, meta: any): [string, object] {
      if (meta.name == "update_attributes") {
        for (const prop of packet.properties) {
          for (const modifier of prop.modifiers) {
            if (modifier.uuid == this.serverSidePlayerUUID) {
              modifier.uuid = this.clientSidePlayerUUID;
            } else if (modifier.uuid == this.clientSidePlayerUUID) {
              modifier.uuid = this.serverSidePlayerUUID;
            }
          }
        }
      } else if (meta.name == "named_entity_spawn") {
        if (packet.playerUUID == this.serverSidePlayerUUID) {
          packet.playerUUID = this.clientSidePlayerUUID;
        } else if (packet.playerUUID == this.clientSidePlayerUUID) {
          packet.playerUUID = this.serverSidePlayerUUID;
        }
      } else if (meta.name == "player_info") {
        for (const player of packet.data) {
          if (player.UUID == this.serverSidePlayerUUID) {
            player.UUID = this.clientSidePlayerUUID;
          } else if (player.UUID == this.clientSidePlayerUUID) {
            player.UUID = this.serverSidePlayerUUID;
          }
        }
      }
      return [meta.name, packet];
    }
  }

  export function getRespawnSequence(
    login: any,
    serializer: any
  ): [Buffer, Buffer] {
    const dimset = getDimSets(login.dimension);
    return [
      serializer.createPacketBuffer({
        name: "respawn",
        params: {
          dimension: dimset[0],
          difficulty: login.difficulty,
          gamemode: login.gameMode,
          levelType: login.levelType,
        },
      }),
      serializer.createPacketBuffer({
        name: "respawn",
        params: {
          dimension: dimset[1],
          difficulty: login.difficulty,
          gamemode: login.gameMode,
          levelType: login.levelType,
        },
      }),
    ];
  }

  function getDimSets(loginDim: number): [number, number] {
    return [
      loginDim == -1 ? 0 : loginDim == 0 ? -1 : loginDim == 1 ? 0 : 0,
      loginDim,
    ];
  }
}
