import type { IShutdownHook } from '../IShutdownHook'

export class DatabaseShutdownHook implements IShutdownHook {
  readonly name = 'Database'

  constructor(private readonly close: () => Promise<void>) {}

  async shutdown(): Promise<void> {
    await this.close()
  }
}
