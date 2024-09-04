import { auth } from "../auth.js";
import { config } from "../config.js";
export async function registerEndpoints() {
    const proxy = PLUGIN_MANAGER.proxy;
    proxy.on("httpConnection", (req, res, ctx) => {
        if (req.url.startsWith("/eagpaas/metadata")) {
            ctx.handled = true;
            res.writeHead(200).end(JSON.stringify({
                branding: "EagProxyAAS",
                version: "1",
            }));
        }
        else if (req.url.startsWith("/eagpaas/validate")) {
            ctx.handled = true;
            if (config.authentication.enabled) {
                if (req.headers["authorization"] !== `Basic ${config.authentication.password}`) {
                    return res.writeHead(403).end(JSON.stringify({
                        success: false,
                        reason: "Access Denied",
                    }));
                }
            }
            res.writeHead(200).end(JSON.stringify({
                success: true,
            }));
        }
    });
    proxy.on("wsConnection", (ws, req, ctx) => {
        try {
            if (req.url.startsWith("/eagpaas/token")) {
                ctx.handled = true;
                if (config.authentication.enabled) {
                    if (req.headers.authorization !== `Basic ${config.authentication.password}`) {
                        ws.send(JSON.stringify({
                            type: "ERROR",
                            error: "Access Denied",
                        }));
                        ws.close();
                        return;
                    }
                }
                const quit = { quit: false }, authHandler = auth(quit), codeCallback = (code) => {
                    ws.send(JSON.stringify({
                        type: "CODE",
                        data: code,
                    }));
                };
                ws.once("close", () => {
                    quit.quit = true;
                });
                authHandler
                    .on("code", codeCallback)
                    .on("error", (err) => {
                    ws.send(JSON.stringify({
                        type: "ERROR",
                        reason: err,
                    }));
                    ws.close();
                })
                    .on("done", (result) => {
                    ws.send(JSON.stringify({
                        type: "COMPLETE",
                        data: result,
                    }));
                    ws.close();
                });
            }
            else if (req.url.startsWith("/eagpaas/ping")) {
                ctx.handled = true;
                if (config.authentication.enabled) {
                    if (req.headers.authorization !== `Basic ${config.authentication.password}`) {
                        ws.send(JSON.stringify({
                            type: "ERROR",
                            error: "Access Denied",
                        }));
                        ws.close();
                        return;
                    }
                }
                ws.once("message", (_) => {
                    ws.send(_);
                    ws.close();
                });
            }
        }
        catch (err) { }
    });
}
