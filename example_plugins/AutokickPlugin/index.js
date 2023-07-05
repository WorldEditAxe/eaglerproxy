import metadata from "./metadata.json" assert { type: "json" };
import { createServer } from "minecraft-protocol";
import { config } from "./config.js";
const PluginManager = PLUGIN_MANAGER;
const Logger = PluginManager.Logger;
const Enums = PluginManager.Enums;
const Chat = PluginManager.Chat;
const Constants = PluginManager.Constants;
const Motd = PluginManager.Motd;
const Player = PluginManager.Player;
const MineProtocol = PluginManager.MineProtocol;
const EaglerSkins = PluginManager.EaglerSkins;
const Util = PluginManager.Util;
const logger = new Logger("AutoKicker");
logger.info(`Starting ${metadata.name} v${metadata.version}...`);
logger.info(`(internal server port: ${config.bindInternalServerPort}, internal server IP: ${config.bindInternalServerPort})`);
logger.info("Starting internal server...");
let server = createServer({
    host: config.bindInternalServerIp,
    port: config.bindInternalServerPort,
    motdMsg: `${Enums.ChatColor.GOLD}EaglerProxy as a Service`,
    "online-mode": false,
    version: "1.8.9",
});
server.on("login", (client) => {
    logger.info(`Client ${client.username} has connected to the dummy server.`);
    client.write("kick_disconnect", {
        reason: "NO",
    });
});
logger.info("Redirecting backend server IP... (this is required for the plugin to function)");
CONFIG.adapter.server = {
    host: config.bindInternalServerIp,
    port: config.bindInternalServerPort,
};
CONFIG.adapter.motd = {
    l1: Enums.ChatColor.RED + "Server Under Maintenance",
};
