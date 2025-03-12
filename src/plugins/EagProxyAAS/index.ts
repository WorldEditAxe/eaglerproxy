import { config } from "./config.js";
import { createServer } from "minecraft-protocol";
import { ClientState, ConnectionState, ConnectType, ServerGlobals } from "./types.js";
import { handleConnect, hushConsole, isValidIp, sendChatComponent, setSG } from "./utils.js";
import path from "path";
import { readFileSync } from "fs";
import { handleCommand } from "./commands.js";
import { registerEndpoints } from "./service/endpoints.js";

const PluginManager = PLUGIN_MANAGER;
const metadata = JSON.parse(
  readFileSync(process.platform == "win32" ? path.join(path.dirname(new URL(import.meta.url).pathname), "metadata.json").slice(1) : path.join(path.dirname(new URL(import.meta.url).pathname), "metadata.json")).toString()
);

const Logger = PluginManager.Logger;
const Enums = PluginManager.Enums;
const Chat = PluginManager.Chat;
const Constants = PluginManager.Constants;
const Motd = PluginManager.Motd;
const Player = PluginManager.Player;
const MineProtocol = PluginManager.MineProtocol;
const EaglerSkins = PluginManager.EaglerSkins;
const Util = PluginManager.Util;
hushConsole();

const logger = new Logger("EaglerProxyAAS");
logger.info(`Starting ${metadata.name} v${metadata.version}...`);
logger.info(`(internal server port: ${config.bindInternalServerPort}, internal server IP: ${config.bindInternalServerIp})`);

logger.info("Starting internal server...");
let server = createServer({
    host: config.bindInternalServerIp,
    port: config.bindInternalServerPort,
    motdMsg: `${Enums.ChatColor.GOLD}EaglerProxy as a Service`,
    "online-mode": false,
    version: "1.8.9",
  }),
  sGlobals: ServerGlobals = {
    server: server,
    players: new Map(),
  };
setSG(sGlobals);

server.on("login", async (client) => {
  const proxyPlayer = PluginManager.proxy.players.get(client.username);
  if (proxyPlayer != null) {
    const url = new URL(proxyPlayer.ws.httpRequest.url, `http${PluginManager.proxy.config.tls?.enabled ? "s" : ""}://${proxyPlayer.ws.httpRequest.headers.host}`);
    let host = url.searchParams.get("ip"),
      port = url.searchParams.get("port"),
      type = url.searchParams.get("authType") as any;
    let params: {
      ip: string;
      port: number;
      mode: ConnectType;
      session: any | null;
    } = undefined;
    if (host != undefined && url.searchParams.size > 0) {
      if (!config.allowDirectConnectEndpoints) {
        return proxyPlayer.disconnect(Enums.ChatColor.RED + "Direct connect endpoints are disabled");
      }
      if (config.disallowHypixel && /^(?:[\w-]+\.)?hypixel\.net$/.test(host)) {
        return proxyPlayer.disconnect(Enums.ChatColor.RED + "Hypixel is disabled for this proxy");
      }
      if (isNaN(Number(port)) && port != null) return proxyPlayer.disconnect(Enums.ChatColor.RED + "Bad port number");
      else if (port == null) port = "25565";
      if (!(await isValidIp(host))) {
        return proxyPlayer.disconnect(Enums.ChatColor.RED + "Bad host");
      }
      if (type != "OFFLINE" && type != "ONLINE" && type != "THEALTENING" && type != null) {
        return proxyPlayer.disconnect(Enums.ChatColor.RED + "Bad authType provided");
      } else if (type == null) type = undefined;
      type = type == undefined ? undefined : type == "OFFLINE" ? ConnectType.OFFLINE : type == "ONLINE" ? ConnectType.ONLINE : ConnectType.THEALTENING;
      let sess = undefined;
      // try {
      //   sess = JSON.parse(url.searchParams.get("session"));
      // } catch (e) {
      //   console.log(e);
      //   return proxyPlayer.disconnect(Enums.ChatColor.RED + "Bad session data provided (get a new URL?)");
      // }
      // if (sess && sess.expires_on != null && sess.expires_on < Date.now()) {
      //   return proxyPlayer.disconnect(Enums.ChatColor.RED + "Session expired (get a new URL/try reloggging?)");
      // }

      params = {
        ip: host,
        port: Number(port),
        mode: type,
        session: sess,
      };
    }

    logger.info(`Client ${client.username} has connected to the authentication server.`);
    client.on("end", () => {
      sGlobals.players.delete(client.username);
      logger.info(`Client ${client.username} has disconnected from the authentication server.`);
    });
    const cs: ClientState = {
      state: ConnectionState.AUTH,
      gameClient: client,
      token: null,
      lastStatusUpdate: null,
    };
    sGlobals.players.set(client.username, cs);
    handleConnect(cs, params);
  } else {
    logger.warn(`Proxy player object is null for ${client.username}?!`);
    client.end("Indirect connection to internal authentication server detected!");
  }
});

logger.info("Redirecting backend server IP... (this is required for the plugin to function)");
CONFIG.adapter.server = {
  host: config.bindInternalServerIp,
  port: config.bindInternalServerPort,
};
CONFIG.adapter.motd = {
  l1: Enums.ChatColor.GOLD + "EaglerProxy as a Service",
};

if (config.allowDirectConnectEndpoints) {
  PLUGIN_MANAGER.addListener("proxyFinishLoading", () => {
    registerEndpoints();
    if (config.allowDirectConnectEndpoints) {
      PluginManager.proxy.config.motd = "REALTIME";
      PluginManager.proxy.on("fetchMotd", (ws, req, result) => {
        let url = new URL(req.url, "https://bogus.lol"),
          ip = url.searchParams.get("ip"),
          port = url.searchParams.get("port");
        port = port || "25565";
        if (!config.allowCustomPorts && port != "25565") return;
        if (ip != null && !isNaN(Number(port))) {
          // check if ip is public
          result.motd = new Promise(async (res) => {
            if (await isValidIp(ip)) {
              res(await Motd.MOTD.generateMOTDFromPing(ip, Number(port), PluginManager.proxy.config.useNatives || true));
            }
            res(null);
          });
        }
      });
    }
  });
}
