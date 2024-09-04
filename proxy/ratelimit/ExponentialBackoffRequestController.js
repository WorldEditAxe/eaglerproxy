const wait = (ms) => new Promise((res) => setTimeout(res, ms));
export default class ExponentialBackoffRequestController {
    queue;
    flushQueueAfterTries;
    baseDelay;
    ended;
    aborted;
    constructor(baseDelay = 3000, triesBeforeFlush = 10) {
        this.flushQueueAfterTries = triesBeforeFlush;
        this.baseDelay = baseDelay;
        this.queue = [];
        this.ended = false;
        this.aborted = false;
        setTimeout(() => this.tick(), 0);
    }
    async tick() {
        while (true) {
            if (this.ended)
                break;
            for (const task of this.queue) {
                if (this.ended || this.aborted)
                    break;
                let times = 0, breakOut = false;
                while (true) {
                    try {
                        await task();
                        break;
                    }
                    catch (err) {
                        times++;
                        await wait(this.baseDelay * 2 ** times);
                        if (times > this.flushQueueAfterTries) {
                            this.queue.forEach((task) => task(new Error("Controller overload!")));
                            breakOut = true;
                            break;
                        }
                    }
                }
                if (breakOut)
                    break;
            }
            if (this.aborted)
                this.aborted = false;
            this.queue = [];
            await wait(1);
        }
    }
    end() {
        this.ended = true;
    }
    flush() {
        this.aborted = false;
        this.queue.forEach((task) => task(new Error("Aborted")));
        this.queue = [];
    }
    queueTask(task) {
        this.queue.push(task);
    }
}
