import type { IAppApiKeyRepository } from '@/Modules/AppApiKey/Domain/Repositories/IAppApiKeyRepository'
import type { IKeyHashingService } from '@/Shared/Domain/Ports/IKeyHashingService'
import type { AppAuthContext } from '../DTOs/SdkApiDTO'

interface AuthenticateResult {
  success: boolean
  context?: AppAuthContext
  error?: string
  message?: string
}

export class AuthenticateApp {
  constructor(
    private readonly appApiKeyRepo: IAppApiKeyRepository,
    private readonly keyHashingService: IKeyHashingService,
  ) {}

  async execute(rawKey: string): Promise<AuthenticateResult> {
    try {
      if (!rawKey.startsWith('drp_app_')) {
        return { success: false, error: 'INVALID_KEY_FORMAT', message: 'Invalid app key format' }
      }

      const keyHash = await this.keyHashingService.hash(rawKey)

      let appKey = await this.appApiKeyRepo.findByKeyHash(keyHash)

      if (!appKey) {
        appKey = await this.appApiKeyRepo.findByPreviousKeyHash(keyHash)
        if (appKey) {
          const gracePeriodEndsAt = appKey.gracePeriodEndsAt
          if (!gracePeriodEndsAt || gracePeriodEndsAt < new Date()) {
            return {
              success: false,
              error: 'INVALID_APP_KEY',
              message: 'App key is invalid or expired',
            }
          }
        }
      }

      if (!appKey) {
        return { success: false, error: 'INVALID_APP_KEY', message: 'App key is invalid' }
      }

      if (appKey.status === 'revoked') {
        return { success: false, error: 'KEY_REVOKED', message: 'This app key has been revoked' }
      }

      if (appKey.status !== 'active') {
        return { success: false, error: 'KEY_INACTIVE', message: 'This app key is not active' }
      }

      if (appKey.expiresAt && appKey.expiresAt < new Date()) {
        return { success: false, error: 'KEY_EXPIRED', message: 'This app key has expired' }
      }

      const context: AppAuthContext = {
        appKeyId: appKey.id,
        orgId: appKey.orgId,
        gatewayKeyId: appKey.gatewayKeyId,
        scope: appKey.appKeyScope.getValue(),
        boundModuleIds: [...appKey.boundModules.getModuleIds()],
      }

      return { success: true, context }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Authentication failed'
      return { success: false, error: 'AUTH_ERROR', message }
    }
  }
}
