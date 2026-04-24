import type { IShutdownHook } from '../IShutdownHook'

/**
 * Shutdown hook for closing database connections.
 */
export class DatabaseShutdownHook implements IShutdownHook {
  /** Resource name. */
  readonly name = 'Database'

  /**
   * Initializes the hook with a close function.
   * @param close - Async function that closes the database connection(s)
   */
  constructor(private readonly close: () => Promise<void>) {}

  /**
   * Closes the database connection.
   * @returns A promise that resolves when the database is closed
   */
  async shutdown(): Promise<void> {
    await this.close()
  }
}
