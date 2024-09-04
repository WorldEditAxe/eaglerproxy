import BucketRateLimiter from "./BucketRatelimiter.js";
export default class ProxyRatelimitManager {
    http;
    motd;
    ws;
    connect;
    skinsIP;
    skinsConnection;
    constructor(config) {
        this.http = new BucketRateLimiter(config.limits.http, config.limits.http);
        this.ws = new BucketRateLimiter(config.limits.ws, config.limits.ws);
        this.motd = new BucketRateLimiter(config.limits.motd, config.limits.motd);
        this.connect = new BucketRateLimiter(config.limits.connect, config.limits.connect);
        this.skinsIP = new BucketRateLimiter(config.limits.skinsIp, config.limits.skinsIp);
        this.skinsConnection = new BucketRateLimiter(config.limits.skins, config.limits.skins);
    }
}
