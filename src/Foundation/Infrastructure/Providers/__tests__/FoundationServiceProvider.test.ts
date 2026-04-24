import { describe, expect, it, mock } from 'bun:test'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IQueue } from '../../Ports/Queue/IQueue'
import { FoundationServiceProvider } from '../FoundationServiceProvider'

function makeContainer(registry: Record<string, unknown> = {}): IContainer {
  const singletons = new Map<string, (container: IContainer) => unknown>()

  const container: IContainer = {
    singleton(name: string, factory: (container: IContainer) => unknown): void {
      singletons.set(name, factory)
    },
    bind: mock(),
    make(name: string): unknown {
      if (name in registry) {
        return registry[name]
      }

      const factory = singletons.get(name)
      if (factory) {
        return factory(container)
      }

      throw new Error(`[test container] Not found: "${name}"`)
    },
  }

  return container
}

describe('FoundationServiceProvider queue wiring', () => {
  it('adapts the raw Redis client so queue jobs can create stream groups', async () => {
    const redis = {
      xgroup: mock(async () => 'OK'),
      xadd: mock(async () => '1760000000000-0'),
      xreadgroup: mock(async () => null),
      xack: mock(async () => 1),
    }

    const container = makeContainer({ redis })
    new FoundationServiceProvider().register(container)

    const queue = container.make('queue') as IQueue
    const jobId = await queue.push('webhook.dispatch', { id: 'abc-123' }, { jobName: 'webhook' })

    expect(jobId).toBe('1760000000000-0')
    expect(redis.xgroup).toHaveBeenCalledWith(
      'CREATE',
      'queue:stream:webhook.dispatch',
      'draupnir-worker-group',
      '$',
      true,
    )
    expect(redis.xadd).toHaveBeenCalledWith(
      'queue:stream:webhook.dispatch',
      expect.objectContaining({
        payload: JSON.stringify({ id: 'abc-123' }),
        jobName: 'webhook',
      }),
      undefined,
    )
  })
})
