import { describe, it, expect } from 'bun:test'
import { ProfileServiceProvider } from './ProfileServiceProvider'

describe('ProfileServiceProvider', () => {
  it('should register profileController with proper typed dependencies', () => {
    const registered: Record<string, unknown> = {}
    const container = {
      singleton: (name: string, factory: (c: unknown) => unknown) => {
        registered[name] = factory
      },
      bind: (name: string, factory: (c: unknown) => unknown) => {
        registered[name] = factory
      },
      make: (_name: string) => ({}),
    }

    const provider = new ProfileServiceProvider()
    provider.register(container as any)

    expect(registered['profileController']).toBeDefined()
    expect(typeof registered['profileController']).toBe('function')
    expect(registered['profileRepository']).toBeDefined()
    expect(registered['getProfileService']).toBeDefined()
    expect(registered['updateProfileService']).toBeDefined()
  })
})
