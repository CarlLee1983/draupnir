import type { IQueue } from '../../Ports/Queue/IQueue'
import type { IShutdownHook } from '../IShutdownHook'

/**
 * Shutdown hook for draining and closing the message queue.
 *
 * @remarks
 * Ensures all queue workers are stopped and pending jobs are awaited (if supported)
 * before the application completely shuts down.
 */
export class MessageQueueShutdownHook implements IShutdownHook {
  /** Resource name. */
  readonly name = 'MessageQueue'

  /**
   * Initializes the hook with a queue instance.
   * @param queue - The queue implementation to close
   */
  constructor(private readonly queue: IQueue) {}

  /**
   * Closes the message queue and stops workers.
   * @returns A promise that resolves when the queue is closed
   */
  async shutdown(): Promise<void> {
    console.log('🛑 [Queue] Shutting down message queue...')
    await this.queue.close()
    console.log('✅ [Queue] Message queue closed.')
  }
}
