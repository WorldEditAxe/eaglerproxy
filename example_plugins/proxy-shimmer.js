const oldWs = globalThis.WebSocket;
const route = "ws://localhost:8080"; // Replace with your proxy URL
const transformUrl = (url) => {
  let { host: ip, port, protocol, searchParams } = new URL(url);
  port = port || 25565;
  let proto = null,
    token = null;
  if (protocol) {
    if (protocol === "vanilla+offline:") {
      proto = "&authType=OFFLINE";
    } else if (protocol === "vanilla+online:") {
      proto = "&authType=ONLINE";
    } else if (protocol === "vanilla+altening:") {
      proto = "&authType=THEALTENING";
    }
  }
  return `${route}/?ip=${ip}&port=${port}${proto || ""}`;
};

class ShimmedWebSocket extends oldWs {
  constructor(url, ...args) {
    if (url.startsWith("ws://") || url.startsWith("wss://")) {
      const trimmedUrl = url.startsWith("wss://") ? url.substring(6) : url.substring(5);
      if (trimmedUrl.startsWith("vanilla://") || trimmedUrl.startsWith("vanilla+offline://") || trimmedUrl.startsWith("vanilla+online://") || trimmedUrl.startsWith("vanilla+altening://")) {
        const transformedUrl = transformUrl(trimmedUrl);
        console.log(`Using proxy for vanilla URL: ${transformedUrl}`);
        url = transformedUrl;
      }
    }
    super(url, args);
  }
}

globalThis.WebSocket = ShimmedWebSocket;
