// src/Modules/Profile/Application/EventHandlers/UserRegisteredHandler.ts
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import { UserProfile } from '../../Domain/Aggregates/UserProfile'
import type { IUserProfileRepository } from '../../Domain/Repositories/IUserProfileRepository'

/**
 * Handles the UserRegistered domain event by creating a default UserProfile.
 * Subscribed in AuthServiceProvider.boot() via DomainEventDispatcher.
 */
export class UserRegisteredHandler {
  constructor(private readonly userProfileRepository: IUserProfileRepository) {}

  async execute(userId: string, email: string): Promise<void> {
    if (!userId || !email) {
      throw new Error('UserRegisteredHandler: userId and email are required')
    }
    const profile = UserProfile.createDefault(userId, email)
    await this.userProfileRepository.save(profile)

    // Dispatch domain events created during aggregate creation
    const dispatcher = DomainEventDispatcher.getInstance()
    await dispatcher.dispatchAll(profile.domainEvents)
  }
}
