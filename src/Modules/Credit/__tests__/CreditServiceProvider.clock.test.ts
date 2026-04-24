import { describe, expect, it } from 'vitest'
import type { IClock } from '@/Shared/Application/Ports/IClock'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { SystemClock } from '@/Shared/Infrastructure/Services/SystemClock'
import { setCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import { CreditServiceProvider } from '../Infrastructure/Providers/CreditServiceProvider'

function makeContainer(): IContainer & {
  readonly singletons: Map<string, () => unknown>
  readonly binds: Map<string, () => unknown>
} {
  const singletons = new Map<string, () => unknown>()
  const binds = new Map<string, () => unknown>()
  const container: IContainer = {
    singleton(name, factory) {
      singletons.set(name, () => factory(container))
    },
    bind(name, factory) {
      binds.set(name, () => factory(container))
    },
    make(name) {
      const singleton = singletons.get(name)
      if (singleton) return singleton()
      const binding = binds.get(name)
      if (binding) return binding()
      throw new Error(`not registered: ${name}`)
    },
  }

  return Object.assign(container, { singletons, binds })
}

describe('CreditServiceProvider — clock binding', () => {
  it('registerInfraServices 註冊 clock singleton 為 SystemClock', () => {
    setCurrentDatabaseAccess({
      table: (() => {
        throw new Error('not used in clock binding test')
      }) as IDatabaseAccess['table'],
      transaction: async () => {
        throw new Error('not used in clock binding test')
      },
    })

    const container = makeContainer()
    const provider = new CreditServiceProvider()
    provider.register(container)

    expect(container.singletons.has('clock')).toBe(true)
    const clock = container.make('clock') as IClock
    expect(clock).toBeInstanceOf(SystemClock)
  })
})
