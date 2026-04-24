export interface LastResultStore {
  readonly value: unknown
  expect<T>(): T
  set(value: unknown): void
  clear(): void
}

export function createLastResultStore(): LastResultStore {
  let stored: unknown

  return {
    get value() {
      return stored
    },
    expect<T>(): T {
      if (stored === undefined) {
        throw new Error('lastResult: no result captured. Did a when.* helper run before this then.*?')
      }
      return stored as T
    },
    set(value: unknown) {
      stored = value
    },
    clear() {
      stored = undefined
    },
  }
}
