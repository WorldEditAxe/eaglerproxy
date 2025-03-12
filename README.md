# EaglerProxy

<a href="https://repl.it/github/WorldEditAxe/eaglerproxy"><img height="30px" src="https://raw.githubusercontent.com/FogNetwork/Tsunami/main/deploy/replit2.svg"><img></a>  
A standalone reimplementation of EaglercraftX's bungee plugin written in TypeScript, with plugin support.

_Working for latest EaglercraftX client version as of `3/12/2025`_

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

### Important: For non-traditional runtime environments

For the most part, this proxy (and its dependencies) transpiles to pure JavaScript, and does not require anything more than a full implementation of the Node.js API (with the exception of node-gyp/native support). _Crypto support is required for the proxy to run._  
**<u>If you are running the proxy through either Termux or CodeSandbox's on-device runtime:</u>**

1. Uninstall `sharp`, and ensure that `jimp` is installed.
2. Edit `config.ts` and set `adapter.useNatives` to `false`.

The above steps can solve any issues where the proxy immediately crashes with a segfault/illegal instruction error.

## Plugins

As of right now, there only exists one plugin: EagProxyAAS (read below for more information).

### EagProxyAAS

EagProxyAAS aims to allow any Eaglercraft client to connect to a normal 1.8.9 Minecraft server, provided that players own a legitimate Minecraft Java copy. Although basic mitigations againt this exist in the plugin, **if you are hosting an instance of this proxy, please take steps to ensure that the proxy cannot access any internal IPs/hostnames as to prevent and mitigate the risk of network enumeration.**

#### Client Support

EagPAAS allows URL parameters to be passed to the proxy in the WebSocket server URL to supply information about the target server, such as the server IP, port, and method of authentication.
Example: `ws://example.com/?ip=example.com&port=25565&authType=[THEALTENING|ONLINE|OFFLINE]`

#### `vanilla://` URL support

A client-sided, Eaglercraft client-agnostic JavaScript shim that adds support for the custom `vanilla://` URL server protocol through URL rewriting is available in `example_plugins/proxy-shimmer.js`. An EaglerProxy server instance running the EagPAAS plugin is required.  
Format (`[]` are optional): `vanilla[+online/+offline/+altening]://hostname[:port]` (`port` defaults to `25565`)

#### I don't want to use this plugin!

Remove all the folders in `src/plugins`.

#### IMPORTANT: READ ME BEFORE USING

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

**NOTE:** Issues asking for help will be converted into discussions. You are expected to have **thoroughly** read all documentation prior to asking for help, and expect no help if you have not done so.

- Security-related bugs/issues: Directly contact me on Discord (check my profile).
- Non-security-related bugs/issues: Open a new issue, with the following:
  - Bug description
  - Affected versions
  - Reproduction steps (optional if you can't find)
