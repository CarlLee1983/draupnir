declare module '@gravito/prism' {
  import type { PlanetCore } from '@gravito/core'

  export class OrbitPrism {
    constructor(options?: Record<string, unknown>)
    install(core: PlanetCore): void | Promise<void>
  }
}
