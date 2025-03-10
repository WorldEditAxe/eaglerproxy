import { dirname, join } from "path";
import { Enums } from "../../proxy/Enums.js";
import { Player } from "../../proxy/Player.js";
import { config } from "./config.js";
import { ConnectType } from "./types.js";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const SEPARATOR = "======================================";
const METADATA: {
  name: string;
  id: string;
  version: string;
  entry_point: string;
  requirements: any[];
  load_after: any[];
  incompatibilities: any[];
} = JSON.parse(
  (
    await fs.readFile(
      join(dirname(fileURLToPath(import.meta.url)), "metadata.json")
    )
  ).toString()
);

export function sendPluginChatMessage(
  client: Player,
  ...components: { text: string; color: string; [otherFields: string]: any }[]
) {
  if (components.length == 0)
    throw new Error("There must be one or more passed components!");
  else {
    client.ws.send(
      client.serverSerializer.createPacketBuffer({
        name: "chat",
        params: {
          message: JSON.stringify({
            text: "[EagPAAS] ",
            color: "gold",
            extra: components,
          }),
        },
      })
    );
  }
}

export function handleCommand(sender: Player, cmd: string): void {
  switch (cmd.toLowerCase().split(/ /gim)[0]) {
    default:
      sendPluginChatMessage(sender, {
        text: `"${cmd.split(/ /gim, 1)[0]}" is not a valid command!`,
        color: "red",
      });
      break;
    case "/eag-help":
      helpCommand(sender);
      break;
    case "/eag-toggleparticles":
      toggleParticles(sender);
      break;
    case "/eag-switchservers":
      switchServer(cmd, sender);
      break;
  }
}

export function helpCommand(sender: Player) {
  sendPluginChatMessage(sender, {
    text: SEPARATOR,
    color: "yellow",
  });
  sendPluginChatMessage(sender, {
    text: "Available Commands:",
    color: "aqua",
  });
  sendPluginChatMessage(sender, {
    text: "/eag-help",
    color: "light_green",
    hoverEvent: {
      action: "show_text",
      value: Enums.ChatColor.GOLD + "Click me to run this command!",
    },
    clickEvent: {
      action: "run_command",
      value: "/eag-help",
    },
    extra: [
      {
        text: " - Prints out a list of commmands",
        color: "aqua",
      },
    ],
  });
  sendPluginChatMessage(sender, {
    text: "/eag-toggleparticles",
    color: "light_green",
    hoverEvent: {
      action: "show_text",
      value: Enums.ChatColor.GOLD + "Click me to run this command!",
    },
    clickEvent: {
      action: "run_command",
      value: "/eag-toggleparticles",
    },
    extra: [
      {
        text: " - Toggles whether or not particles should be rendered/shown on the client. Turning this on can potentially boost FPS.",
        color: "aqua",
      },
    ],
  });
  sendPluginChatMessage(sender, {
    text: `/eag-switchservers <mode: online|offline> <ip>${
      config.allowCustomPorts ? " [port]" : ""
    }`,
    color: "light_green",
    hoverEvent: {
      action: "show_text",
      value: Enums.ChatColor.GOLD + "Click me to paste this command to chat!",
    },
    clickEvent: {
      action: "suggest_command",
      value: `/eag-switchservers <mode: online|offline> <ip>${
        config.allowCustomPorts ? " [port]" : ""
      }`,
    },
    extra: [
      {
        text: " - Switch between servers on-the-fly. Switching to servers in online mode requires logging in via online mode or TheAltening!",
        color: "aqua",
      },
    ],
  });
  sendPluginChatMessage(sender, {
    text: `Running ${METADATA.name} on version v${METADATA.version}.`,
    color: "gray",
  });
  sendPluginChatMessage(sender, {
    text: SEPARATOR,
    color: "yellow",
  });
}

export function toggleParticles(sender: Player) {
  const listener = (sender as any)._particleListener;
  if (listener != null) {
    sender.removeListener("vanillaPacket", listener);
    (sender as any)._particleListener = undefined;
    sendPluginChatMessage(sender, {
      text: "Disabled particle hider!",
      color: "red",
    });
  } else {
    (sender as any)._particleListener = (
      packet: { name: string; params: any; cancel: boolean },
      origin: "SERVER" | "CLIENT"
    ) => {
      if (origin == "SERVER") {
        if (packet.name == "world_particles") {
          packet.cancel = true;
        } else if (packet.name == "world_event") {
          if (packet.params.effectId >= 2000) {
            packet.cancel = true;
          }
        }
      }
    };
    sender.on("vanillaPacket", (sender as any)._particleListener);
    sendPluginChatMessage(sender, {
      text: "Enabled particle hider!",
      color: "green",
    });
  }
}

export async function switchServer(cmd: string, sender: Player) {
  if ((sender as any)._serverSwitchLock) {
    return sendPluginChatMessage(sender, {
      text: `There is already a pending server switch - please wait, and be patient!`,
      color: "red",
    });
  }
  let split = cmd.split(/ /gim).slice(1),
    mode = split[0]?.toLowerCase(),
    ip = split[1],
    port = split[2];
  if (mode != "online" && mode != "offline") {
    return sendPluginChatMessage(sender, {
      text: `Invalid command usage - please provide a valid mode! `,
      color: "red",
      extra: [
        {
          text: `/eag-switchservers <mode: online|offline> <ip>${
            config.allowCustomPorts ? " [port]" : ""
          }.`,
          color: "gold",
        },
      ],
    });
  }
  if (ip == null) {
    return sendPluginChatMessage(sender, {
      text: `Invalid command usage - please provide a valid IP or hostname (like example.com, 1.2.3.4, etc.)! `,
      color: "red",
      extra: [
        {
          text: `/eag-switchservers <mode: online|offline> <ip>${
            config.allowCustomPorts ? " [port]" : ""
          }.`,
          color: "gold",
        },
      ],
    });
  }
  if (
    port != null &&
    (isNaN(Number(port)) || Number(port) < 1 || Number(port) > 65535)
  ) {
    return sendPluginChatMessage(sender, {
      text: `Invalid command usage - a port must be a number above 0 and below 65536! `,
      color: "red",
      extra: [
        {
          text: `/eag-switchservers <mode: online|offline> <ip>${
            config.allowCustomPorts ? " [port]" : ""
          }.`,
          color: "gold",
        },
      ],
    });
  }
  if (port != null && !config.allowCustomPorts) {
    return sendPluginChatMessage(sender, {
      text: `Invalid command usage - custom server ports are disabled on this proxy instance! `,
      color: "red",
      extra: [
        {
          text: `/eag-switchservers <mode: online|offline> <ip>${
            config.allowCustomPorts ? " [port]" : ""
          }.`,
          color: "gold",
        },
      ],
    });
  }

  let connectionType =
      mode == "offline" ? ConnectType.OFFLINE : ConnectType.ONLINE,
    addr = ip,
    addrPort = Number(port);
  if (connectionType == ConnectType.ONLINE) {
    if ((sender as any)._onlineSession == null) {
      sendPluginChatMessage(sender, {
        text: `You either connected to this proxy under offline mode, or your online/TheAltening session has timed out and has become invalid.`,
        color: "red",
      });
      return sendPluginChatMessage(sender, {
        text: `To switch to online servers, please reconnect and log-in through online/TheAltening mode.`,
        color: "red",
      });
    } else {
      const savedAuth = (sender as any)._onlineSession;
      sendPluginChatMessage(sender, {
        text: `(joining server under ${savedAuth.username}/your ${
          savedAuth.isTheAltening ? "TheAltening" : "Minecraft"
        } account's username)`,
        color: "aqua",
      });
      sendPluginChatMessage(sender, {
        text: "Attempting to switch servers, please wait... (if you don't get connected to the target server after a while, the server might not be a Minecraft server at all. Reconnect and try again.)",
        color: "gray",
      });
      (sender as any)._serverSwitchLock = true;
      try {
        await sender.switchServers({
          host: addr,
          port: addrPort,
          version: "1.8.8",
          keepAlive: false,
          skipValidation: true,
          hideErrors: true,
          ...savedAuth,
        });
        (sender as any)._serverSwitchLock = false;
      } catch (err) {
        if (sender.state! != Enums.ClientState.DISCONNECTED) {
          sender.disconnect(
            Enums.ChatColor.RED +
              `Something went wrong whilst switching servers: ${err.message}${
                err.code == "ENOTFOUND"
                  ? addr.includes(":")
                    ? `\n${Enums.ChatColor.GRAY}Suggestion: Replace the : in your IP with a space.`
                    : "\nIs that IP valid?"
                  : ""
              }`
          );
        }
      }
    }
  } else {
    sendPluginChatMessage(sender, {
      text: `(joining server under ${sender.username}/Eaglercraft username)`,
      color: "aqua",
    });
    sendPluginChatMessage(sender, {
      text: "Attempting to switch servers, please wait... (if you don't get connected to the target server for a while, the server might be online only)",
      color: "gray",
    });
    try {
      (sender as any)._serverSwitchLock = true;
      await sender.switchServers({
        host: addr,
        port: addrPort,
        version: "1.8.8",
        username: sender.username,
        auth: "offline",
        keepAlive: false,
        skipValidation: true,
        hideErrors: true,
      });
      (sender as any)._serverSwitchLock = false;
    } catch (err) {
      if (sender.state! != Enums.ClientState.DISCONNECTED) {
        sender.disconnect(
          Enums.ChatColor.RED +
            `Something went wrong whilst switching servers: ${err.message}${
              err.code == "ENOTFOUND"
                ? addr.includes(":")
                  ? `\n${Enums.ChatColor.GRAY}Suggestion: Replace the : in your IP with a space.`
                  : "\nIs that IP valid?"
                : ""
            }`
        );
      }
    }
  }
}
