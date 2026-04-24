import type { IQueue } from './IQueue'

/**
 * Side-interface for ServiceProviders to register their queue consumers.
 */
export interface IQueueRegistrar {
  /**
   * Hook called during bootstrap to register module-specific workers.
   *
   * @param queue - The centralized queue service.
   */
  registerQueueHandlers(queue: IQueue): void | Promise<void>
}
