import { describe, expect, it } from 'bun:test'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { ProfileServiceProvider } from './ProfileServiceProvider'

describe('ProfileServiceProvider', () => {
  it('should register profileController with proper typed dependencies', () => {
    const registered: Record<string, unknown> = {}
    const container: IContainer = {
      singleton(name, factory) {
        registered[name] = factory
      },
      bind(name, factory) {
        registered[name] = factory
      },
      make(name) {
        return registered[name]
      },
    }

    const provider = new ProfileServiceProvider()
    provider.register(container)

    expect(registered.profileController).toBeDefined()
    expect(typeof registered.profileController).toBe('function')
    expect(registered.profileRepository).toBeDefined()
    expect(registered.getProfileService).toBeDefined()
    expect(registered.updateProfileService).toBeDefined()
  })
})
