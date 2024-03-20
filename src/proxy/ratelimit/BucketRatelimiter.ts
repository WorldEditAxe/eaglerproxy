export default class BucketRateLimiter {
  public capacity: number;
  public refillsPerMin: number;
  public keyMap: Map<string, KeyData>;
  public static readonly GC_TOLERANCE: number = 50;

  constructor(capacity: number, refillsPerMin: number) {
    this.capacity = capacity;
    this.refillsPerMin = refillsPerMin;
    this.keyMap = new Map();
  }

  public consume(key: string, consumeTokens: number = 1): RateLimitData {
    if (this.keyMap.size > BucketRateLimiter.GC_TOLERANCE) this.removeFull();
    if (this.keyMap.has(key)) {
      const bucket = this.keyMap.get(key);

      // refill bucket as needed
      const now = Date.now();
      if (now - bucket.lastRefillTime > 60000) {
        const refillTimes = Math.floor((now - bucket.lastRefillTime) / 60000);
        bucket.tokens += refillTimes * this.refillsPerMin;
        bucket.lastRefillTime = now - (refillTimes % 60000);
      }

      if (bucket.tokens >= consumeTokens) {
        bucket.tokens -= consumeTokens;
        return { success: true };
      } else {
        const difference = consumeTokens - bucket.tokens;
        return {
          success: false,
          missingTokens: difference,
          retryIn: Math.ceil(difference / this.refillsPerMin) * 60000 - ((now - bucket.lastRefillTime) % 60000),
          retryAt: Date.now() + Math.ceil(difference / this.refillsPerMin) * 60000 - ((now - bucket.lastRefillTime) % 60000),
        };
      }
    } else {
      const bucket: KeyData = {
        tokens: this.capacity,
        lastRefillTime: Date.now(),
      };
      if (bucket.tokens >= consumeTokens) {
        bucket.tokens -= consumeTokens;
        this.keyMap.set(key, bucket);
        return { success: true };
      } else {
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

  public addToBucket(key: string, amount: number) {
    if (this.keyMap.has(key)) {
      this.keyMap.get(key).tokens += amount;
    } else {
      this.keyMap.set(key, {
        tokens: this.capacity + amount,
        lastRefillTime: Date.now(),
      });
    }
  }

  public setBucketSize(key: string, amount: number) {
    if (this.keyMap.has(key)) {
      this.keyMap.get(key).tokens = amount;
    } else {
      this.keyMap.set(key, {
        tokens: amount,
        lastRefillTime: Date.now(),
      });
    }
  }

  public subtractFromBucket(key: string, amount: number) {
    if (this.keyMap.has(key)) {
      const bucket = this.keyMap.get(key);
      bucket.tokens -= amount;
    } else {
      this.keyMap.set(key, {
        tokens: this.capacity - amount,
        lastRefillTime: Date.now(),
      });
    }
  }

  public removeFull() {
    let remove: string[] = [];
    this.keyMap.forEach((v, k) => {
      if (v.tokens == this.capacity) {
        remove.push(k);
      }
    });
    remove.forEach((v) => this.keyMap.delete(v));
  }
}

type RateLimitData = {
  success: boolean;
  missingTokens?: number;
  retryIn?: number;
  retryAt?: number;
};

type KeyData = {
  tokens: number;
  lastRefillTime: number;
};
