const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

export default class ExponentialBackoffRequestController {
  public queue: Task[];
  public flushQueueAfterTries: number;
  public baseDelay: number;
  ended: boolean;
  aborted: boolean;

  constructor(baseDelay: number = 3000, triesBeforeFlush: number = 10) {
    this.flushQueueAfterTries = triesBeforeFlush;
    this.baseDelay = baseDelay;
    this.queue = [];
    this.ended = false;
    this.aborted = false;
    setTimeout(() => this.tick(), 0);
  }

  private async tick() {
    while (true) {
      if (this.ended) break;
      for (const task of this.queue) {
        if (this.ended || this.aborted) break;
        let times = 0,
          breakOut = false;
        while (true) {
          try {
            await task();
            break;
          } catch (err) {
            times++;
            await wait(this.baseDelay * 2 ** times);
            if (times > this.flushQueueAfterTries) {
              this.queue.forEach((task) => task(new Error("Controller overload!")));
              breakOut = true;
              break;
            }
          }
        }
        if (breakOut) break;
      }
      if (this.aborted) this.aborted = false;
      this.queue = [];
      await wait(1);
    }
  }

  public end() {
    this.ended = true;
  }

  public flush() {
    this.aborted = false;
    this.queue.forEach((task) => task(new Error("Aborted")));
    this.queue = [];
  }

  public queueTask(task: Task): void {
    this.queue.push(task);
  }
}

type Task = (err?: object) => void | Promise<void>;
