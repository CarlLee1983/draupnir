/**
 * RegisterUserService
 * Application service: user registration use case.
 *
 * Responsibilities:
 * - Validate input
 * - Ensure email is not already registered
 * - Create the User aggregate
 * - Persist to the database
 * - Dispatch UserRegistered domain event (Profile creation is handled by UserRegisteredHandler)
 */

import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import { User } from '../../Domain/Aggregates/User'
import { UserRegistered } from '../../Domain/Events/UserRegistered'
import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'
import { Email } from '../../Domain/ValueObjects/Email'
import { Password } from '../../Domain/ValueObjects/Password'
import { Role } from '../../Domain/ValueObjects/Role'
import type { RegisterUserRequest, RegisterUserResponse } from '../DTOs/RegisterUserDTO'
import type { IPasswordHasher } from '../Ports/IPasswordHasher'

/**
 * Service responsible for registering new users in the system.
 */
export class RegisterUserService {
  /**
   * Creates an instance of RegisterUserService.
   * Profile creation is decoupled via the UserRegistered domain event.
   */
  constructor(
    private authRepository: IAuthRepository,
    private passwordHasher: IPasswordHasher,
  ) {}

  /**
   * Executes the registration workflow.
   */
  async execute(request: RegisterUserRequest): Promise<RegisterUserResponse> {
    try {
      // 1. Validate input
      const validation = this.validateInput(request)
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.error || 'Validation failed',
          error: validation.error,
        }
      }

      // 2. Create Email value object
      const email = new Email(request.email)

      // 3. Check if email already exists
      const emailExists = await this.authRepository.emailExists(email)
      if (emailExists) {
        return {
          success: false,
          message: 'Email already exists',
          error: 'EMAIL_ALREADY_EXISTS',
        }
      }

      // 4. Create new user
      const userId = crypto.randomUUID()
      const hashedPassword = await this.passwordHasher.hash(request.password)
      const user = User.create(userId, email, Password.fromHashed(hashedPassword), Role.member())

      // 5. Save to database
      await this.authRepository.save(user)

      // 6. Dispatch UserRegistered event (Profile module listens and creates default profile)
      const dispatcher = DomainEventDispatcher.getInstance()
      await dispatcher.dispatch(new UserRegistered(user.id, user.emailValue))

      // 7. Return successful response
      return {
        success: true,
        message: 'User registered successfully',
        data: {
          id: user.id,
          email: user.emailValue,
          role: user.role.getValue(),
        },
      }
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Registration failed',
        error: error.message,
      }
    }
  }

  /**
   * Performs basic validation on the registration request.
   */
  private validateInput(request: RegisterUserRequest): {
    isValid: boolean
    error?: string
  } {
    if (!request.email?.trim()) {
      return { isValid: false, error: 'Email is required' }
    }

    if (!request.password?.trim()) {
      return { isValid: false, error: 'Password is required' }
    }

    if (request.password.length < 8) {
      return { isValid: false, error: 'Password must be at least 8 characters long' }
    }

    if (request.confirmPassword && request.password !== request.confirmPassword) {
      return { isValid: false, error: 'Passwords do not match' }
    }

    return { isValid: true }
  }
}
