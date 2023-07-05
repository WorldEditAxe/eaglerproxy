import { Proxy } from "./proxy/Proxy.js";
import Packet from "./proxy/Packet.js";
import { Config } from "./launcher_types.js";
import { PluginManager } from "./proxy/pluginLoader/PluginManager.js";

declare global {
  var CONFIG: Config;
  var PROXY: Proxy;
  var PLUGIN_MANAGER: PluginManager;
  var PACKET_REGISTRY: Map<
    number,
    Packet & {
      class: any;
    }
  >;
}
