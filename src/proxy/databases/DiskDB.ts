import path from "path";
import fs from "fs/promises";
import fss from "fs";

export default class DiskDB<T extends any> {
  public folder: string;
  static VALIDATION_REGEX = /^[0-9a-zA-Z_]+$/;

  nameGenerator: (k: string) => string;
  encoder: (key: T) => Buffer;
  decoder: (enc: Buffer) => T;

  constructor(folder: string, encoder: (key: T) => Buffer, decoder: (enc: Buffer) => T, nameGenerator: (k: string) => string) {
    this.folder = path.isAbsolute(folder) ? folder : path.resolve(folder);
    this.encoder = encoder;
    this.decoder = decoder;
    this.nameGenerator = nameGenerator;
    if (!fss.existsSync(this.folder)) fss.mkdirSync(this.folder);
  }

  public async filter(f: (v: T) => boolean) {
    for (const file of await fs.readdir(this.folder)) {
      const fp = path.join(this.folder, file);
      if (!f(this.decoder(await fs.readFile(fp)))) await fs.rm(fp);
    }
  }

  public async get(k: string): Promise<T | null> {
    k = this.nameGenerator(k);
    if (!DiskDB.VALIDATION_REGEX.test(k)) throw new InvalidKeyError("Invalid key, key can only consist of alphanumeric characters and _");
    const pth = path.join(this.folder, `${k}.data`);
    try {
      return this.decoder(await fs.readFile(pth));
    } catch (err) {
      return null;
    }
  }

  public async set(k: string, v: T) {
    k = this.nameGenerator(k);
    if (!DiskDB.VALIDATION_REGEX.test(k)) throw new InvalidKeyError("Invalid key, key can only consist of alphanumeric characters and _");
    const pth = path.join(this.folder, `${k}.data`);
    await fs.writeFile(pth, this.encoder(v));
  }
}

class InvalidKeyError extends Error {
  constructor(msg: string) {
    super(`[InvalidKeyError] : ${msg}`);
    this.name = "InvalidKeyError";
    Object.setPrototypeOf(this, InvalidKeyError);
  }
}
