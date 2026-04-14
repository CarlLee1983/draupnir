/**
 * Typed DI wiring helpers for IContainer.
 *
 * Reduces boilerplate for classes whose constructor takes only positional
 * dependencies resolved from the container by string key.
 *
 * **When to use:**
 * - Constructor has ≤ 2 positional deps, or all deps are clearly distinct types
 * - All deps are managed by the container (no env vars or other runtime values)
 *
 * **When NOT to use:**
 * - Constructor takes an object-bag (named options) — keep explicit for readability
 * - Constructor mixes container deps with runtime values (env vars, config, etc.)
 * - 3+ deps of similar types where ordering mistakes are hard to catch at runtime
 */

import type { IContainer } from './IServiceProvider'

/**
 * Registers a class in the container using a positional deps array.
 *
 * The `deps` tuple length is enforced to match the constructor arity at
 * compile time, catching missing/extra deps before runtime.
 *
 * @param container - DI container
 * @param lifecycle - 'singleton' (shared) or 'bind' (new instance per resolve)
 * @param key - Registration key
 * @param Ctor - Class constructor
 * @param deps - Container keys to resolve and spread into the constructor
 */
export function wire<T, A extends readonly unknown[]>(
  container: IContainer,
  lifecycle: 'singleton' | 'bind',
  key: string,
  Ctor: new (...args: A) => T,
  deps: { [K in keyof A]: string },
): void {
  container[lifecycle](key, (c) => {
    try {
      return new Ctor(...(deps.map((d) => c.make(d)) as unknown as A))
    } catch (err) {
      throw new Error(
        `[wire] Failed to instantiate "${key}" (deps: [${deps.join(', ')}]): ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  })
}

/**
 * Shorthand for `wire(..., 'singleton', ...)`.
 */
export function wireSingleton<T, A extends readonly unknown[]>(
  container: IContainer,
  key: string,
  Ctor: new (...args: A) => T,
  deps: { [K in keyof A]: string },
): void {
  wire(container, 'singleton', key, Ctor, deps)
}

/**
 * Shorthand for `wire(..., 'bind', ...)`.
 */
export function wireBind<T, A extends readonly unknown[]>(
  container: IContainer,
  key: string,
  Ctor: new (...args: A) => T,
  deps: { [K in keyof A]: string },
): void {
  wire(container, 'bind', key, Ctor, deps)
}
