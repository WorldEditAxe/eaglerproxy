import { Stats } from "fs";
import * as fs from "fs/promises";
import * as pathUtil from "path";
import * as semver from "semver";
import { EventEmitter } from "events";
import { pathToFileURL } from "url";
import { Logger } from "../../logger.js";
import { PROXY_VERSION } from "../../meta.js";
import { Proxy } from "../Proxy.js";
import { Util } from "../Util.js";
import { PluginLoaderTypes } from "./PluginLoaderTypes.js";
import { Enums } from "../Enums.js";
import { Chat } from "../Chat.js";
import { Constants } from "../Constants.js";
import { Motd } from "../Motd.js";
import { Player } from "../Player.js";
import { MineProtocol } from "../Protocol.js";
import { EaglerSkins } from "../skins/EaglerSkins.js";
import { BungeeUtil } from "../BungeeUtil.js";

export class PluginManager extends EventEmitter {
  public plugins: Map<
    string,
    { exports: any; metadata: PluginLoaderTypes.PluginMetadataPathed }
  >;
  public proxy: Proxy;

  public Logger: typeof Logger = Logger;
  public Enums: typeof Enums = Enums;
  public Chat: typeof Chat = Chat;
  public Constants: typeof Constants = Constants;
  public Motd: typeof Motd = Motd;
  public Player: typeof Player = Player;
  public MineProtocol: typeof MineProtocol = MineProtocol;
  public EaglerSkins: typeof EaglerSkins = EaglerSkins;
  public Util: typeof Util = Util;
  public BungeeUtil: typeof BungeeUtil = BungeeUtil;

  private _loadDir: string;
  private _logger: Logger;

  constructor(loadDir: string) {
    super();
    this.setMaxListeners(0);
    this._loadDir = loadDir;
    this.plugins = new Map();
    this.Logger = Logger;
    this._logger = new this.Logger("PluginManager");
  }

  public async loadPlugins() {
    this._logger.info("Loading plugin metadata files...");
    const pluginMeta = await this._findPlugins(this._loadDir);
    await this._validatePluginList(pluginMeta);

    let pluginsString = "";
    for (const [id, plugin] of pluginMeta) {
      pluginsString += `${id}@${plugin.version}`;
    }
    pluginsString = pluginsString.substring(0, pluginsString.length - 1);
    this._logger.info(`Found ${pluginMeta.size} plugin(s): ${pluginsString}`);
    if(pluginMeta.size !== 0){
      this._logger.info(`Loading ${pluginMeta.size} plugin(s)...`);
      const successLoadCount = await this._loadPlugins(
        pluginMeta,
        this._getLoadOrder(pluginMeta)
      );
      this._logger.info(`Successfully loaded ${successLoadCount} plugin(s).`);
    }
    this.emit("pluginsFinishLoading", this);
  }

  private async _findPlugins(
    dir: string
  ): Promise<Map<string, PluginLoaderTypes.PluginMetadataPathed>> {
    const ret: Map<string, PluginLoaderTypes.PluginMetadataPathed> = new Map();
    const lsRes = (await Promise.all(
      (await fs.readdir(dir))
        .filter((ent) => !ent.endsWith(".disabled"))
        .map(async (res) => [
          pathUtil.join(dir, res),
          await fs.stat(pathUtil.join(dir, res)),
        ])
    )) as [string, Stats][];
    for (const [path, details] of lsRes) {
      if (details.isFile()) {
        if (path.endsWith(".jar")) {
          this._logger.warn(`Non-EaglerProxy plugin found! (${path})`);
          this._logger.warn(
            `BungeeCord plugins are NOT supported! Only custom EaglerProxy plugins are allowed.`
          );
        } else if (path.endsWith(".zip")) {
          this._logger.warn(`.zip file found in plugin directory! (${path})`);
          this._logger.warn(
            `A .zip file was found in the plugins directory! Perhaps you forgot to unzip it?`
          );
        } else
          this._logger.debug(`Skipping file found in plugin folder: ${path}`);
      } else {
        const metadataPath = pathUtil.resolve(
          pathUtil.join(path, "metadata.json")
        );
        let metadata: PluginLoaderTypes.PluginMetadata;
        try {
          const file = await fs.readFile(metadataPath);
          metadata = JSON.parse(file.toString());
          // do some type checking
          if (typeof metadata.name != "string")
            throw new TypeError(
              "<metadata>.name is either null or not of a string type!"
            );
          if (typeof metadata.id != "string")
            throw new TypeError(
              "<metadata>.id is either null or not of a string type!"
            );
          if (/ /gm.test(metadata.id))
            throw new Error(`<metadata>.id contains whitespace!`);
          if (!semver.valid(metadata.version))
            throw new Error(
              "<metadata>.version is either null, not a string, or is not a valid SemVer!"
            );
          if (typeof metadata.entry_point != "string")
            throw new TypeError(
              "<metadata>.entry_point is either null or not a string!"
            );
          if (!metadata.entry_point.endsWith(".js"))
            throw new Error(
              `<metadata>.entry_point (${metadata.entry_point}) references a non-JavaScript file!`
            );
          if (
            !(await Util.fsExists(pathUtil.resolve(path, metadata.entry_point)))
          )
            throw new Error(
              `<metadata>.entry_point (${metadata.entry_point}) references a non-existent file!`
            );
          if (metadata.requirements instanceof Array == false)
            throw new TypeError(
              "<metadata>.requirements is either null or not an array!"
            );
          for (const requirement of metadata.requirements as PluginLoaderTypes.PluginMetadata["requirements"]) {
            if (typeof requirement != "object" || requirement == null)
              throw new TypeError(
                `<metadata>.requirements[${(
                  metadata.requirements as any
                ).indexOf(requirement)}] is either null or not an object!`
              );
            if (typeof requirement.id != "string")
              throw new TypeError(
                `<metadata>.requirements[${(
                  metadata.requirements as any
                ).indexOf(requirement)}].id is either null or not a string!`
              );
            if (/ /gm.test(requirement.id))
              throw new TypeError(
                `<metadata>.requirements[${(
                  metadata.requirements as any
                ).indexOf(requirement)}].id contains whitespace!`
              );
            if (
              semver.validRange(requirement.version) == null &&
              requirement.version != "any"
            )
              throw new TypeError(
                `<metadata>.requirements[${(
                  metadata.requirements as any
                ).indexOf(
                  requirement
                )}].version is either null or not a valid SemVer!`
              );
          }
          if (metadata.load_after instanceof Array == false)
            throw new TypeError(
              "<metadata>.load_after is either null or not an array!"
            );
          for (const loadReq of metadata.load_after as string[]) {
            if (typeof loadReq != "string")
              throw new TypeError(
                `<metadata>.load_after[${(metadata.load_after as any).indexOf(
                  loadReq
                )}] is either null, or not a valid ID!`
              );
            if (/ /gm.test(loadReq))
              throw new TypeError(
                `<metadata>.load_after[${(metadata.load_after as any).indexOf(
                  loadReq
                )}] contains whitespace!`
              );
          }
          if (metadata.incompatibilities instanceof Array == false)
            throw new TypeError(
              "<metadata>.incompatibilities is either null or not an array!"
            );
          for (const incompatibility of metadata.incompatibilities as PluginLoaderTypes.PluginMetadata["requirements"]) {
            if (typeof incompatibility != "object" || incompatibility == null)
              throw new TypeError(
                `<metadata>.incompatibilities[${(
                  metadata.load_after as any
                ).indexOf(incompatibility)}] is either null or not an object!`
              );
            if (typeof incompatibility.id != "string")
              throw new TypeError(
                `<metadata>.incompatibilities[${(
                  metadata.load_after as any
                ).indexOf(incompatibility)}].id is either null or not a string!`
              );
            if (/ /gm.test(incompatibility.id))
              throw new TypeError(
                `<metadata>.incompatibilities[${(
                  metadata.load_after as any
                ).indexOf(incompatibility)}].id contains whitespace!`
              );
            if (semver.validRange(incompatibility.version) == null)
              throw new TypeError(
                `<metadata>.incompatibilities[${(
                  metadata.load_after as any
                ).indexOf(
                  incompatibility
                )}].version is either null or not a valid SemVer!`
              );
          }
          if (ret.has(metadata.id))
            throw new Error(
              `Duplicate plugin ID detected: ${metadata.id}. Are there duplicate plugins in the plugin folder?`
            );
          ret.set(metadata.id, {
            path: pathUtil.resolve(path),
            ...metadata,
          });
        } catch (err) {
          this._logger.warn(
            `Failed to load plugin metadata file at ${metadataPath}: ${
              err.stack ?? err
            }`
          );
          this._logger.warn("This plugin will skip loading due to an error.");
        }
      }
    }
    return ret;
  }

  private async _validatePluginList(
    plugins: Map<string, PluginLoaderTypes.PluginMetadataPathed>
  ) {
    for (const [id, plugin] of plugins) {
      for (const req of plugin.requirements) {
        if (
          !plugins.has(req.id) &&
          req.id != "eaglerproxy" &&
          !req.id.startsWith("module:")
        ) {
          this._logger.fatal(
            `Error whilst loading plugins: Plugin ${plugin.name}@${plugin.version} requires plugin ${req.id}@${req.version}, but it is not found!`
          );
          this._logger.fatal("Loading has halted due to missing dependencies.");
          process.exit(1);
        }
        if (req.id == "eaglerproxy") {
          if (
            !semver.satisfies(PROXY_VERSION, req.version) &&
            req.version != "any"
          ) {
            this._logger.fatal(
              `Error whilst loading plugins: Plugin ${plugin.name}@${plugin.version} requires a proxy version that satisfies the SemVer requirement ${req.version}, but the proxy version is ${PROXY_VERSION} and does not satisfy the SemVer requirement!`
            );
            this._logger.fatal("Loading has halted due to dependency issues.");
            process.exit(1);
          }
        } else if (req.id.startsWith("module:")) {
          const moduleName = req.id.replace("module:", "");
          try {
            await import(moduleName);
          } catch (err) {
            if (err.code == "ERR_MODULE_NOT_FOUND") {
              this._logger.fatal(
                `Plugin ${plugin.name}@${
                  plugin.version
                } requires NPM module ${moduleName}${
                  req.version == "any" ? "" : `@${req.version}`
                } to be installed, but it is not found!`
              );
              this._logger.fatal(
                `Please install this missing package by running "npm install ${moduleName}${
                  req.version == "any" ? "" : `@${req.version}`
                }". If you're using yarn, run "yarn add ${moduleName}${
                  req.version == "any" ? "" : `@${req.version}`
                }" instead.`
              );
              this._logger.fatal(
                "Loading has halted due to dependency issues."
              );
              process.exit(1);
            }
          }
        } else {
          let dep = plugins.get(req.id);
          if (
            !semver.satisfies(dep.version, req.version) &&
            req.version != "any"
          ) {
            this._logger.fatal(
              `Error whilst loading plugins: Plugin ${plugin.name}@${plugin.version} requires a version of plugin ${dep.name} that satisfies the SemVer requirement ${req.version}, but the plugin ${dep.name}'s version is ${dep.version} and does not satisfy the SemVer requirement!`
            );
            this._logger.fatal("Loading has halted due to dependency issues.");
            process.exit(1);
          }
        }
      }
      plugin.incompatibilities.forEach((incomp) => {
        const plugin_incomp = plugins.get(incomp.id);
        if (plugin_incomp) {
          if (semver.satisfies(plugin_incomp.version, incomp.version)) {
            this._logger.fatal(
              `Error whilst loading plugins: Plugin incompatibility found! Plugin ${plugin.name}@${plugin.version} is incompatible with ${plugin_incomp.name}@${plugin_incomp.version} as it satisfies the SemVer requirement of ${incomp.version}!`
            );
            this._logger.fatal(
              "Loading has halted due to plugin incompatibility issues."
            );
            process.exit(1);
          }
        } else if (incomp.id == "eaglerproxy") {
          if (semver.satisfies(PROXY_VERSION, incomp.version)) {
            this._logger.fatal(
              `Error whilst loading plugins: Plugin ${plugin.name}@${plugin.version} is incompatible with proxy version ${PROXY_VERSION} as it satisfies the SemVer requirement of ${incomp.version}!`
            );
            this._logger.fatal(
              "Loading has halted due to plugin incompatibility issues."
            );
            process.exit(1);
          }
        }
      });
    }
  }

  private _getLoadOrder(
    plugins: Map<string, PluginLoaderTypes.PluginMetadataPathed>
  ): PluginLoaderTypes.PluginLoadOrder {
    let order = [],
      lastPlugin: any;
    plugins.forEach((v) => order.push(v.id));
    for (const [id, plugin] of plugins) {
      const load = plugin.load_after.filter((dep) => plugins.has(dep));
      if (load.length < 0) {
        order.push(plugin.id);
      } else {
        let mostLastIndexFittingDeps = -1;
        for (const loadEnt of load) {
          if (loadEnt != lastPlugin) {
            if (order.indexOf(loadEnt) + 1 > mostLastIndexFittingDeps) {
              mostLastIndexFittingDeps = order.indexOf(loadEnt) + 1;
            }
          }
        }
        if (mostLastIndexFittingDeps != -1) {
          order.splice(order.indexOf(plugin.id), 1);
          order.splice(mostLastIndexFittingDeps - 1, 0, plugin.id);
          lastPlugin = plugin;
        }
      }
    }
    return order;
  }

  private async _loadPlugins(
    plugins: Map<string, PluginLoaderTypes.PluginMetadataPathed>,
    order: PluginLoaderTypes.PluginLoadOrder
  ): Promise<number> {
    let successCount = 0;
    for (const id of order) {
      let pluginMeta = plugins.get(id);
      try {
        const imp = await import(
          process.platform == "win32"
            ? pathToFileURL(
                pathUtil.join(pluginMeta.path, pluginMeta.entry_point)
              ).toString()
            : pathUtil.join(pluginMeta.path, pluginMeta.entry_point)
        );
        this.plugins.set(pluginMeta.id, {
          exports: imp,
          metadata: pluginMeta,
        });
        successCount++;
        this.emit("pluginLoad", pluginMeta.id, imp);
      } catch (err) {
        this._logger.warn(
          `Failed to load plugin entry point for plugin (${
            pluginMeta.name
          }) at ${pluginMeta.path}: ${err.stack ?? err}`
        );
        this._logger.warn("This plugin will skip loading due to an error.");
      }
      return successCount;
    }
  }
}

interface PluginManagerEvents {
  pluginLoad: (name: string, plugin: any) => void;
  pluginsFinishLoading: (manager: PluginManager) => void;
  proxyFinishLoading: (proxy: Proxy, manager: PluginManager) => void;
}

export declare interface PluginManager {
  on<U extends keyof PluginManagerEvents>(
    event: U,
    listener: PluginManagerEvents[U]
  ): this;

  emit<U extends keyof PluginManagerEvents>(
    event: U,
    ...args: Parameters<PluginManagerEvents[U]>
  ): boolean;

  once<U extends keyof PluginManagerEvents>(
    event: U,
    listener: PluginManagerEvents[U]
  ): this;
}
