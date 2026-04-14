import { describe, expect, it, mock } from 'bun:test'
import type { IContainer } from '../IServiceProvider'
import { wire, wireBind, wireSingleton } from '../wire'

// ── Fixtures ──────────────────────────────────────────────────────────────────

class SingleDep {
  constructor(public readonly repo: string) {}
}

class TwoDeps {
  constructor(
    public readonly repoA: string,
    public readonly repoB: string,
  ) {}
}

class NoDeps {
  readonly tag = 'no-deps'
}

function makeContainer(registry: Record<string, unknown> = {}): IContainer {
  const singletonFn = mock()
  const bindFn = mock()
  return {
    singleton: singletonFn,
    bind: bindFn,
    make: (key: string) => {
      if (key in registry) return registry[key]
      throw new Error(`[test container] Not found: "${key}"`)
    },
  }
}

/** Invoke the factory that was registered by wire/wireSingleton/wireBind */
function invokeRegistered(container: IContainer, lifecycle: 'singleton' | 'bind'): unknown {
  const fn = lifecycle === 'singleton' ? container.singleton : container.bind
  const mockFn = fn as ReturnType<typeof mock>
  const [, factory] = mockFn.mock.calls[0] as [string, (c: IContainer) => unknown]
  return factory(container)
}

// ── wire ──────────────────────────────────────────────────────────────────────

describe('wire', () => {
  it('passes singleton lifecycle to container', () => {
    const c = makeContainer({ repo: 'repo-value' })
    wire(c, 'singleton', 'svc', SingleDep, ['repo'])
    expect(c.singleton).toHaveBeenCalledTimes(1)
    expect((c.singleton as ReturnType<typeof mock>).mock.calls[0][0]).toBe('svc')
  })

  it('passes bind lifecycle to container', () => {
    const c = makeContainer({ repo: 'repo-value' })
    wire(c, 'bind', 'svc', SingleDep, ['repo'])
    expect(c.bind).toHaveBeenCalledTimes(1)
  })

  it('resolves single dep in correct order', () => {
    const c = makeContainer({ myRepo: 'resolved-repo' })
    wire(c, 'singleton', 'svc', SingleDep, ['myRepo'])
    const instance = invokeRegistered(c, 'singleton') as SingleDep
    expect(instance).toBeInstanceOf(SingleDep)
    expect(instance.repo).toBe('resolved-repo')
  })

  it('resolves two deps in correct order', () => {
    const c = makeContainer({ repoA: 'value-a', repoB: 'value-b' })
    wire(c, 'singleton', 'svc', TwoDeps, ['repoA', 'repoB'])
    const instance = invokeRegistered(c, 'singleton') as TwoDeps
    expect(instance.repoA).toBe('value-a')
    expect(instance.repoB).toBe('value-b')
  })

  it('works with zero deps', () => {
    const c = makeContainer()
    wire(c, 'singleton', 'svc', NoDeps, [])
    const instance = invokeRegistered(c, 'singleton') as NoDeps
    expect(instance).toBeInstanceOf(NoDeps)
    expect(instance.tag).toBe('no-deps')
  })

  it('wraps resolution errors with key and deps in message', () => {
    const c = makeContainer() // 'missing' key not in registry
    wire(c, 'singleton', 'svc', SingleDep, ['missing'])
    expect(() => invokeRegistered(c, 'singleton')).toThrow(
      '[wire] Failed to instantiate "svc" (deps: [missing])',
    )
  })
})

// ── wireSingleton ─────────────────────────────────────────────────────────────

describe('wireSingleton', () => {
  it('delegates to singleton lifecycle', () => {
    const c = makeContainer({ repo: 'v' })
    wireSingleton(c, 'svc', SingleDep, ['repo'])
    expect(c.singleton).toHaveBeenCalledTimes(1)
    expect(c.bind).not.toHaveBeenCalled()
  })

  it('produces correct instance', () => {
    const c = makeContainer({ repo: 'singleton-value' })
    wireSingleton(c, 'svc', SingleDep, ['repo'])
    const instance = invokeRegistered(c, 'singleton') as SingleDep
    expect(instance.repo).toBe('singleton-value')
  })
})

// ── wireBind ──────────────────────────────────────────────────────────────────

describe('wireBind', () => {
  it('delegates to bind lifecycle', () => {
    const c = makeContainer({ repo: 'v' })
    wireBind(c, 'svc', SingleDep, ['repo'])
    expect(c.bind).toHaveBeenCalledTimes(1)
    expect(c.singleton).not.toHaveBeenCalled()
  })

  it('produces correct instance', () => {
    const c = makeContainer({ repo: 'bind-value' })
    wireBind(c, 'svc', SingleDep, ['repo'])
    const instance = invokeRegistered(c, 'bind') as SingleDep
    expect(instance.repo).toBe('bind-value')
  })
})
