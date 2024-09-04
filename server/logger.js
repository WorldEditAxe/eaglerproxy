import { Chalk } from "chalk";
const color = new Chalk({ level: 2 });
let global_verbose = false;
export function verboseLogging(newVal) {
    global_verbose = newVal ?? global_verbose ? false : true;
}
function jsonLog(type, message) {
    return (JSON.stringify({
        type: type,
        message: message,
    }) + "\n");
}
export class Logger {
    loggerName;
    verbose;
    jsonLog = process.argv.includes("--json") || process.argv.includes("-j");
    constructor(name, verbose) {
        this.loggerName = name;
        if (verbose)
            this.verbose = verbose;
        else
            this.verbose = global_verbose;
    }
    info(s) {
        if (!this.jsonLog)
            process.stdout.write(`${color.green("I")} ${color.gray(new Date().toISOString())} ${color.reset(`${color.yellow(`${this.loggerName}:`)} ${s}`)}\n`);
        else
            process.stdout.write(jsonLog("info", s));
    }
    warn(s) {
        if (!this.jsonLog)
            process.stdout.write(`${color.yellow("W")} ${color.gray(new Date().toISOString())} ${color.yellow(`${color.yellow(`${this.loggerName}:`)} ${s}`)}\n`);
        else
            process.stderr.write(jsonLog("warn", s));
    }
    error(s) {
        if (!this.jsonLog)
            process.stderr.write(`* ${color.red("E")} ${color.gray(new Date().toISOString())} ${color.redBright(`${color.red(`${this.loggerName}:`)} ${s}`)}\n`);
        else
            process.stderr.write(jsonLog("error", s));
    }
    fatal(s) {
        if (!this.jsonLog)
            process.stderr.write(`** ${color.red("F!")} ${color.gray(new Date().toISOString())} ${color.bgRedBright(color.redBright(`${color.red(`${this.loggerName}:`)} ${s}`))}\n`);
        else
            process.stderr.write(jsonLog("fatal", s));
    }
    debug(s) {
        if (this.verbose || global_verbose) {
            if (!this.jsonLog)
                process.stderr.write(`${color.gray("D")} ${color.gray(new Date().toISOString())} ${color.gray(`${color.gray(`${this.loggerName}:`)} ${s}`)}\n`);
            else
                process.stderr.write(jsonLog("debug", s));
        }
    }
}
verboseLogging(process.env.DEBUG != null && process.env.DEBUG != "false" ? true : false);
