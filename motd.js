export function handleMotd(player) {
    const names = [];
    for (const [username, player] of PROXY.players) {
        if (names.length > 0) {
            names.push(`(and ${PROXY.players.size - names.length} more)`);
            break;
        }
        else {
            names.push(username);
        }
    }
    player.ws.send(JSON.stringify({
        brand: PROXY.brand,
        cracked: true,
        data: {
            cache: true,
            icon: PROXY.MOTD.icon ? true : false,
            max: PROXY.playerStats.max,
            motd: PROXY.MOTD.motd,
            online: PROXY.playerStats.onlineCount,
            players: names
        },
        name: PROXY.serverName,
        secure: false,
        time: Date.now(),
        type: "motd",
        uuid: PROXY.proxyUUID,
        vers: PROXY.MOTDVersion
    }));
    if (PROXY.MOTD.icon) {
        player.ws.send(PROXY.MOTD.icon);
    }
    player.ws.close();
}
