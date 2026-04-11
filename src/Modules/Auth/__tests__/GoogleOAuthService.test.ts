/**
 * GoogleOAuthService unit tests.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { GoogleOAuthService } from '../Application/Services/GoogleOAuthService'
import type { IAuthRepository } from '../Domain/Repositories/IAuthRepository'
import type { IUserProfileRepository } from '@/Modules/Profile/Domain/Repositories/IUserProfileRepository'
import type { IJwtTokenService } from '../Application/Ports/IJwtTokenService'
import type { IPasswordHasher } from '../Application/Ports/IPasswordHasher'
import type { GoogleOAuthAdapter } from '../Infrastructure/Services/GoogleOAuthAdapter'
import { Email } from '../Domain/ValueObjects/Email'
import { Password } from '../Domain/ValueObjects/Password'
import { Role } from '../Domain/ValueObjects/Role'
import { User, UserStatus } from '../Domain/Aggregates/User'

describe('GoogleOAuthService', () => {
  let service: GoogleOAuthService
  let findByGoogleId: ReturnType<typeof mock>
  let findByEmail: ReturnType<typeof mock>
  let save: ReturnType<typeof mock>
  let deleteUser: ReturnType<typeof mock>
  let mockAuthRepo: IAuthRepository
  let mockJwtService: IJwtTokenService
  let exchangeCodeForToken: ReturnType<typeof mock>
  let getUserInfo: ReturnType<typeof mock>
  let mockAdapter: GoogleOAuthAdapter
  let profileSave: ReturnType<typeof mock>
  let mockProfileRepo: IUserProfileRepository
  let mockHasher: IPasswordHasher

  beforeEach(() => {
    findByGoogleId = mock(() => Promise.resolve(null))
    findByEmail = mock(() => Promise.resolve(null))
    save = mock(() => Promise.resolve())
    deleteUser = mock(() => Promise.resolve())
    mockAuthRepo = {
      findByGoogleId,
      findByEmail,
      save,
      delete: deleteUser,
    } as unknown as IAuthRepository

    mockJwtService = {
      signAccessToken: mock(() => ({
        getValue: () => 'jwt-token',
      })),
    } as unknown as IJwtTokenService

    exchangeCodeForToken = mock(() => Promise.resolve('access-token'))
    getUserInfo = mock(() =>
      Promise.resolve({
        id: 'google-123',
        email: 'user@gmail.com',
        name: 'Test User',
      }),
    )
    mockAdapter = {
      exchangeCodeForToken,
      getUserInfo,
    } as unknown as GoogleOAuthAdapter

    profileSave = mock(() => Promise.resolve())
    mockProfileRepo = {
      save: profileSave,
    } as unknown as IUserProfileRepository

    mockHasher = {
      hash: mock(() => Promise.resolve('hashed-random')),
    } as unknown as IPasswordHasher

    service = new GoogleOAuthService(
      mockAuthRepo,
      mockJwtService,
      mockAdapter,
      mockProfileRepo,
      mockHasher,
    )
  })

  it('should exchange code and return JWT for existing user', async () => {
    const existingUser = User.create(
      'user-123',
      new Email('user@gmail.com'),
      Password.fromHashed('x:y'),
      Role.member(),
      UserStatus.ACTIVE,
      new Date(),
      new Date(),
      'google-123',
    )

    findByGoogleId.mockResolvedValueOnce(existingUser)

    const result = await service.exchange('test-code')

    expect(result.success).toBe(true)
    expect(result.jwt).toBe('jwt-token')
    expect(result.userId).toBe('user-123')
    expect(exchangeCodeForToken).toHaveBeenCalledWith('test-code')
  })

  it('should create new user if Google ID not found', async () => {
    findByGoogleId.mockResolvedValueOnce(null)
    findByEmail.mockResolvedValueOnce(null)

    const result = await service.exchange('test-code')

    expect(result.success).toBe(true)
    expect(result.jwt).toBe('jwt-token')
    expect(save).toHaveBeenCalled()
    expect(profileSave).toHaveBeenCalled()
  })

  it('should return error on invalid code', async () => {
    exchangeCodeForToken.mockRejectedValueOnce(new Error('Invalid code'))

    const result = await service.exchange('invalid-code')

    expect(result.success).toBe(false)
    expect(result.error).toBe('OAUTH_ERROR')
  })
})
