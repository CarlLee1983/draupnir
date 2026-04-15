import type { IShutdownHook } from '../IShutdownHook'

export class BunServerShutdownHook implements IShutdownHook {
  readonly name = 'BunServer'

  constructor(private readonly server: { stop(): void | Promise<void> }) {}

  async shutdown(): Promise<void> {
    await this.server.stop()
  }
}
