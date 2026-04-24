/**
 * Interface for components that require cleanup during application shutdown.
 *
 * @remarks
 * Each resource that needs to be closed or drained (e.g., database connections,
 * message queue consumers) should implement this interface and register with
 * the GracefulShutdown orchestrator.
 */
export interface IShutdownHook {
  /** Descriptive name of the resource (used for logging). */
  readonly name: string

  /**
   * Executes the cleanup logic for the resource.
   *
   * @remarks
   * - Should complete within the configured drain timeout.
   * - Errors should be caught or will be handled by the orchestrator.
   * @returns A promise that resolves when the resource is closed
   */
  shutdown(): Promise<void>
}
