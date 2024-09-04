export default class BucketRateLimiter {
    capacity;
    refillsPerMin;
    keyMap;
    static GC_TOLERANCE = 50;
    sweeper;
    constructor(capacity, refillsPerMin) {
        this.capacity = capacity;
        this.refillsPerMin = refillsPerMin;
        this.keyMap = new Map();
        this.sweeper = setInterval(() => {
            this.removeFull();
        }, 5000);
    }
    cleanUp() {
        clearInterval(this.sweeper);
    }
    consume(key, consumeTokens = 1) {
        if (this.keyMap.has(key)) {
            const bucket = this.keyMap.get(key);
            const now = Date.now();
            if (now - bucket.lastRefillTime > 60000 && bucket.tokens < this.capacity) {
                const refillTimes = Math.floor((now - bucket.lastRefillTime) / 60000);
                bucket.tokens = Math.min(this.capacity, bucket.tokens + refillTimes * this.refillsPerMin);
                bucket.lastRefillTime = now - (refillTimes % 60000);
            }
            else if (now - bucket.lastRefillTime > 60000 && bucket.tokens >= this.capacity)
                bucket.lastRefillTime = now;
            if (bucket.tokens >= consumeTokens) {
                bucket.tokens -= consumeTokens;
                return { success: true };
            }
            else {
                const difference = consumeTokens - bucket.tokens;
                return {
                    success: false,
                    missingTokens: difference,
                    retryIn: Math.ceil(difference / this.refillsPerMin) * 60000 - ((now - bucket.lastRefillTime) % 60000),
                    retryAt: Date.now() + Math.ceil(difference / this.refillsPerMin) * 60000 - ((now - bucket.lastRefillTime) % 60000),
                };
            }
        }
        else {
            const bucket = {
                tokens: this.capacity,
                lastRefillTime: Date.now(),
            };
            if (bucket.tokens >= consumeTokens) {
                bucket.tokens -= consumeTokens;
                this.keyMap.set(key, bucket);
                return { success: true };
            }
            else {
                const difference = consumeTokens - bucket.tokens;
                const now = Date.now();
                return {
                    success: false,
                    missingTokens: difference,
                    retryIn: Math.ceil(difference / this.refillsPerMin) * 60000 - ((now - bucket.lastRefillTime) % 60000),
                    retryAt: Date.now() + Math.ceil(difference / this.refillsPerMin) * 60000 - ((now - bucket.lastRefillTime) % 60000),
                };
            }
        }
    }
    addToBucket(key, amount) {
        if (this.keyMap.has(key)) {
            this.keyMap.get(key).tokens += amount;
        }
        else {
            this.keyMap.set(key, {
                tokens: this.capacity + amount,
                lastRefillTime: Date.now(),
            });
        }
    }
    setBucketSize(key, amount) {
        if (this.keyMap.has(key)) {
            this.keyMap.get(key).tokens = amount;
        }
        else {
            this.keyMap.set(key, {
                tokens: amount,
                lastRefillTime: Date.now(),
            });
        }
    }
    subtractFromBucket(key, amount) {
        if (this.keyMap.has(key)) {
            const bucket = this.keyMap.get(key);
            bucket.tokens -= amount;
        }
        else {
            this.keyMap.set(key, {
                tokens: this.capacity - amount,
                lastRefillTime: Date.now(),
            });
        }
    }
    removeFull() {
        let remove = [];
        const now = Date.now();
        this.keyMap.forEach((v, k) => {
            if (now - v.lastRefillTime > 60000 && v.tokens < this.capacity) {
                const refillTimes = Math.floor((now - v.lastRefillTime) / 60000);
                v.tokens = Math.min(this.capacity, v.tokens + refillTimes * this.refillsPerMin);
                v.lastRefillTime = now - (refillTimes % 60000);
            }
            else if (now - v.lastRefillTime > 60000 && v.tokens >= this.capacity)
                v.lastRefillTime = now;
            if (v.tokens == this.capacity) {
                remove.push(k);
            }
        });
        remove.forEach((v) => this.keyMap.delete(v));
    }
}
