# EaglercraftX (1.8.9) WebSocket Proxy
## What is this?
A very primitive and small Node.js based alternative to the custom BungeeCord servers for Eaglercraft 1.8.9. Until the developers officially release the BungeeCord server, this is the only way you can create a EaglercraftX server.
## Issues
* Generic and vague "End of stream" error when disconnected by the proxy, not the server
* Inability to set a server icon
* Skins don't work
## Setup Guide
### Prerequisites
* Node.js v12 and up
* A 1.8.9-compatible Minecraft server or proxy
### Setup Guide
1. Download and extract this repository to a folder on your computer.
2. Open a terminal and go to the folder of the repository. Run `npm i`.
3. Edit `config.js` to configure your proxy. Below is a small breakdown of the configuration file.
```js
export const config = {
    // The name of the proxy. Does nothing.
    name: "BasedProxy",
    // The port you want to run the proxy on.
    port: 80,
    // The amount of players that can join and use this proxy simultaneously.
    maxPlayers: 20,
    motd: {
        // Does nothing. (icons do not work)
        iconURL: null,
        // The first line of the MOTD.
        l1: "hi",
        // The second line of the MOTD.
        l2: "lol"
    },
    server: {
        // The IP/domain of the server you want the proxy to point to.
        // Remember, the server HAS to be offline, or you can't connect.
        host: "127.0.0.1",
        // The port the server is running on.
        port: 25565
    },
    security: {
        // Whether or not encryption should be enabled.
        // If you are using Repl.it, this should be left off.
        enabled: false,
        // The key issued to you by your certificate authority (CA).
        key: null,
        // The certificate issued to you by your certificate authority (CA).
        cert: null
    }
};
```
