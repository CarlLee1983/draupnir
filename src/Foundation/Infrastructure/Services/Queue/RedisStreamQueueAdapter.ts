import type { IRedisService } from '@/Shared/Infrastructure/IRedisService'
import type { IQueue, JobOptions } from '../../Ports/Queue/IQueue'

/**
 * Lightweight Queue Implementation using Redis Streams.
 */
export class RedisStreamQueueAdapter implements IQueue {
  private readonly groupName = 'draupnir-worker-group'
  private readonly consumerName = `worker-${crypto.randomUUID().slice(0, 8)}`
  private readonly workers = new Map<
    string,
    { handler: (payload: unknown) => Promise<void>; running: boolean }
  >()
  private isPaused = false
  private isClosed = false
  private activeHandlers = 0
  private drainResolvers: Array<() => void> = []

  constructor(private readonly redis: IRedisService) {}

  async push(name: string, payload: unknown, options?: JobOptions): Promise<string> {
    const streamKey = this.getStreamKey(name)

    // Ensure group exists
    await this.redis.xgroupCreate(streamKey, this.groupName, '$', true)

    const data = {
      payload: JSON.stringify(payload),
      timestamp: Date.now().toString(),
      jobName: options?.jobName || 'unnamed-job',
    }

    return this.redis.xadd(streamKey, data)
  }

  process(name: string, handler: (payload: unknown) => Promise<void>, _concurrency = 1): void {
    if (this.workers.has(name)) {
      throw new Error(`Worker for task '${name}' is already registered.`)
    }

    this.workers.set(name, { handler, running: true })

    // Start the consumer loop in background
    this.startWorker(name)
  }

  private async startWorker(name: string): Promise<void> {
    const streamKey = this.getStreamKey(name)
    await this.redis.xgroupCreate(streamKey, this.groupName, '$', true)

    while (!this.isClosed) {
      if (this.isPaused) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        continue
      }

      try {
        // Read from group with BLOCK
        const result = await this.redis.xreadgroup(
          this.groupName,
          this.consumerName,
          { [streamKey]: '>' },
          1,
          5000, // 5s block
        )

        if (result && result.length > 0) {
          const [_stream, entries] = result[0]
          for (const [id, fields] of entries) {
            const payloadIndex = fields.indexOf('payload')
            if (payloadIndex !== -1) {
              const payload: unknown = JSON.parse(fields[payloadIndex + 1] as string)
              const worker = this.workers.get(name)

              if (worker) {
                this.activeHandlers++
                try {
                  await worker.handler(payload)
                  await this.redis.xack(streamKey, this.groupName, id)
                } catch (err) {
                  console.error(`[Queue] Worker error in job '${id}':`, err)
                } finally {
                  this.activeHandlers--
                  if (this.isClosed && this.activeHandlers === 0) {
                    this.drainResolvers.forEach((r) => {
                      r()
                    })
                    this.drainResolvers = []
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.error(`[Queue] Worker '${name}' read error:`, err)
        await new Promise((resolve) => setTimeout(resolve, 5000))
      }
    }
  }

  async pause(): Promise<void> {
    this.isPaused = true
  }

  async resume(): Promise<void> {
    this.isPaused = false
  }

  async close(): Promise<void> {
    this.isClosed = true
    this.isPaused = true
    if (this.activeHandlers > 0) {
      await new Promise<void>((resolve) => this.drainResolvers.push(resolve))
    }
  }

  private getStreamKey(name: string): string {
    return `queue:stream:${name}`
  }
}
