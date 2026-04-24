import type { IShutdownHook } from '../IShutdownHook'

/**
 * Shutdown hook for stopping a Bun server instance.
 */
export class BunServerShutdownHook implements IShutdownHook {
  /** Resource name. */
  readonly name = 'BunServer'

  /**
   * Initializes the hook with a server instance.
   * @param server - Object exposing a stop method (compatible with Bun.serve() return value)
   */
  constructor(private readonly server: { stop(): void | Promise<void> }) {}

  /**
   * Stops the Bun server.
   * @returns A promise that resolves when the server stops
   */
  async shutdown(): Promise<void> {
    await this.server.stop()
  }
}
