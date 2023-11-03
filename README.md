# EaglerProxy

<a href="https://repl.it/github/WorldEditAxe/eaglerproxy"><img height="30px" src="https://raw.githubusercontent.com/FogNetwork/Tsunami/main/deploy/replit2.svg"><img></a>  
A standalone reimplementation of EaglercraftX's bungee plugin written in TypeScript, with plugin support.

_Working for latest EaglercraftX client version as of `6/15/2023`_

## Known Issues

- [EagProxyAAS] Player is missing skin when connected to server
  - Due to Eaglercraft's skin system and how it works, forcing skins onto the client is impossible (from what I know so far). This is only a client-sided bug/glitch - others will only see your Mojang/Minecraft account skin and cape.

## Installing and Running

This assumes that you have [Node.js](https://nodejs.org/en) LTS or higher installed on your computer, and that you have basic Git and CLI (command line) knowledge.

1. Clone/download this repository.
2. Modify and configure `config.ts` to your liking.
3. Install TypeScript and required dependencies (`npm i -g typescript` and `npm i`).
4. Compile the TypeScript code into normal JavaScript code (`tsc`).
5. Go into the `build` directory, and run `node index.js`.

## Plugins

As of right now, there only exists one plugin: EagProxyAAS (read below for more information).

### EagProxyAAS

EagProxyAAS aims to allow any Eaglercraft client to connect to a normal 1.8.9 Minecraft server, provided that players own a legitimate Minecraft Java copy.

_Demo server: `wss://eaglerproxy.q13x.com/` (not being hosted w/ Replit due to data transfer limits)_

#### I don't want to use this plugin!

Remove all the folders in `src/plugins`.

#### IMPORTANT: READ ME BEFORE USING

**IMPORTANT:** Although the vanilla Eaglercraft client is a safe, modified copy of Minecraft AOT-compiled to JavaScript, I cannot guarantee that you **will not get flagged by all anticheats.** While gameplay and testing has shown to be relatively stable and free of anticheat flags, more testing is needed to derive a conclusion on whether or not using EaglerProxy with EagProxyAAS is safe.

**ADVISORY FOR HYPIXEL PLAYERS:** This software falls under Hypixel's "disallowed modifications" category, as the proxy intercepts and changes how your client communicates to Hypixel's servers. **HYPIXEL WILL NOT UNBAN YOU IF YOU ARE FALSELY BANNED!** Modifying the plugin to remove this Hypixel check is not recommended. You are responsible for any action(s) that are taken against your Minecraft account!

EaglerProxy and EagProxyAAS:

- is compatible with EaglercraftX and uses its handshake system,
- intercepts and reads Minecraft packet traffic between you and the server on the other end (necessary for functionality),
- only uses login data to authenticate with vanilla Minecraft servers,
- and is open source and safe to use.

EaglerProxy and EagProxyAAS does NOT:

- include any Microsoft/Mojang code,
- store or otherwise use authentication data for any other purpose as listed on the README,
  - Unmodified versions will not maliciously handle your login data, although a modified version has the ability to do so. Only use trusted and unmodified versions of both this plugin and proxy.
- and intentionally put your account at risk.

Remember, open source software is never 100% safe. Read what you run on your computer.

##### Expectations

The built-in plugin serves as a demonstration of what can be done with plugins. Below is a list of what to expect from this demo.

- Expect server and world switching to take anywhere from 5 seconds to over 20.
  - Not much can be done to resolve this issue. Issues related to this will likely be closed and marked as invalid.
  - It is important that you refrain from moving your mouse and typing on your keyboard during this period. Doing so will increase your chance of timing out, or being unexpectedly kicked with the "End of stream" error.
- Expect the game to be unplayable (1-2 FPS at worst, maybe 30 FPS at best).
  - This is not something fixable on my behalf, as Eaglercraft itself has a history of being slow and laggy. Despite improvments made to the game in attempt to increase performance, Eaglercraft still remains slow and barely playable.
  - Try turning down your video settings to off/the lowest setting allowed. Unfullscreening and making your browser window smaller may result in higher FPS.
- Expect to be flagged by anticheats.
  - While testing has shown the proxy and plugin to be relatively safe to play on, it is not guaranteed that you will not get flagged and banned on every single server out there.

### Plugin Development

### Disclaimer

The proxy's software utilizes its own plugin API written in JavaScript, rather than BungeeCord's plugin API. For this reason, plugins written for the official BungeeCord plugin will **not** work on this proxy. Below are some instructions for making your very own EaglerProxy plugin.
_Refer to `src/plugins/EagProxyAAS` for an example plugin._  
Each and every EaglerProxy plugin consists of two parts:

- an entry point JavaScript file (this file is ran when the plugin is loaded)
- a `metadata.json` metadata file

Below is a breakdown of everything inside of `metadata.json`:

```
{
    "name": "Example Plugin",
    "id": "examplePlugin",
    "version": "1.0.0",
    "entry_point": "index.js",
    "requirements": [{ id: "otherPlugin", version: "1.0.0" }],
    "incompatibilities": [{ id: "someOtherPlugin", version: "2.0.0" }],
    "load_after": ["otherPlugin"]
}
```

As of right now, there exists no API reference. Please refer to the preinstalled plugin for details regarding API usage.

## Reporting Issues
**NOTE:** Issues asking for help will be converted into discussions. 
- Security-related bugs/issues: Directly contact me on Discord (check my profile).
- Non-security-related bugs/issues: Open a new issue, with the following:
  - Bug description
  - Affected versions
  - Reproduction steps (optional if you can't find)
