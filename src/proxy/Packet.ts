import { readdir } from "fs/promises";
import { dirname, join, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { Enums } from "./Enums.js";
import { Util } from "./Util.js";

export default interface Packet {
  packetId: Enums.PacketId;
  type: "packet";
  boundTo: Enums.PacketBounds;
  sentAfterHandshake: boolean;

  serialize: () => Buffer;
  deserialize: (packet: Buffer) => this;
}

export async function loadPackets(
  dir?: string
): Promise<Map<Enums.PacketId, Packet & { class: any }>> {
  const files = (
    await Util.recursiveFileSearch(
      dir ?? join(dirname(fileURLToPath(import.meta.url)), "packets")
    )
  ).filter((f) => f.endsWith(".js") && !f.endsWith(".disabled.js"));
  const packetRegistry = new Map();
  for (const file of files) {
    const imp = await import(
      process.platform == "win32" ? pathToFileURL(file).toString() : file
    );
    for (const val of Object.values(imp)) {
      if (val != null) {
        let e: Packet;
        try {
          e = new (val as any)();
        } catch {}
        if (e != null && e.type == "packet") {
          (e as any).class = val;
          packetRegistry.set(e.packetId, e);
        }
      }
    }
  }
  return packetRegistry;
}
