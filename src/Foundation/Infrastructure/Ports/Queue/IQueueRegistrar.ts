import type { IQueue } from './IQueue'

/**
 * Interface for service providers that need to register queue consumers.
 */
export interface IQueueRegistrar {
  /**
   * Hook called during bootstrap to register module-specific workers.
   *
   * @param queue - The centralized queue service.
   * @returns A promise that resolves when registration is complete, or void.
   */
  registerQueueHandlers(queue: IQueue): void | Promise<void>
}
