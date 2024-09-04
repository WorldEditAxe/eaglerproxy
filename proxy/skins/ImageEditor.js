import { Logger } from "../../logger.js";
import { Constants } from "../Constants.js";
import fs from "fs/promises";
let Jimp = null;
let sharp = null;
export var ImageEditor;
(function (ImageEditor) {
    let loadedLibraries = false;
    async function loadLibraries(native) {
        if (loadedLibraries)
            return;
        if (native)
            sharp = (await import("sharp")).default;
        else {
            try {
                Jimp = (await import("jimp")).default;
            }
            catch (err) {
                const logger = new Logger("ImageEditor.js");
                logger.fatal("**** ERROR: UNABLE TO LOAD JIMP!");
                logger.fatal("Please ensure that Jimp is installed by running 'npm install jimp' in the terminal.");
                logger.fatal("If you'd like to use the faster native image editor, please set the 'useNatives' option in the config to true.");
                logger.fatal(`Error: ${err.stack}`);
                process.exit(1);
            }
            Jimp.appendConstructorOption("Custom Bitmap Constructor", (args) => args[0] && args[0].width != null && args[0].height != null && args[0].data != null, (res, rej, args) => {
                this.bitmap = args[0];
                res();
            });
        }
        loadedLibraries = true;
    }
    ImageEditor.loadLibraries = loadLibraries;
    async function copyRawPixelsJS(imageIn, imageOut, dx1, dy1, dx2, dy2, sx1, sy1, sx2, sy2) {
        console.log(imageOut);
        if (dx1 > dx2) {
            return _copyRawPixelsJS(imageIn, imageOut, sx1, sy1, dx2, dy1, sx2 - sx1, sy2 - sy1, imageIn.getWidth(), imageOut.getWidth(), true);
        }
        else {
            return _copyRawPixelsJS(imageIn, imageOut, sx1, sy1, dx2, dy1, sx2 - sx1, sy2 - sy1, imageIn.getWidth(), imageOut.getWidth(), false);
        }
    }
    ImageEditor.copyRawPixelsJS = copyRawPixelsJS;
    // async function _copyRawPixelsJS(imageIn: Jimp, imageOut: Jimp, srcX: number, srcY: number, dstX: number, dstY: number, width: number, height: number, imgSrcWidth: number, imgDstWidth: number, flip: boolean): Promise<Jimp> {
    //   const inData = imageIn.bitmap.data,
    //     outData = imageOut.bitmap.data;
    //   for (let y = 0; y < height; y++) {
    //     for (let x = 0; x < width; x++) {
    //       let srcIndex = (srcY + y) * imgSrcWidth + srcX + x;
    //       let dstIndex = (dstY + y) * imgDstWidth + dstX + x;
    //       if (flip) {
    //         srcIndex = (srcY + y) * imgSrcWidth + srcX + (width - x - 1);
    //       }
    //       for (let c = 0; c < 4; c++) {
    //         // Assuming RGBA channels
    //         outData[dstIndex * 4 + c] = inData[srcIndex * 4 + c];
    //       }
    //     }
    //   }
    //   return imageOut;
    //   // return sharp(outData, {
    //   //   raw: {
    //   //     width: outMeta.width!,
    //   //     height: outMeta.height!,
    //   //     channels: 4,
    //   //   },
    //   // });
    // }
    async function _copyRawPixelsJS(imageIn, imageOut, srcX, srcY, dstX, dstY, width, height, imgSrcWidth, imgDstWidth, flip) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let srcIndex = (srcY + y) * imgSrcWidth + srcX + x;
                if (flip) {
                    srcIndex = (srcY + y) * imgSrcWidth + srcX + (width - x - 1);
                }
                const pixelColor = imageIn.getPixelColor(srcX + x, srcY + y);
                const rgba = Jimp.intToRGBA(pixelColor);
                imageOut.setPixelColor(Jimp.rgbaToInt(rgba.r, rgba.g, rgba.b, rgba.a), dstX + x, dstY + y);
            }
        }
        return imageOut;
    }
    async function copyRawPixels(imageIn, imageOut, dx1, dy1, dx2, dy2, sx1, sy1, sx2, sy2) {
        const inMeta = await imageIn.metadata(), outMeta = await imageOut.metadata();
        if (dx1 > dx2) {
            return _copyRawPixels(imageIn, imageOut, sx1, sy1, dx2, dy1, sx2 - sx1, sy2 - sy1, inMeta.width, outMeta.width, true);
        }
        else {
            return _copyRawPixels(imageIn, imageOut, sx1, sy1, dx1, dy1, sx2 - sx1, sy2 - sy1, inMeta.width, outMeta.width, false);
        }
    }
    ImageEditor.copyRawPixels = copyRawPixels;
    async function _copyRawPixels(imageIn, imageOut, srcX, srcY, dstX, dstY, width, height, imgSrcWidth, imgDstWidth, flip) {
        const inData = await imageIn.raw().toBuffer();
        const outData = await imageOut.raw().toBuffer();
        const outMeta = await imageOut.metadata();
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let srcIndex = (srcY + y) * imgSrcWidth + srcX + x;
                let dstIndex = (dstY + y) * imgDstWidth + dstX + x;
                if (flip) {
                    srcIndex = (srcY + y) * imgSrcWidth + srcX + (width - x - 1);
                }
                for (let c = 0; c < 4; c++) {
                    // Assuming RGBA channels
                    outData[dstIndex * 4 + c] = inData[srcIndex * 4 + c];
                }
            }
        }
        return sharp(outData, {
            raw: {
                width: outMeta.width,
                height: outMeta.height,
                channels: 4,
            },
        });
    }
    async function toEaglerSkinJS(image) {
        let jimpImage = await Jimp.read(image), height = jimpImage.getHeight();
        if (height != 64) {
            // assume 32 height skin
            let imageOut = await Jimp.create(64, 64, 0x0);
            for (let x = 0; x < jimpImage.getWidth(); x++) {
                for (let y = 0; y < jimpImage.getHeight(); y++) {
                    imageOut.setPixelColor(jimpImage.getPixelColor(x, y), x, y);
                }
            }
            imageOut = await copyRawPixelsJS(jimpImage, imageOut, 24, 48, 20, 52, 4, 16, 8, 20);
            imageOut = await copyRawPixelsJS(jimpImage, imageOut, 28, 48, 24, 52, 8, 16, 12, 20);
            imageOut = await copyRawPixelsJS(jimpImage, imageOut, 20, 52, 16, 64, 8, 20, 12, 32);
            imageOut = await copyRawPixelsJS(jimpImage, imageOut, 24, 52, 20, 64, 4, 20, 8, 32);
            imageOut = await copyRawPixelsJS(jimpImage, imageOut, 28, 52, 24, 64, 0, 20, 4, 32);
            imageOut = await copyRawPixelsJS(jimpImage, imageOut, 32, 52, 28, 64, 12, 20, 16, 32);
            imageOut = await copyRawPixelsJS(jimpImage, imageOut, 40, 48, 36, 52, 44, 16, 48, 20);
            imageOut = await copyRawPixelsJS(jimpImage, imageOut, 44, 48, 40, 52, 48, 16, 52, 20);
            imageOut = await copyRawPixelsJS(jimpImage, imageOut, 36, 52, 32, 64, 48, 20, 52, 32);
            imageOut = await copyRawPixelsJS(jimpImage, imageOut, 40, 52, 36, 64, 44, 20, 48, 32);
            imageOut = await copyRawPixelsJS(jimpImage, imageOut, 44, 52, 40, 64, 40, 20, 44, 32);
            imageOut = await copyRawPixelsJS(jimpImage, imageOut, 48, 52, 44, 64, 52, 20, 56, 32);
            jimpImage = imageOut;
        }
        const newBuff = Buffer.alloc(Constants.EAGLERCRAFT_SKIN_CUSTOM_LENGTH);
        const bitmap = jimpImage.bitmap.data;
        for (let i = 1; i < 64 ** 2; i++) {
            const bytePos = i * 4;
            // red, green, blue, alpha => alpha, blue, green, red
            newBuff[bytePos] = bitmap[bytePos + 3];
            newBuff[bytePos + 1] = bitmap[bytePos + 2];
            newBuff[bytePos + 2] = bitmap[bytePos + 1];
            newBuff[bytePos + 3] = bitmap[bytePos];
        }
        return newBuff;
    }
    ImageEditor.toEaglerSkinJS = toEaglerSkinJS;
    async function toEaglerSkin(image) {
        const meta = await sharp(image).metadata();
        let sharpImage = sharp(image);
        if (meta.height != 64) {
            // assume 32 height skin
            let imageOut = sharp(await sharpImage.extend({ bottom: 32, background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer());
            imageOut = await copyRawPixels(sharpImage, imageOut, 24, 48, 20, 52, 4, 16, 8, 20);
            imageOut = await copyRawPixels(sharpImage, imageOut, 28, 48, 24, 52, 8, 16, 12, 20);
            imageOut = await copyRawPixels(sharpImage, imageOut, 20, 52, 16, 64, 8, 20, 12, 32);
            imageOut = await copyRawPixels(sharpImage, imageOut, 24, 52, 20, 64, 4, 20, 8, 32);
            imageOut = await copyRawPixels(sharpImage, imageOut, 28, 52, 24, 64, 0, 20, 4, 32);
            imageOut = await copyRawPixels(sharpImage, imageOut, 32, 52, 28, 64, 12, 20, 16, 32);
            imageOut = await copyRawPixels(sharpImage, imageOut, 40, 48, 36, 52, 44, 16, 48, 20);
            imageOut = await copyRawPixels(sharpImage, imageOut, 44, 48, 40, 52, 48, 16, 52, 20);
            imageOut = await copyRawPixels(sharpImage, imageOut, 36, 52, 32, 64, 48, 20, 52, 32);
            imageOut = await copyRawPixels(sharpImage, imageOut, 40, 52, 36, 64, 44, 20, 48, 32);
            imageOut = await copyRawPixels(sharpImage, imageOut, 44, 52, 40, 64, 40, 20, 44, 32);
            imageOut = await copyRawPixels(sharpImage, imageOut, 48, 52, 44, 64, 52, 20, 56, 32);
            sharpImage = imageOut;
        }
        const r = await sharpImage.extractChannel("red").raw({ depth: "uchar" }).toBuffer();
        const g = await sharpImage.extractChannel("green").raw({ depth: "uchar" }).toBuffer();
        const b = await sharpImage.extractChannel("blue").raw({ depth: "uchar" }).toBuffer();
        const a = await sharpImage.ensureAlpha().extractChannel(3).toColorspace("b-w").raw({ depth: "uchar" }).toBuffer();
        const newBuff = Buffer.alloc(Constants.EAGLERCRAFT_SKIN_CUSTOM_LENGTH);
        for (let i = 1; i < 64 ** 2; i++) {
            const bytePos = i * 4;
            newBuff[bytePos] = a[i];
            newBuff[bytePos + 1] = b[i];
            newBuff[bytePos + 2] = g[i];
            newBuff[bytePos + 3] = r[i];
        }
        return newBuff;
    }
    ImageEditor.toEaglerSkin = toEaglerSkin;
    function generateEaglerMOTDImage(file) {
        return new Promise((res, rej) => {
            sharp(file)
                .resize(Constants.ICON_SQRT, Constants.ICON_SQRT, {
                kernel: "nearest",
            })
                .raw({
                depth: "uchar",
            })
                .toBuffer()
                .then((buff) => {
                for (const pixel of buff) {
                    if ((pixel & 0xffffff) == 0) {
                        buff[buff.indexOf(pixel)] = 0;
                    }
                }
                res(buff);
            })
                .catch(rej);
        });
    }
    ImageEditor.generateEaglerMOTDImage = generateEaglerMOTDImage;
    function generateEaglerMOTDImageJS(file) {
        return new Promise(async (res, rej) => {
            Jimp.read(typeof file == "string" ? await fs.readFile(file) : file, async (err, image) => {
                image = image.resize(Constants.ICON_SQRT, Constants.ICON_SQRT, Jimp.RESIZE_NEAREST_NEIGHBOR);
                res(image.bitmap.data);
            });
        });
    }
    ImageEditor.generateEaglerMOTDImageJS = generateEaglerMOTDImageJS;
})(ImageEditor || (ImageEditor = {}));
