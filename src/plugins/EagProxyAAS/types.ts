import { Client, Server } from "minecraft-protocol";

export type ServerGlobals = {
  server: Server;
  players: Map<string, ClientState>;
};

export type ClientState = {
  state: ConnectionState;
  gameClient: Client;
  token?: string;
  lastStatusUpdate: number;
};

export enum ConnectionState {
  AUTH,
  SUCCESS,
  DISCONNECTED,
}

export enum ChatColor {
  BLACK = "§0",
  DARK_BLUE = "§1",
  DARK_GREEN = "§2",
  DARK_CYAN = "§3",
  DARK_RED = "§4",
  PURPLE = "§5",
  GOLD = "§6",
  GRAY = "§7",
  DARK_GRAY = "§8",
  BLUE = "§9",
  BRIGHT_GREEN = "§a",
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

export enum ConnectType {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE",
  THEALTENING = "THEALTENING",
}
