import path from "path";
import fs from "fs/promises";
import fss from "fs";
export default class DiskDB {
    folder;
    static VALIDATION_REGEX = /^[0-9a-zA-Z_]+$/;
    nameGenerator;
    encoder;
    decoder;
    constructor(folder, encoder, decoder, nameGenerator) {
        this.folder = path.isAbsolute(folder) ? folder : path.resolve(folder);
        this.encoder = encoder;
        this.decoder = decoder;
        this.nameGenerator = nameGenerator;
        if (!fss.existsSync(this.folder))
            fss.mkdirSync(this.folder);
    }
    async filter(f) {
        for (const file of await fs.readdir(this.folder)) {
            const fp = path.join(this.folder, file);
            if (!f(this.decoder(await fs.readFile(fp))))
                await fs.rm(fp);
        }
    }
    async get(k) {
        k = this.nameGenerator(k);
        if (!DiskDB.VALIDATION_REGEX.test(k))
            throw new InvalidKeyError("Invalid key, key can only consist of alphanumeric characters and _");
        const pth = path.join(this.folder, `${k}.data`);
        try {
            return this.decoder(await fs.readFile(pth));
        }
        catch (err) {
            return null;
        }
    }
    async set(k, v) {
        k = this.nameGenerator(k);
        if (!DiskDB.VALIDATION_REGEX.test(k))
            throw new InvalidKeyError("Invalid key, key can only consist of alphanumeric characters and _");
        const pth = path.join(this.folder, `${k}.data`);
        await fs.writeFile(pth, this.encoder(v));
    }
}
class InvalidKeyError extends Error {
    constructor(msg) {
        super(`[InvalidKeyError] : ${msg}`);
        this.name = "InvalidKeyError";
        Object.setPrototypeOf(this, InvalidKeyError);
    }
}
