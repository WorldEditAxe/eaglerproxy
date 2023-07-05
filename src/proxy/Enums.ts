export namespace Enums {
  export enum PacketId {
    CSLoginPacket = 0x01,
    SCIdentifyPacket = 0x02,
    SCDisconnectPacket = 0xff,
    SCChannelMessagePacket = 0x3f,
    CSChannelMessagePacket = 0x17,
    CSUsernamePacket = 0x04,
    SCSyncUuidPacket = 0x05,
    CSSetSkinPacket = 0x07,
    CSReadyPacket = 0x08,
    SCReadyPacket = 0x09,
  }

  export enum ChannelMessageType {
    CLIENT = 0x17,
    SERVER = 0x3f,
  }

  export enum EaglerSkinPacketId {
    CFetchSkinEaglerPlayerReq = 0x03,
    SFetchSkinBuiltInRes = 0x04,
    SFetchSkinRes = 0x05,
    CFetchSkinReq = 0x06,
  }

  export enum ClientState {
    PRE_HANDSHAKE = "PRE_HANDSHAKE",
    POST_HANDSHAKE = "POST_HANDSHAKE",
    DISCONNECTED = "DISCONNECTED",
  }

  export enum PacketBounds {
    C = "C",
    S = "S",
  }

  export enum SkinType {
    BUILTIN,
    CUSTOM,
  }

  export enum ChatColor {
    AQUA = "§b",
    BLACK = "§0",
    DARK_BLUE = "§1",
    DARK_GREEN = "§2",
    DARK_CYAN = "§3",
    DARK_RED = "§4",
    PURPLE = "§5",
    GOLD = "§6",
    GRAY = "§7",
    GREEN = "§a",
    DARK_GRAY = "§8",
    BLUE = "§9",
    BRIGHT_GREEN = "§a",
    LIGHT_PURPLE = "§d",
    CYAN = "§b",
    RED = "§c",
    PINK = "§d",
    YELLOW = "§e",
    WHITE = "§f",
    // text styling
    OBFUSCATED = "§k",
    BOLD = "§l",
    STRIKETHROUGH = "§m",
    UNDERLINED = "§n",
    ITALIC = "§o",
    RESET = "§r",
  }
}
