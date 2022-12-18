import { readFileSync } from "fs";
import * as https from "https";
import { WebSocketServer } from "ws";
import { ProxiedPlayer } from "./classes.js";
import { config } from "./config.js";
import { handlePacket } from "./listener.js";
import { Logger } from "./logger.js";
import { BRANDING, NETWORK_VERSION, VERSION } from "./meta.js";
import { State } from "./types.js";
import { genUUID } from "./utils.js";
const logger = new Logger("EagXProxy");
const connectionLogger = new Logger("ConnectionHandler");
global.PROXY = {
    brand: BRANDING,
    version: VERSION,
    MOTDVersion: NETWORK_VERSION,
    serverName: config.name,
    secure: false,
    proxyUUID: genUUID(config.name),
    MOTD: {
        icon: null,
        motd: [config.motd.l1, config.motd.l2]
    },
    playerStats: {
        max: config.maxPlayers,
        onlineCount: 0
    },
    wsServer: null,
    players: new Map(),
    logger: logger,
    config: config
};
PROXY.playerStats.onlineCount = PROXY.players.size;
let server;
if (PROXY.config.security.enabled) {
    logger.info(`Starting SECURE WebSocket proxy on port ${config.port}...`);
    if (process.env.REPL_SLUG) {
        logger.warn("You appear to be running the proxy on Repl.it with encryption enabled. Please note that Repl.it by default provides encryption, and enabling encryption may or may not prevent you from connecting to the server.");
    }
    server = new WebSocketServer({
        server: https.createServer({
            key: readFileSync(config.security.key),
            cert: readFileSync(config.security.cert)
        }).listen(config.port)
    });
}
else {
    logger.info(`Starting INSECURE WebSocket proxy on port ${config.port}...`);
    server = new WebSocketServer({
        port: config.port
    });
}
PROXY.wsServer = server;
server.addListener('connection', c => {
    connectionLogger.debug(`[CONNECTION] New inbound WebSocket connection from [/${c._socket.remoteAddress}:${c._socket.remotePort}]. (${c._socket.remotePort} -> ${config.port})`);
    const plr = new ProxiedPlayer();
    plr.ws = c;
    plr.ip = c._socket.remoteAddress;
    plr.remotePort = c._socket.remotePort;
    plr.state = State.PRE_HANDSHAKE;
    c.on('message', msg => {
        handlePacket(msg, plr);
    });
});
server.on('listening', () => {
    logger.info(`Successfully started${config.security.enabled ? " [secure]" : ""} WebSocket proxy on port ${config.port}!`);
});
