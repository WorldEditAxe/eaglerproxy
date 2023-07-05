import metadata from "./metadata.json" assert { type: "json" };
import { createServer } from "minecraft-protocol";
import { config } from "./config.js";

const PluginManager = PLUGIN_MANAGER as any;

const Logger = PluginManager.Logger;
const Enums = PluginManager.Enums;
const Chat = PluginManager.Chat;
const Constants = PluginManager.Constants;
const Motd = PluginManager.Motd;
const Player = PluginManager.Player;
const MineProtocol = PluginManager.MineProtocol;
const EaglerSkins = PluginManager.EaglerSkins;
const Util = PluginManager.Util;

const logger = new Logger("EaglerProxyAAS");
logger.info(`Starting ${metadata.name} v${metadata.version}...`);
logger.info(
  `(internal server port: ${config.bindInternalServerPort}, internal server IP: ${config.bindInternalServerPort})`
);

logger.info("Starting internal server...");
let server = createServer({
  host: config.bindInternalServerIp,
  port: config.bindInternalServerPort,
  motdMsg: `${Enums.ChatColor.GOLD}EaglerProxy as a Service`,
  "online-mode": false,
  version: "1.8.9",
});

server.on("login", (client) => {
  logger.info(
    `Client ${client.username} has connected to the authentication server.`
  );
  client.on("end", () => {
    logger.info(
      `Client ${client.username} has disconnected from the authentication server.`
    );
  });
  client.write("kick_disconnect", {
    reason:
      Enums.ChatColor.GREEN +
      "Hi there!\n" +
      Enums.ChatColor.GOLD +
      "This server will be down for a while as I migrate the server from existing hardware to new, faster hardware.\nThis process will take approximately " +
      Enums.ChatColor.RED +
      "3-5 days" +
      Enums.ChatColor.GOLD +
      " to complete. Until then, you will be unable to connect or access the server.\n" +
      "Thank you for your understanding! :)",
  });
});

logger.info(
  "Redirecting backend server IP... (this is required for the plugin to function)"
);
CONFIG.adapter.server = {
  host: config.bindInternalServerIp,
  port: config.bindInternalServerPort,
};
CONFIG.adapter.motd = {
  l1: Enums.ChatColor.RED + "Server Under Maintenance",
};
