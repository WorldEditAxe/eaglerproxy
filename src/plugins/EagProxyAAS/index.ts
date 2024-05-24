import { config } from "./config.js";
import { createServer } from "minecraft-protocol";
import { ClientState, ConnectionState, ServerGlobals } from "./types.js";
import { handleConnect, hushConsole, sendChatComponent, setSG } from "./utils.js";
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

server.on("login", (client) => {
  const proxyPlayer = PluginManager.proxy.players.get(client.username);
  if (proxyPlayer != null) {
    const url = new URL(proxyPlayer.ws.httpRequest.url, `http${PluginManager.proxy.config.tls?.enabled ? "s" : ""}://${proxyPlayer.ws.httpRequest.headers.host}`);
    if (url.pathname == "/connect-vanilla") {
      const host = url.searchParams.get("ip"),
        port = url.searchParams.get("port"),
        type: "OFFLINE" | "ONLINE" = url.searchParams.get("authType") as any;

      if (isNaN(Number(port))) return proxyPlayer.disconnect(Enums.ChatColor.RED + "Bad port number");
      if (
        !/^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$|^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/.test(
          host
        )
      ) {
        return proxyPlayer.disconnect(Enums.ChatColor.RED + "Bad host provided");
      }

      if (type == "ONLINE") {
        const _profile = proxyPlayer.ws.httpRequest.headers["Minecraft-Profile"];
        if (!_profile) proxyPlayer.disconnect(Enums.ChatColor.RED + "Missing Minecraft-Profile header");
        let profile;
        try {
          profile = JSON.parse(_profile as string);
        } catch (err) {
          proxyPlayer.disconnect(Enums.ChatColor.RED + "Could not read Minecraft-Profile header");
        }

        logger.info(`Direct OFFLINE proxy forward connection from Eaglercraft player (${client.username}) received.`);
        proxyPlayer.on("vanillaPacket", (packet, origin) => {
          if (origin == "CLIENT" && packet.name == "chat" && (packet.params.message as string).toLowerCase().startsWith("/eag-") && !packet.cancel) {
            packet.cancel = true;
            handleCommand(proxyPlayer, packet.params.message as string);
          }
        });
        sendChatComponent(client, {
          text: `Joining server under ${profile.selectedProfile.name}/your Minecraft account's username! Run `,
          color: "aqua",
          extra: [
            {
              text: "/eag-help",
              color: "gold",
              hoverEvent: {
                action: "show_text",
                value: Enums.ChatColor.GOLD + "Click me to run this command!",
              },
              clickEvent: {
                action: "run_command",
                value: "/eag-help",
              },
            },
            {
              text: " for a list of proxy commands.",
              color: "aqua",
            },
          ],
        });
        (proxyPlayer as any)._onlineSession = {
          auth: "mojang",
          username: profile.selectedProfile.name,
          session: {
            accessToken: profile.accessToken,
            clientToken: profile.selectedProfile.id,
            selectedProfile: {
              id: profile.selectedProfile.id,
              name: profile.selectedProfile.name,
            },
          },
        };
        proxyPlayer
          .switchServers({
            host: host,
            port: Number(port),
            version: "1.8.8",
            username: profile.selectedProfile.name,
            auth: "mojang",
            keepAlive: false,
            session: {
              accessToken: profile.accessToken,
              clientToken: profile.selectedProfile.id,
              selectedProfile: {
                id: profile.selectedProfile.id,
                name: profile.selectedProfile.name,
              },
            },
            skipValidation: true,
            hideErrors: true,
          })
          .catch((err) => {
            if (!client.ended) {
              proxyPlayer.disconnect(
                Enums.ChatColor.RED +
                  `Something went wrong whilst switching servers: ${err.message}${err.code == "ENOTFOUND" ? (host.includes(":") ? `\n${Enums.ChatColor.GRAY}Suggestion: Replace the : in your IP with a space.` : "\nIs that IP valid?") : ""}`
              );
            }
          });
      } else if (type == "OFFLINE") {
        logger.info(`Direct ONLINE proxy forward connection from Eaglercraft player (${client.username}) received.`);
        logger.info(`Player ${client.username} is attempting to connect to ${host}:${port} under their Eaglercraft username (${client.username}) using offline mode!`);
        proxyPlayer.on("vanillaPacket", (packet, origin) => {
          if (origin == "CLIENT" && packet.name == "chat" && (packet.params.message as string).toLowerCase().startsWith("/eag-") && !packet.cancel) {
            packet.cancel = true;
            handleCommand(proxyPlayer, packet.params.message as string);
          }
        });

        sendChatComponent(client, {
          text: `Joining server under ${client.username}/your Eaglercraft account's username! Run `,
          color: "aqua",
          extra: [
            {
              text: "/eag-help",
              color: "gold",
              hoverEvent: {
                action: "show_text",
                value: Enums.ChatColor.GOLD + "Click me to run this command!",
              },
              clickEvent: {
                action: "run_command",
                value: "/eag-help",
              },
            },
            {
              text: " for a list of proxy commands.",
              color: "aqua",
            },
          ],
        });

        proxyPlayer
          .switchServers({
            host: host,
            port: Number(port),
            auth: "offline",
            username: client.username,
            version: "1.8.8",
            keepAlive: false,
            skipValidation: true,
            hideErrors: true,
          })
          .catch((err) => {
            if (!client.ended) {
              proxyPlayer.disconnect(
                Enums.ChatColor.RED +
                  `Something went wrong whilst switching servers: ${err.message}${err.code == "ENOTFOUND" ? (host.includes(":") ? `\n${Enums.ChatColor.GRAY}Suggestion: Replace the : in your IP with a space.` : "\nIs that IP valid?") : ""}`
              );
            }
          });
      } else {
        proxyPlayer.disconnect(Enums.ChatColor.RED + "Missing authentication type");
      }
    } else {
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
      handleConnect(cs);
    }
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
  });
}
