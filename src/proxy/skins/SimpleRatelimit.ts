export default class SimpleRatelimit<T> {
  readonly requestCount: number;
  readonly resetInterval: number;
  private entries: Map<T, Ratelimit>;

  constructor(requestCount: number, resetInterval: number) {
    this.requestCount = requestCount;
    this.resetInterval = resetInterval;
    this.entries = new Map();
  }

  public get(key: T): Ratelimit {
    return (
      this.entries.get(key) ?? {
        remainingRequests: this.requestCount,
        resetTime: new Date(0),
      }
    );
  }

  public consume(key: T, count?: number): Ratelimit | never {
    if (this.entries.has(key)) {
      const ratelimit = this.entries.get(key);
      if (ratelimit.remainingRequests - (count ?? 1) < 0) {
        if (this.requestCount - (count ?? 1) < 0) {
          throw new RatelimitExceededError(
            `Consume request count is higher than default available request count!`
          );
        } else {
          throw new RatelimitExceededError(
            `Ratelimit exceeded, try again in ${
              ratelimit.resetTime.getDate() - Date.now()
            } ms!`
          );
        }
      }
      ratelimit.remainingRequests -= count ?? 1;
      return ratelimit;
    } else {
      if (this.requestCount - (count ?? 1) < 0) {
        throw new RatelimitExceededError(
          `Consume request count is higher than default available request count!`
        );
      }
      const ratelimit: Ratelimit = {
        remainingRequests: this.requestCount - (count ?? 1),
        resetTime: new Date(Date.now() + this.resetInterval),
        timer: null,
      };
      this.entries.set(key, ratelimit);
      ratelimit.timer = this._onAdd(ratelimit);
      return ratelimit;
    }
  }

  private _onAdd(ratelimit: Ratelimit): NodeJS.Timer {
    return setInterval(() => {
      // TODO: work on
    }, this.resetInterval);
  }
}

export type Ratelimit = {
  remainingRequests: number;
  resetTime: Date;
  timer?: NodeJS.Timer;
};

export class RatelimitExceededError extends Error {
  constructor(message: { toString: () => string }) {
    super(message.toString());
    this.name = "RatelimitExceededError";
    Object.setPrototypeOf(this, RatelimitExceededError.prototype);
  }
}
