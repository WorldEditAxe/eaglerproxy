import { ServerDeviceCodeResponse, auth } from "../auth.js";
import { config } from "../config.js";

const LINK_STR = `
<!doctype html>
<html>
  <head>
    <title>EagPAAS - Connect</title>
    <style>
      :root {
        font-family: "Arial";
      }
      code {
        padding: 3px 10px 3px 10px;
        border-radius: 5px;
        font-family: monospace;
        background-color: #1a1a1a;
        color: white;
        white-space: pre-wrap;
      }
    </style>
    <script type="text/javascript">
      window.addEventListener("load", () => {
      let param = new URLSearchParams(window.location.search),
      	url = param.get("url")
      if (url == null) url = "ERROR!"
      else {
      	try {
        const parsed = new URL(url), session = JSON.parse(parsed.searchParams.get("session"))
        if (session.expires_on < Date.now()) {
        	url = "EXPIRED: get a new link!"
        }
        } catch (_e) {
        	console.error(_e)
        }
      }
      
        document.getElementById("connect-url").innerHTML =
          url.replace(
            "wss:",
            window.location.protocol == "wss:" ? "wss:" : "ws:",
          )
       const parsedURL = new URL(url)
        document.getElementById("connect-url-vanilla").innerHTML =
         	"vanilla+online://" + parsedURL.searchParams.get("ip") + ":" + parsedURL.searchParams.get("port") + "/?session=" + parsedURL.searchParams.get("session")
      })
    </script>
  </head>
  <body>
    <h1>EagPAAS - Connect to Server</h1>
    <p>
      Hello there! To connect to this Minecraft server through a server list entry,
      use this URL: (connect from any recent
      EaglercraftX client via Multiplayer > Direct Connect)
      <br><br><code id="connect-url">loading...</code><br><br>
      
      If your Eaglercraft client supports <code>vanilla://</code> URLs, this will also work:
      <br><br><code id="connect-url-vanilla">loading...</code><br><br>
      
      Note that your session will eventually expire, and you will need to log back in again.
    </p>
  </body>
</html>

`;

export async function registerEndpoints() {
  const proxy = PLUGIN_MANAGER.proxy;
  proxy.on("httpConnection", (req, res, ctx) => {
    if (req.url.startsWith("/eagpaas/link")) {
      ctx.handled = true;
      res.setHeader("Content-Type", "text/html").writeHead(200).end(LINK_STR);
    } else if (req.url.startsWith("/eagpaas/metadata")) {
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

  proxy.on("wsConnection", (ws, req, ctx) => {
    try {
      if (req.url.startsWith("/eagpaas/token")) {
        ctx.handled = true;
        if (config.authentication.enabled) {
          if (req.headers.authorization !== `Basic ${config.authentication.password}`) {
            ws.send(
              JSON.stringify({
                type: "ERROR",
                error: "Access Denied",
              })
            );
            ws.close();
            return;
          }
        }

        const quit = { quit: false },
          authHandler = auth(quit),
          codeCallback = (code: ServerDeviceCodeResponse) => {
            ws.send(
              JSON.stringify({
                type: "CODE",
                data: code,
              })
            );
          };
        ws.once("close", () => {
          quit.quit = true;
        });
        authHandler
          .on("code", codeCallback)
          .on("error", (err) => {
            ws.send(
              JSON.stringify({
                type: "ERROR",
                reason: err,
              })
            );
            ws.close();
          })
          .on("done", (result) => {
            ws.send(
              JSON.stringify({
                type: "COMPLETE",
                data: result,
              })
            );
            ws.close();
          });
      } else if (req.url.startsWith("/eagpaas/ping")) {
        ctx.handled = true;
        if (config.authentication.enabled) {
          if (req.headers.authorization !== `Basic ${config.authentication.password}`) {
            ws.send(
              JSON.stringify({
                type: "ERROR",
                error: "Access Denied",
              })
            );
            ws.close();
            return;
          }
        }

        ws.once("message", (_) => {
          ws.send(_);
          ws.close();
        });
      }
    } catch (err) {}
  });
}
