import { ConnectType, ServerGlobals } from "./types.js";
import * as Chunk from "prismarine-chunk";
import * as Block from "prismarine-block";
import * as Registry from "prismarine-registry";
import vec3 from "vec3";
import { Client } from "minecraft-protocol";
import { ClientState, ConnectionState } from "./types.js";
import { auth, ServerDeviceCodeResponse } from "./auth.js";
import { config } from "./config.js";

const { Vec3 } = vec3 as any;
const Enums = PLUGIN_MANAGER.Enums;
const Util = PLUGIN_MANAGER.Util;
const MAX_LIFETIME_CONNECTED = 10 * 60 * 1000,
  MAX_LIFETIME_AUTH = 5 * 60 * 1000,
  MAX_LIFETIME_LOGIN = 1 * 60 * 1000;
const REGISTRY = Registry.default("1.8.8"),
  McBlock = (Block as any).default("1.8.8"),
  LOGIN_CHUNK = generateSpawnChunk().dump();
const logger = new PLUGIN_MANAGER.Logger("PlayerHandler");

let SERVER: ServerGlobals = null;

export function setSG(svr: ServerGlobals) {
  SERVER = svr;
}

export function disconectIdle() {
  SERVER.players.forEach((client) => {
    if (
      client.state == ConnectionState.AUTH &&
      Date.now() - client.lastStatusUpdate > MAX_LIFETIME_AUTH
    ) {
      client.gameClient.end(
        "Timed out waiting for user to login via Microsoft"
      );
    } else if (
      client.state == ConnectionState.SUCCESS &&
      Date.now() - client.lastStatusUpdate > MAX_LIFETIME_CONNECTED
    ) {
      client.gameClient.end(
        Enums.ChatColor.RED +
          "Please enter the IP of the server you'd like to connect to in chat."
      );
    }
  });
}

export function handleConnect(client: ClientState) {
  client.gameClient.write("login", {
    entityId: 1,
    gameMode: 2,
    dimension: 0,
    difficulty: 1,
    maxPlayers: 1,
    levelType: "flat",
    reducedDebugInfo: false,
  });
  client.gameClient.write("map_chunk", {
    x: 0,
    z: 0,
    groundUp: true,
    bitMap: 0xffff,
    chunkData: LOGIN_CHUNK,
  });
  client.gameClient.write("position", {
    x: 0,
    y: 65,
    z: 8.5,
    yaw: -90,
    pitch: 0,
    flags: 0x01,
  });

  client.gameClient.write("playerlist_header", {
    header: JSON.stringify({
      text: ` ${Enums.ChatColor.GOLD}EaglerProxy Authentication Server `,
    }),
    footer: JSON.stringify({
      text: `${Enums.ChatColor.GOLD}Please wait for instructions.`,
    }),
  });
  onConnect(client);
}

export function awaitCommand(
  client: Client,
  filter: (msg: string) => boolean
): Promise<string> {
  return new Promise<string>((res, rej) => {
    const onMsg = (packet) => {
      if (filter(packet.message)) {
        client.removeListener("chat", onMsg);
        client.removeListener("end", onEnd);
        res(packet.message);
      }
    };
    const onEnd = () =>
      rej("Client disconnected before promise could be resolved");
    client.on("chat", onMsg);
    client.on("end", onEnd);
  });
}

export function sendMessage(client: Client, msg: string) {
  client.write("chat", {
    message: JSON.stringify({ text: msg }),
    position: 1,
  });
}

export function sendCustomMessage(
  client: Client,
  msg: string,
  color: string,
  ...components: { text: string; color: string }[]
) {
  client.write("chat", {
    message: JSON.stringify(
      components.length > 0
        ? {
            text: msg,
            color,
            extra: components,
          }
        : { text: msg, color }
    ),
    position: 1,
  });
}

export function sendChatComponent(client: Client, component: any) {
  client.write("chat", {
    message: JSON.stringify(component),
    position: 1,
  });
}

export function sendMessageWarning(client: Client, msg: string) {
  client.write("chat", {
    message: JSON.stringify({
      text: msg,
      color: "yellow",
    }),
    position: 1,
  });
}

export function sendMessageLogin(client: Client, url: string, token: string) {
  client.write("chat", {
    message: JSON.stringify({
      text: "Please go to ",
      color: Enums.ChatColor.RESET,
      extra: [
        {
          text: url,
          color: "gold",
          clickEvent: {
            action: "open_url",
            value: url,
          },
          hoverEvent: {
            action: "show_text",
            value: Enums.ChatColor.GOLD + "Click to open me in a new window!",
          },
        },
        {
          text: " and login via the code ",
        },
        {
          text: token,
          color: "gold",
          hoverEvent: {
            action: "show_text",
            value: Enums.ChatColor.GOLD + "Click me to copy to chat!",
          },
          clickEvent: {
            action: "suggest_command",
            value: token,
          },
        },
        {
          text: ".",
        },
      ],
    }),
    position: 1,
  });
}

export function updateState(
  client: Client,
  newState: "CONNECTION_TYPE" | "AUTH" | "SERVER",
  uri?: string,
  code?: string
) {
  switch (newState) {
    case "CONNECTION_TYPE":
      client.write("playerlist_header", {
        header: JSON.stringify({
          text: ` ${Enums.ChatColor.GOLD}EaglerProxy Authentication Server `,
        }),
        footer: JSON.stringify({
          text: `${Enums.ChatColor.RED}Choose the connection type: 1 = online, 2 = offline.`,
        }),
      });
      break;
    case "AUTH":
      if (code == null || uri == null)
        throw new Error(
          "Missing code/uri required for title message type AUTH"
        );
      client.write("playerlist_header", {
        header: JSON.stringify({
          text: ` ${Enums.ChatColor.GOLD}EaglerProxy Authentication Server `,
        }),
        footer: JSON.stringify({
          text: `${Enums.ChatColor.RED}${uri}${Enums.ChatColor.GOLD} | Code: ${Enums.ChatColor.RED}${code}`,
        }),
      });
      break;
    case "SERVER":
      client.write("playerlist_header", {
        header: JSON.stringify({
          text: ` ${Enums.ChatColor.GOLD}EaglerProxy Authentication Server `,
        }),
        footer: JSON.stringify({
          text: `${Enums.ChatColor.RED}/join <ip>${
            config.allowCustomPorts ? " [port]" : ""
          }`,
        }),
      });
      break;
  }
}

export async function onConnect(client: ClientState) {
  try {
    client.state = ConnectionState.AUTH;
    client.lastStatusUpdate = Date.now();

    sendMessageWarning(
      client.gameClient,
      `WARNING: This proxy allows you to connect to any 1.8.9 server. Gameplay has shown no major issues, but please note that EaglercraftX may flag some anticheats while playing.`
    );
    await new Promise((res) => setTimeout(res, 2000));

    sendMessageWarning(
      client.gameClient,
      `WARNING: It is highly suggested that you turn down settings, as gameplay tends to be very laggy and unplayable on low powered devices.`
    );
    await new Promise((res) => setTimeout(res, 2000));

    sendCustomMessage(client.gameClient, "What would you like to do?", "gray");
    sendChatComponent(client.gameClient, {
      text: "1) ",
      color: "gold",
      extra: [
        {
          text: "Connect to an online server (Minecraft account needed)",
          color: "white",
        },
      ],
      hoverEvent: {
        action: "show_text",
        value: Enums.ChatColor.GOLD + "Click me to select!",
      },
      clickEvent: {
        action: "run_command",
        value: "1",
      },
    });
    sendChatComponent(client.gameClient, {
      text: "2) ",
      color: "gold",
      extra: [
        {
          text: "Connect to an offline server (no Minecraft account needed)",
          color: "white",
        },
      ],
      hoverEvent: {
        action: "show_text",
        value: Enums.ChatColor.GOLD + "Click me to select!",
      },
      clickEvent: {
        action: "run_command",
        value: "2",
      },
    });
    sendCustomMessage(
      client.gameClient,
      "Select an option from the above (1 = online, 2 = offline), either by clicking or manually typing out the option.",
      "green"
    );
    updateState(client.gameClient, "CONNECTION_TYPE");

    let chosenOption: ConnectType | null = null;
    while (true) {
      const option = await awaitCommand(client.gameClient, (msg) => true);
      switch (option) {
        default:
          sendCustomMessage(
            client.gameClient,
            `I don't understand what you meant by "${option}", please reply with a valid option!`,
            "red"
          );
        case "1":
          chosenOption = ConnectType.ONLINE;
          break;
        case "2":
          chosenOption = ConnectType.OFFLINE;
          break;
      }
      if (chosenOption != null) break;
    }

    if (chosenOption == ConnectType.ONLINE) {
      sendMessageWarning(
        client.gameClient,
        `You will be prompted to log in via Microsoft to obtain a session token necessary to join games. Any data related to your account will not be saved and for transparency reasons this proxy's source code is available on Github.`
      );
      await new Promise((res) => setTimeout(res, 2000));

      client.lastStatusUpdate = Date.now();
      let errored = false,
        savedAuth;
      const authHandler = auth(),
        codeCallback = (code: ServerDeviceCodeResponse) => {
          updateState(
            client.gameClient,
            "AUTH",
            code.verification_uri,
            code.user_code
          );
          sendMessageLogin(
            client.gameClient,
            code.verification_uri,
            code.user_code
          );
        };
      authHandler.once("error", (err) => {
        if (!client.gameClient.ended) client.gameClient.end(err.message);
        errored = true;
      });
      if (errored) return;
      authHandler.on("code", codeCallback);
      await new Promise((res) =>
        authHandler.once("done", (result) => {
          savedAuth = result;
          res(result);
        })
      );
      sendMessage(
        client.gameClient,
        Enums.ChatColor.BRIGHT_GREEN + "Successfully logged into Minecraft!"
      );

      client.state = ConnectionState.SUCCESS;
      client.lastStatusUpdate = Date.now();
      updateState(client.gameClient, "SERVER");
      sendMessage(
        client.gameClient,
        `Provide a server to join. ${Enums.ChatColor.GOLD}/join <ip>${
          config.allowCustomPorts ? " [port]" : ""
        }${Enums.ChatColor.RESET}.`
      );
      let host: string, port: number;
      while (true) {
        const msg = await awaitCommand(client.gameClient, (msg) =>
            msg.startsWith("/join")
          ),
          parsed = msg.split(/ /gi, 3);
        if (parsed.length < 2)
          sendMessage(
            client.gameClient,
            `Please provide a server to connect to. ${
              Enums.ChatColor.GOLD
            }/join <ip>${config.allowCustomPorts ? " [port]" : ""}${
              Enums.ChatColor.RESET
            }.`
          );
        else if (parsed.length > 2 && isNaN(parseInt(parsed[2])))
          sendMessage(
            client.gameClient,
            `A valid port number has to be passed! ${
              Enums.ChatColor.GOLD
            }/join <ip>${config.allowCustomPorts ? " [port]" : ""}${
              Enums.ChatColor.RESET
            }.`
          );
        else {
          host = parsed[1];
          if (parsed.length > 2) port = parseInt(parsed[2]);
          if (port != null && !config.allowCustomPorts) {
            sendCustomMessage(
              client.gameClient,
              "You are not allowed to use custom server ports! /join <ip>",
              "red"
            );
            host = null;
            port = null;
          } else {
            port = port ?? 25565;
            break;
          }
        }
      }
      try {
        await PLUGIN_MANAGER.proxy.players
          .get(client.gameClient.username)
          .switchServers({
            host: host,
            port: port,
            version: "1.8.8",
            username: savedAuth.selectedProfile.name,
            auth: "mojang",
            keepAlive: false,
            session: {
              accessToken: savedAuth.accessToken,
              clientToken: savedAuth.selectedProfile.id,
              selectedProfile: {
                id: savedAuth.selectedProfile.id,
                name: savedAuth.selectedProfile.name,
              },
            },
            skipValidation: true,
            hideErrors: true,
          });
      } catch (err) {
        if (!client.gameClient.ended) {
          client.gameClient.end(
            Enums.ChatColor.RED +
              `Something went wrong whilst switching servers: ${err.message}${
                err.code == "ENOTFOUND"
                  ? host.includes(":")
                    ? `\n${Enums.ChatColor.GRAY}Suggestion: Replace the : in your IP with a space.`
                    : "\nIs that IP valid?"
                  : ""
              }`
          );
        }
      }
    } else {
      client.state = ConnectionState.SUCCESS;
      client.lastStatusUpdate = Date.now();
      updateState(client.gameClient, "SERVER");
      sendMessage(
        client.gameClient,
        `Provide a server to join. ${Enums.ChatColor.GOLD}/join <ip>${
          config.allowCustomPorts ? " [port]" : ""
        }${Enums.ChatColor.RESET}.`
      );
      let host: string, port: number;
      while (true) {
        const msg = await awaitCommand(client.gameClient, (msg) =>
            msg.startsWith("/join")
          ),
          parsed = msg.split(/ /gi, 3);
        if (parsed.length < 2)
          sendMessage(
            client.gameClient,
            `Please provide a server to connect to. ${
              Enums.ChatColor.GOLD
            }/join <ip>${config.allowCustomPorts ? " [port]" : ""}${
              Enums.ChatColor.RESET
            }.`
          );
        else if (parsed.length > 2 && isNaN(parseInt(parsed[2])))
          sendMessage(
            client.gameClient,
            `A valid port number has to be passed! ${
              Enums.ChatColor.GOLD
            }/join <ip>${config.allowCustomPorts ? " [port]" : ""}${
              Enums.ChatColor.RESET
            }.`
          );
        else {
          host = parsed[1];
          if (parsed.length > 2) port = parseInt(parsed[2]);
          if (port != null && !config.allowCustomPorts) {
            sendCustomMessage(
              client.gameClient,
              "You are not allowed to use custom server ports! /join <ip>",
              "red"
            );
            host = null;
            port = null;
          } else {
            port = port ?? 25565;
            break;
          }
        }
      }
      try {
        sendCustomMessage(
          client.gameClient,
          "Attempting to switch servers, please wait... (if you don't get connected to the target server for a while, the server might be online only)",
          "gray"
        );
        await PLUGIN_MANAGER.proxy.players
          .get(client.gameClient.username)
          .switchServers({
            host: host,
            port: port,
            version: "1.8.8",
            username: client.gameClient.username,
            auth: "offline",
            keepAlive: false,
            skipValidation: true,
            hideErrors: true,
          });
      } catch (err) {
        if (!client.gameClient.ended) {
          client.gameClient.end(
            Enums.ChatColor.RED +
              `Something went wrong whilst switching servers: ${err.message}${
                err.code == "ENOTFOUND"
                  ? host.includes(":")
                    ? `\n${Enums.ChatColor.GRAY}Suggestion: Replace the : in your IP with a space.`
                    : "\nIs that IP valid?"
                  : ""
              }`
          );
        }
      }
    }
  } catch (err) {
    if (!client.gameClient.ended) {
      logger.error(
        `Error whilst processing user ${client.gameClient.username}: ${
          err.stack || err
        }`
      );
      client.gameClient.end(
        Enums.ChatColor.YELLOW +
          "Something went wrong whilst processing your request. Please reconnect."
      );
    }
  }
}

export function generateSpawnChunk(): Chunk.PCChunk {
  const chunk = new (Chunk.default(REGISTRY))(null) as Chunk.PCChunk;
  chunk.initialize(
    () =>
      new McBlock(
        REGISTRY.blocksByName.air.id,
        REGISTRY.biomesByName.plains.id,
        0
      )
  );
  chunk.setBlock(
    new Vec3(8, 64, 8),
    new McBlock(
      REGISTRY.blocksByName.barrier.id,
      REGISTRY.biomesByName.plains.id,
      0
    )
  );
  chunk.setBlock(
    new Vec3(8, 67, 8),
    new McBlock(
      REGISTRY.blocksByName.barrier.id,
      REGISTRY.biomesByName.plains.id,
      0
    )
  );
  chunk.setBlock(
    new Vec3(7, 65, 8),
    new McBlock(
      REGISTRY.blocksByName.barrier.id,
      REGISTRY.biomesByName.plains.id,
      0
    )
  );
  chunk.setBlock(
    new Vec3(7, 66, 8),
    new McBlock(
      REGISTRY.blocksByName.barrier.id,
      REGISTRY.biomesByName.plains.id,
      0
    )
  );
  chunk.setBlock(
    new Vec3(9, 65, 8),
    new McBlock(
      REGISTRY.blocksByName.barrier.id,
      REGISTRY.biomesByName.plains.id,
      0
    )
  );
  chunk.setBlock(
    new Vec3(9, 66, 8),
    new McBlock(
      REGISTRY.blocksByName.barrier.id,
      REGISTRY.biomesByName.plains.id,
      0
    )
  );
  chunk.setBlock(
    new Vec3(8, 65, 7),
    new McBlock(
      REGISTRY.blocksByName.barrier.id,
      REGISTRY.biomesByName.plains.id,
      0
    )
  );
  chunk.setBlock(
    new Vec3(8, 66, 7),
    new McBlock(
      REGISTRY.blocksByName.barrier.id,
      REGISTRY.biomesByName.plains.id,
      0
    )
  );
  chunk.setBlock(
    new Vec3(8, 65, 9),
    new McBlock(
      REGISTRY.blocksByName.barrier.id,
      REGISTRY.biomesByName.plains.id,
      0
    )
  );
  chunk.setBlock(
    new Vec3(8, 66, 9),
    new McBlock(
      REGISTRY.blocksByName.barrier.id,
      REGISTRY.biomesByName.plains.id,
      0
    )
  );
  chunk.setSkyLight(new Vec3(8, 66, 8), 15);
  return chunk;
}
