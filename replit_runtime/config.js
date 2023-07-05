const path = require("path");
const os = require("os");

module.exports = {
  sourceDir: path.resolve(
    os.homedir(),
    path.join(process.env.REPL_SLUG, "src")
  ),
};
