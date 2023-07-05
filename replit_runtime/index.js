// libraries
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { sourceDir } = require("./config.js");

class Logger {
  constructor({ name, logDebug }) {
    this.name = name;
    this.debug = logDebug;
  }

  _log(logType, data, method) {
    console[method](
      `[${this.name}] [${logType}] ${
        typeof data == "string" ? data : data.toString()
      }`
    );
  }

  info(data) {
    this._log("info", data, "log");
  }

  warn(data) {
    this._log("warn", data, "error");
  }

  error(data) {
    this._log("error", data, "error");
  }

  debug(data) {
    if (this.debug) {
      this._log("debug", data, "error");
    }
  }
}

async function recursiveFileSearch(dir) {
  const fileList = [];
  for (const file of await fs.readdir(dir, { withFileTypes: true })) {
    let pathDir = path.resolve(dir, file.name);
    if (file.isFile()) {
      fileList.push(pathDir);
    } else if (file.isDirectory()) {
      fileList.push(...(await recursiveFileSearch(pathDir)));
    } else {
      logger.warn(
        `Found directory entry that is neither a file or directory (${pathDir}), ignoring!`
      );
    }
  }
  return fileList;
}

const logger = new Logger({
    name: "launcher",
    logDebug: process.env.DEBUG == "true",
  }),
  LINE_SEPERATOR = "-----------------------------------";

if (!process.env.REPL_SLUG) {
  logger.error(LINE_SEPERATOR);
  logger.error("Repl not detected!");
  logger.error("");
  logger.error("This file is meant to be ran in a Repl");
  logger.error(LINE_SEPERATOR);
}

logger.info(LINE_SEPERATOR);
logger.info("Checking if the proxy needs to be recompiled...");
logger.info(LINE_SEPERATOR);

fs.readFile(path.join(__dirname, ".sourcehash"))
  .then((data) => {
    let oldHash = data.toString();
    logger.info("Found old hash, calculating hash of source files...");
    recursiveFileSearch(sourceDir)
      .then((files) => {
        Promise.all(files.map((f) => fs.readFile(f))).then((data) => {
          const hash = crypto.createHash("sha256");
          data.forEach((d) => hash.update(d));
          let sourceHash = hash.digest().toString();

          if (sourceHash === oldHash) {
            logger.info("Source hasn't been changed, skipping compilation...");
            process.exit(0);
          } else {
            logger.info("Source has been changed, recompiling...");
            fs.writeFile(path.join(__dirname, ".sourcehash"), sourceHash)
              .then(() => {
                process.exit(2);
              })
              .catch((err) => {
                logger.error(`Could not write new hash to disk!\n${err.stack}`);
                process.exit(1);
              });
          }
        });
      })
      .catch((err) => {
        logger.error(
          `Could not calculate file hashes for files in directory ${sourceDir}!\n${err.stack}`
        );
        process.exit(1);
      });
  })
  .catch((err) => {
    if (err.code == "ENOENT") {
      logger.warn(
        "Previous source hash not found! Assuming a clean install is being used."
      );
      logger.info("Calculating hash...");
      recursiveFileSearch(sourceDir)
        .then((files) => {
          Promise.all(files.map((f) => fs.readFile(f))).then((data) => {
            const hash = crypto.createHash("sha256");
            data.forEach((d) => hash.update(d));
            let sourceHash = hash.digest().toString();
            fs.writeFile(path.join(__dirname, ".sourcehash"), sourceHash)
              .then(() => {
                logger.info("Saved hash to disk.");
                process.exit(2);
              })
              .catch((err) => {
                logger.error(`Could not write new hash to disk!\n${err.stack}`);
                process.exit(1);
              });
          });
        })
        .catch((err) => {
          logger.error(
            `Could not calculate file hashes for files in directory ${sourceDir}!\n${err.stack}`
          );
          process.exit(1);
        });
    } else {
      logger.error(
        `Could not read .sourcehash file in ${path.join(
          __dirname,
          ".sourcehash"
        )} due to an unknown error! Try again with a clean repl?\n${err.stack}`
      );
      process.exit(1);
    }
  });
