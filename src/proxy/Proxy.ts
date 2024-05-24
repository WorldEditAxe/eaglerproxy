import { WebSocket, WebSocketServer } from "ws";
import { Config } from "../launcher_types.js";
import { Logger } from "../logger.js";
import Packet, { loadPackets } from "./Packet.js";
import * as http from "http";
import * as https from "https";
import { readFile } from "fs/promises";
import { Duplex } from "stream";
import { parseDomain, ParseResultType } from "parse-domain";
import { Util } from "./Util.js";
import CSLoginPacket from "./packets/CSLoginPacket.js";
import SCIdentifyPacket from "./packets/SCIdentifyPacket.js";
import { Motd } from "./Motd.js";
import { Player } from "./Player.js";
import { Enums } from "./Enums.js";
import { NETWORK_VERSION, PROXY_BRANDING, PROXY_VERSION, VANILLA_PROTOCOL_VERSION } from "../meta.js";
import { CSUsernamePacket } from "./packets/CSUsernamePacket.js";
import { SCSyncUuidPacket } from "./packets/SCSyncUuidPacket.js";
import { SCReadyPacket } from "./packets/SCReadyPacket.js";
import { Chalk } from "chalk";
import EventEmitter from "events";
import { MineProtocol } from "./Protocol.js";
import { EaglerSkins } from "./skins/EaglerSkins.js";
import { CSSetSkinPacket } from "./packets/CSSetSkinPacket.js";
import { CSChannelMessagePacket } from "./packets/channel/CSChannelMessage.js";
import { Constants, UPGRADE_REQUIRED_RESPONSE } from "./Constants.js";
import { PluginManager } from "./pluginLoader/PluginManager.js";
import ProxyRatelimitManager from "./ratelimit/ProxyRatelimitManager.js";
import { SkinServer } from "./skins/SkinServer.js";

let instanceCount = 0;
const chalk = new Chalk({ level: 2 });

export class Proxy extends EventEmitter {
  public packetRegistry: Map<
    number,
    Packet & {
      class: any;
    }
  >;
  public players = new Map<string, Player>();
  public pluginManager: PluginManager;
  public config: Config["adapter"];
  public wsServer: WebSocketServer;
  public httpServer: http.Server;
  public skinServer: SkinServer;
  public broadcastMotd?: Motd.MOTD;
  public ratelimit: ProxyRatelimitManager;

  private _logger: Logger;
  private initalHandlerLogger: Logger;

  private loaded: boolean;

  constructor(config: Config["adapter"], pluginManager: PluginManager) {
    super();
    this._logger = new Logger(`EaglerProxy-${instanceCount}`);
    this.initalHandlerLogger = new Logger(`EaglerProxy-InitialHandler`);
    // hijack the initial handler logger to append [InitialHandler] to the beginning
    (this.initalHandlerLogger as any)._info = this.initalHandlerLogger.info;
    this.initalHandlerLogger.info = (msg: string) => {
      (this.initalHandlerLogger as any)._info(`${chalk.blue("[InitialHandler]")} ${msg}`);
    };
    (this.initalHandlerLogger as any)._warn = this.initalHandlerLogger.warn;
    this.initalHandlerLogger.warn = (msg: string) => {
      (this.initalHandlerLogger as any)._warn(`${chalk.blue("[InitialHandler]")} ${msg}`);
    };
    (this.initalHandlerLogger as any)._error = this.initalHandlerLogger.error;
    this.initalHandlerLogger.error = (msg: string) => {
      (this.initalHandlerLogger as any)._error(`${chalk.blue("[InitialHandler]")} ${msg}`);
    };
    (this.initalHandlerLogger as any)._fatal = this.initalHandlerLogger.fatal;
    this.initalHandlerLogger.fatal = (msg: string) => {
      (this.initalHandlerLogger as any)._fatal(`${chalk.blue("[InitialHandler]")} ${msg}`);
    };
    (this.initalHandlerLogger as any)._debug = this.initalHandlerLogger.debug;
    this.initalHandlerLogger.debug = (msg: string) => {
      (this.initalHandlerLogger as any)._debug(`${chalk.blue("[InitialHandler]")} ${msg}`);
    };
    this.config = config;
    this.pluginManager = pluginManager;
    instanceCount++;

    process.on("uncaughtException", (err) => {
      this._logger.warn(`An uncaught exception was caught! Error: ${err.stack}`);
    });

    process.on("unhandledRejection", (err) => {
      this._logger.warn(`An unhandled rejection was caught! Rejection: ${(err as Error).stack || err}`);
    });
  }

  public async init() {
    this._logger.info(`Starting ${PROXY_BRANDING} v${PROXY_VERSION}...`);
    global.PROXY = this;
    if (this.loaded) throw new Error("Can't initiate if proxy instance is already initialized or is being initialized!");
    this.loaded = true;
    this.packetRegistry = await loadPackets();
    this.skinServer = new SkinServer(
      this,
      this.config.useNatives,
      this.config.skinServer.cache.skinCachePruneInterval,
      this.config.skinServer.cache.skinCacheLifetime,
      this.config.skinServer.cache.folderName,
      this.config.skinServer.cache.useCache,
      this.config.skinServer.skinUrlWhitelist
    );
    global.PACKET_REGISTRY = this.packetRegistry;
    if (this.config.motd == "FORWARD") {
      this._pollServer(this.config.server.host, this.config.server.port);
    } else {
      const broadcastMOTD = await Motd.MOTD.generateMOTDFromConfig(this.config, this.config.useNatives);
      (broadcastMOTD as any)._static = true;
      this.broadcastMotd = broadcastMOTD;
      // playercount will be dynamically updated
    }
    if (this.config.tls && this.config.tls.enabled) {
      this.httpServer = https
        .createServer(
          {
            key: await readFile(this.config.tls.key),
            cert: await readFile(this.config.tls.cert),
          },
          (req, res) => this._handleNonWSRequest(req, res, this.config)
        )
        .listen(this.config.bindPort || 8080, this.config.bindHost || "127.0.0.1");
      this.wsServer = new WebSocketServer({
        noServer: true,
      });
    } else {
      this.httpServer = http.createServer((req, res) => this._handleNonWSRequest(req, res, this.config)).listen(this.config.bindPort || 8080, this.config.bindHost || "127.0.0.1");
      this.wsServer = new WebSocketServer({
        noServer: true,
      });
    }
    this.httpServer.on("error", (err) => {
      this._logger.warn(`HTTP server threw an error: ${err.stack}`);
    });
    this.wsServer.on("error", (err) => {
      this._logger.warn(`WebSocket server threw an error: ${err.stack}`);
    });
    this.httpServer.on("upgrade", async (r, s, h) => {
      try {
        await this._handleWSConnectionReq(r, s, h);
      } catch (err) {
        this._logger.error(`Error was caught whilst trying to handle WebSocket upgrade! Error: ${err.stack ?? err}`);
      }
    });
    process.on("beforeExit", () => {
      this._logger.info("Cleaning up before exiting...");
      this.players.forEach((plr) => plr.disconnect(Enums.ChatColor.YELLOW + "Proxy is shutting down."));
    });
    this.ratelimit = new ProxyRatelimitManager(this.config.ratelimits);
    this.pluginManager.emit("proxyFinishLoading", this, this.pluginManager);
    this._logger.info(`Started WebSocket server and binded to ${this.config.bindHost} on port ${this.config.bindPort}.`);
  }

  private _handleNonWSRequest(req: http.IncomingMessage, res: http.ServerResponse, config: Config["adapter"]) {
    if (this.ratelimit.http.consume(req.socket.remoteAddress).success) {
      const ctx: Util.Handlable = { handled: false };
      this.emit("httpConnection", req, res, ctx);
      if (!ctx.handled) res.setHeader("Content-Type", "text/html").writeHead(426).end(UPGRADE_REQUIRED_RESPONSE);
    }
  }

  readonly LOGIN_TIMEOUT = 30000;

  private async _handleWSConnection(ws: WebSocket, req: http.IncomingMessage) {
    const rl = this.ratelimit.ws.consume(req.socket.remoteAddress);
    if (!rl.success) {
      return ws.close();
    }

    const ctx: Util.Handlable = { handled: false };
    await this.emit("wsConnection", ws, req, ctx);
    if (ctx.handled) return;

    const firstPacket = await Util.awaitPacket(ws);
    let player: Player, handled: boolean;
    setTimeout(() => {
      if (!handled) {
        this.initalHandlerLogger.warn(
          `Disconnecting client ${
            player ? player.username ?? `[/${(ws as any)._socket.remoteAddress}:${(ws as any)._socket.remotePort}` : `[/${(ws as any)._socket.remoteAddress}:${(ws as any)._socket.remotePort}`
          } due to connection timing out.`
        );
        if (player) player.disconnect(`${Enums.ChatColor.YELLOW} Your connection timed out whilst processing handshake, please try again.`);
        else ws.close();
      }
    }, this.LOGIN_TIMEOUT);
    try {
      if (firstPacket.toString() === "Accept: MOTD") {
        if (!this.ratelimit.motd.consume(req.socket.remoteAddress).success) {
          return ws.close();
        }
        if (this.broadcastMotd) {
          if ((this.broadcastMotd as any)._static) {
            this.broadcastMotd.jsonMotd.data.online = this.players.size;
            // sample for players
            this.broadcastMotd.jsonMotd.data.players = [];
            const playerSample = [...this.players.keys()].filter((sample) => !sample.startsWith("!phs_")).slice(0, 5);
            this.broadcastMotd.jsonMotd.data.players = playerSample;
            if (this.players.size - playerSample.length > 0) this.broadcastMotd.jsonMotd.data.players.push(`${Enums.ChatColor.GRAY}${Enums.ChatColor.ITALIC}(and ${this.players.size - playerSample.length} more)`);

            const bufferized = this.broadcastMotd.toBuffer();
            ws.send(bufferized[0]);
            if (bufferized[1] != null) ws.send(bufferized[1]);
          } else {
            const motd = this.broadcastMotd.toBuffer();
            ws.send(motd[0]);
            if (motd[1] != null) ws.send(motd[1]);
          }
        }
        handled = true;
        ws.close();
      } else {
        (ws as any).httpRequest = req;
        player = new Player(ws as any);
        const rl = this.ratelimit.connect.consume(req.socket.remoteAddress);
        if (!rl.success) {
          handled = true;
          player.disconnect(`${Enums.ChatColor.RED}You have been ratelimited!\nTry again in ${Enums.ChatColor.WHITE}${rl.retryIn / 1000}${Enums.ChatColor.RED} seconds`);
          return;
        }

        const loginPacket = new CSLoginPacket().deserialize(firstPacket);
        player.state = Enums.ClientState.PRE_HANDSHAKE;
        if (loginPacket.gameVersion != VANILLA_PROTOCOL_VERSION) {
          player.disconnect(`${Enums.ChatColor.RED}Please connect to this proxy on EaglercraftX 1.8.9.`);
          return;
        } else if (loginPacket.networkVersion != NETWORK_VERSION) {
          player.disconnect(`${Enums.ChatColor.RED}Your EaglercraftX version is too ${loginPacket.networkVersion > NETWORK_VERSION ? "new" : "old"}! Please ${loginPacket.networkVersion > NETWORK_VERSION ? "downgrade" : "update"}.`);
          return;
        }
        try {
          Util.validateUsername(loginPacket.username);
        } catch (err) {
          player.disconnect(`${Enums.ChatColor.RED}${err.reason || err}`);
          return;
        }
        player.username = loginPacket.username;
        player.uuid = Util.generateUUIDFromPlayer(player.username);
        if (this.players.size > this.config.maxConcurrentClients) {
          player.disconnect(`${Enums.ChatColor.YELLOW}Proxy is full! Please try again later.`);
          return;
        } else if (this.players.get(player.username) != null || this.players.get(`!phs.${player.uuid}`) != null) {
          player.disconnect(`${Enums.ChatColor.YELLOW}Someone under your username (${player.username}) is already connected to the proxy!`);
          return;
        }
        this.players.set(`!phs.${player.uuid}`, player);
        this._logger.info(
          `Player ${loginPacket.username} (${Util.generateUUIDFromPlayer(loginPacket.username)}) running ${loginPacket.brand}/${loginPacket.version} (net ver: ${loginPacket.networkVersion}, game ver: ${
            loginPacket.gameVersion
          }) is attempting to connect!`
        );
        player.write(new SCIdentifyPacket());
        const usernamePacket: CSUsernamePacket = (await player.read(Enums.PacketId.CSUsernamePacket)) as any;
        if (usernamePacket.username !== player.username) {
          player.disconnect(`${Enums.ChatColor.YELLOW}Failed to complete handshake. Your game version may be too old or too new.`);
          return;
        }
        const syncUuid = new SCSyncUuidPacket();
        syncUuid.username = player.username;
        syncUuid.uuid = player.uuid;
        player.write(syncUuid);

        const prom = await Promise.all([player.read(Enums.PacketId.CSReadyPacket), (await player.read(Enums.PacketId.CSSetSkinPacket)) as CSSetSkinPacket]),
          skin = prom[1],
          obj = new EaglerSkins.EaglerSkin();
        obj.owner = player;
        obj.type = skin.skinType as any;
        if (skin.skinType == Enums.SkinType.CUSTOM) obj.skin = skin.skin;
        else obj.builtInSkin = skin.skinId;
        player.skin = obj;

        player.write(new SCReadyPacket());
        this.players.delete(`!phs.${player.uuid}`);
        this.players.set(player.username, player);
        player.initListeners();
        this._bindListenersToPlayer(player);
        player.state = Enums.ClientState.POST_HANDSHAKE;
        this._logger.info(`Handshake Success! Connecting player ${player.username} to server...`);
        handled = true;

        await player.connect({
          host: this.config.server.host,
          port: this.config.server.port,
          username: player.username,
        });
        this._logger.info(`Player ${player.username} successfully connected to server.`);
        this.emit("playerConnect", player);
      }
    } catch (err) {
      this.initalHandlerLogger.warn(`Error occurred whilst handling handshake: ${err.stack ?? err}`);
      handled = true;
      ws.close();
      if (player && player.uuid && this.players.has(`!phs.${player.uuid}`)) this.players.delete(`!phs.${player.uuid}`);
      if (player && player.uuid && this.players.has(player.username)) this.players.delete(player.username);
    }
  }

  private _bindListenersToPlayer(player: Player) {
    let sentDisconnectMsg = false;
    player.on("disconnect", () => {
      if (this.players.has(player.username)) this.players.delete(player.username);
      this.initalHandlerLogger.info(`DISCONNECT ${player.username} <=> DISCONNECTED`);
      if (!sentDisconnectMsg) this._logger.info(`Player ${player.username} (${player.uuid}) disconnected from the proxy server.`);
    });
    player.on("proxyPacket", async (packet) => {
      if (packet.packetId == Enums.PacketId.CSChannelMessagePacket) {
        try {
          const msg: CSChannelMessagePacket = packet as any;
          if (msg.channel == Constants.EAGLERCRAFT_SKIN_CHANNEL_NAME) {
            await this.skinServer.handleRequest(msg, player, this);
          }
        } catch (err) {
          this._logger.error(`Failed to process channel message packet! Error: ${err.stack || err}`);
        }
      }
    });
    player.on("switchServer", (client) => {
      this.initalHandlerLogger.info(`SWITCH_SERVER ${player.username} <=> ${client.socket.remoteAddress}:${client.socket.remotePort}`);
    });
    player.on("joinServer", (client) => {
      this.initalHandlerLogger.info(`SERVER_CONNECTED ${player.username} <=> ${client.socket.remoteAddress}:${client.socket.remotePort}`);
    });
  }

  static readonly POLL_INTERVAL: number = 10000;

  private _pollServer(host: string, port: number, interval?: number) {
    (async () => {
      while (true) {
        const motd = await Motd.MOTD.generateMOTDFromPing(host, port, this.config.useNatives).catch((err) => {
          this._logger.warn(`Error polling ${host}:${port} for MOTD: ${err.stack ?? err}`);
        });
        if (motd) this.broadcastMotd = motd;
        await new Promise((res) => setTimeout(res, interval ?? Proxy.POLL_INTERVAL));
      }
    })();
  }

  private async _handleWSConnectionReq(req: http.IncomingMessage, socket: Duplex, head: Buffer) {
    const origin = req.headers.origin == null || req.headers.origin == "null" ? null : req.headers.origin;
    if (!this.config.origins.allowOfflineDownloads && origin == null) {
      socket.destroy();
      return;
    }
    if (this.config.origins.originBlacklist != null && this.config.origins.originBlacklist.some((host) => Util.areDomainsEqual(host, origin))) {
      socket.destroy();
      return;
    }
    if (this.config.origins.originWhitelist != null && !this.config.origins.originWhitelist.some((host) => Util.areDomainsEqual(host, origin))) {
      socket.destroy();
      return;
    }
    try {
      await this.wsServer.handleUpgrade(req, socket, head, (ws) => this._handleWSConnection(ws, req));
    } catch (err) {
      this._logger.error(`Error was caught whilst trying to handle WebSocket connection request! Error: ${err.stack ?? err}`);
      socket.destroy();
    }
  }

  public fetchUserByUUID(uuid: MineProtocol.UUID): Player | null {
    for (const [username, player] of this.players) {
      if (player.uuid == uuid) return player;
    }
    return null;
  }
}

interface ProxyEvents {
  playerConnect: (player: Player) => void;
  playerDisconnect: (player: Player) => void;

  httpConnection: (req: http.IncomingMessage, res: http.ServerResponse, ctx: Util.Handlable) => void;
  wsConnection: (ws: WebSocket, req: http.IncomingMessage, ctx: Util.Handlable) => void;
}

export declare interface Proxy {
  on<U extends keyof ProxyEvents>(event: U, listener: ProxyEvents[U]): this;
  emit<U extends keyof ProxyEvents>(event: U, ...args: Parameters<ProxyEvents[U]>): boolean;
}
