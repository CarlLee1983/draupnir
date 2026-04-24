import type { IQueue } from '../../Ports/Queue/IQueue'
import type { IShutdownHook } from '../IShutdownHook'

/**
 * Message Queue drain hook.
 *
 * Ensures all queue workers are stopped and pending jobs are awaited (if supported)
 * before the application completely shuts down.
 */
export class MessageQueueShutdownHook implements IShutdownHook {
  readonly name = 'MessageQueue'

  constructor(private readonly queue: IQueue) {}

  async shutdown(): Promise<void> {
    console.log('🛑 [Queue] Shutting down message queue...')
    await this.queue.close()
    console.log('✅ [Queue] Message queue closed.')
  }
}
