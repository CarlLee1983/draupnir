import type { IRedisService } from '@/Shared/Infrastructure/IRedisService'
import type { IQueue, JobOptions } from '../../Ports/Queue/IQueue'

/**
 * Lightweight Queue Implementation using Redis Streams.
 *
 * @remarks
 * This adapter uses Redis Streams for persistent job storage and Consumer Groups
 * for reliable job delivery to multiple worker instances.
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

  /**
   * Initializes the queue adapter with a Redis service.
   *
   * @param redis - The underlying Redis service implementation
   */
  constructor(private readonly redis: IRedisService) {}

  /**
   * Pushes a new job into the Redis Stream.
   *
   * @param name - Task type name (used as the stream identifier)
   * @param payload - Data to be processed by the worker
   * @param options - Optional job execution parameters
   * @returns The generated Redis Stream message ID
   */
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

  /**
   * Registers a task handler and starts the background consumption loop.
   *
   * @param name - Task type name to process
   * @param handler - Function to process individual job payloads
   * @param _concurrency - Optional concurrency limit (currently unused)
   */
  process(name: string, handler: (payload: unknown) => Promise<void>, _concurrency = 1): void {
    if (this.workers.has(name)) {
      throw new Error(`Worker for task '${name}' is already registered.`)
    }

    this.workers.set(name, { handler, running: true })

    // Start the consumer loop in background
    this.startWorker(name)
  }

  /**
   * Internal loop for reading and processing jobs from a Redis Stream.
   *
   * @param name - The task type name being processed
   */
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

  /**
   * Pauses all workers. New jobs will not be picked up until resume() is called.
   */
  async pause(): Promise<void> {
    this.isPaused = true
  }

  /**
   * Resumes all workers after a pause.
   */
  async resume(): Promise<void> {
    this.isPaused = false
  }

  /**
   * Gracefully closes all queue resources.
   *
   * @remarks
   * Stops the consumer loops and waits for any active handlers to finish.
   */
  async close(): Promise<void> {
    this.isClosed = true
    this.isPaused = true
    if (this.activeHandlers > 0) {
      await new Promise<void>((resolve) => this.drainResolvers.push(resolve))
    }
  }

  /**
   * Generates the Redis Stream key for a given task name.
   *
   * @param name - The task type name
   * @returns The formatted stream key string
   */
  private getStreamKey(name: string): string {
    return `queue:stream:${name}`
  }
}
