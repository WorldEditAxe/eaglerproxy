import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { Util } from "./Util.js";
export async function loadPackets(dir) {
    const files = (await Util.recursiveFileSearch(dir ?? join(dirname(fileURLToPath(import.meta.url)), "packets"))).filter((f) => f.endsWith(".js") && !f.endsWith(".disabled.js"));
    const packetRegistry = new Map();
    for (const file of files) {
        const imp = await import(process.platform == "win32" ? pathToFileURL(file).toString() : file);
        for (const val of Object.values(imp)) {
            if (val != null) {
                let e;
                try {
                    e = new val();
                }
                catch { }
                if (e != null && e.type == "packet") {
                    e.class = val;
                    packetRegistry.set(e.packetId, e);
                }
            }
        }
    }
    return packetRegistry;
}
