import * as dotenv from "dotenv";
import process from "process";
import { Proxy } from "./proxy/Proxy.js";
import { config } from "./config.js";
dotenv.config();
import { Logger } from "./logger.js";
import { PROXY_BRANDING } from "./meta.js";
import { PluginManager } from "./proxy/pluginLoader/PluginManager.js";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const logger = new Logger("Launcher");
let proxy: Proxy;

global.CONFIG = config;

logger.info("Loading plugins...");
const pluginManager = new PluginManager(
  join(dirname(fileURLToPath(import.meta.url)), "plugins")
);
global.PLUGIN_MANAGER = pluginManager;
await pluginManager.loadPlugins();

proxy = new Proxy(config.adapter, pluginManager);
pluginManager.proxy = proxy;

logger.info(`Launching ${PROXY_BRANDING}...`);
await proxy.init();
global.PROXY = proxy;
