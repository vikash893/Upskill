const { getRedisClient } = require("../config/redis");

/**
 * Enterprise In-Memory & Redis-Backed Job Queue with Concurrency & Retry
 * Designed for high throughput (millions of async tasks, notifications, webhook dispatches)
 */

class AsyncQueue {
    constructor(queueName, options = {}) {
        this.queueName = queueName;
        this.concurrency = options.concurrency || 5;
        this.maxRetries = options.maxRetries || 3;
        this.retryDelayMs = options.retryDelayMs || 1000;
        this.running = 0;
        this.localQueue = [];
        this.handler = null;
        this.isProcessing = false;
    }

    process(handler) {
        this.handler = handler;
        this.startProcessing();
    }

    async add(taskData, options = {}) {
        const job = {
            id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            data: taskData,
            attempts: 0,
            maxRetries: options.maxRetries || this.maxRetries,
            addedAt: Date.now()
        };

        const redis = getRedisClient();
        if (redis) {
            try {
                await redis.rpush(`queue:${this.queueName}`, JSON.stringify(job));
            } catch (err) {
                this.localQueue.push(job);
            }
        } else {
            this.localQueue.push(job);
        }

        this.triggerProcessing();
        return job.id;
    }

    triggerProcessing() {
        if (!this.isProcessing) {
            this.startProcessing();
        }
    }

    async startProcessing() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const loop = async () => {
            while (this.running < this.concurrency) {
                let job = null;
                const redis = getRedisClient();

                if (redis) {
                    try {
                        const raw = await redis.lpop(`queue:${this.queueName}`);
                        if (raw) job = JSON.parse(raw);
                    } catch {}
                }

                if (!job && this.localQueue.length > 0) {
                    job = this.localQueue.shift();
                }

                if (!job) break;

                this.running++;
                this.executeJob(job).finally(() => {
                    this.running--;
                    this.startProcessing();
                });
            }

            // Schedule poll check if queues are waiting
            setTimeout(() => {
                this.isProcessing = false;
                const redis = getRedisClient();
                if (this.localQueue.length > 0 || redis) {
                    this.startProcessing();
                }
            }, 500).unref();
        };

        loop().catch(() => { this.isProcessing = false; });
    }

    async executeJob(job) {
        if (!this.handler) return;
        job.attempts++;
        try {
            await this.handler(job.data, job);
        } catch (error) {
            console.error(`[Queue: ${this.queueName}] Job ${job.id} failed (attempt ${job.attempts}/${job.maxRetries}):`, error.message);
            if (job.attempts < job.maxRetries) {
                setTimeout(() => {
                    const redis = getRedisClient();
                    if (redis) {
                        redis.rpush(`queue:${this.queueName}`, JSON.stringify(job)).catch(() => this.localQueue.push(job));
                    } else {
                        this.localQueue.push(job);
                    }
                    this.triggerProcessing();
                }, this.retryDelayMs * Math.pow(2, job.attempts - 1)).unref();
            } else {
                console.error(`[Queue: ${this.queueName}] Job ${job.id} dead-lettered after ${job.maxRetries} retries.`);
            }
        }
    }
}

const queues = new Map();

function getQueue(name, options) {
    if (!queues.has(name)) {
        queues.set(name, new AsyncQueue(name, options));
    }
    return queues.get(name);
}

module.exports = {
    AsyncQueue,
    getQueue
};
