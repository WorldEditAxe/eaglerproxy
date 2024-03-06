import { config } from "../config.js";

export async function registerEndpoints() {
  const proxy = PLUGIN_MANAGER.proxy;
  proxy.on("httpConnection", (req, res, ctx) => {
    if (req.url.startsWith("/eagpaas/metadata")) {
      ctx.handled = true;
      res.writeHead(200).end(
        JSON.stringify({
          branding: "EagProxyAAS",
          version: "1",
        })
      );
    } else if (req.url.startsWith("/eagpaas/validate")) {
      ctx.handled = true;
      if (config.authentication.enabled) {
        if (req.headers["authorization"] !== `Basic ${config.authentication.password}`) {
          return res.writeHead(403).end(
            JSON.stringify({
              success: false,
              reason: "Access Denied",
            })
          );
        }
      }
      res.writeHead(200).end(
        JSON.stringify({
          success: true,
        })
      );
    }
  });
}
