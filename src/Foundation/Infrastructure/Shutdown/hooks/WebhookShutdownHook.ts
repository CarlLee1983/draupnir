import type { IShutdownHook } from '../IShutdownHook'

/**
 * Shutdown hook for webhook delivery components.
 *
 * @remarks
 * WebhookDispatcher is currently a stateless fetch client with no persistent
 * connections to close. This hook serves as a placeholder for future long-lived
 * resources (e.g., connection pools or WebSockets).
 */
export class WebhookShutdownHook implements IShutdownHook {
  /** Resource name. */
  readonly name = 'WebhookClient'

  /**
   * Performs any necessary cleanup for the webhook client.
   * @returns A promise that resolves when cleanup is finished
   */
  async shutdown(): Promise<void> {
    // Currently no persistent connections to close.
  }
}
