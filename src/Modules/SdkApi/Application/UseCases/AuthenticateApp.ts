import { KeyHash } from '@/Modules/ApiKey/Domain/ValueObjects/KeyHash'
import type { IAppApiKeyRepository } from '@/Modules/AppApiKey/Domain/Repositories/IAppApiKeyRepository'
import type { AppAuthContext } from '../DTOs/SdkApiDTO'

interface AuthenticateResult {
  success: boolean
  context?: AppAuthContext
  error?: string
  message?: string
}

export class AuthenticateApp {
  constructor(private readonly appApiKeyRepo: IAppApiKeyRepository) {}

  async execute(rawKey: string): Promise<AuthenticateResult> {
    try {
      if (!rawKey.startsWith('drp_app_')) {
        return { success: false, error: 'INVALID_KEY_FORMAT', message: '無效的 App Key 格式' }
      }

      const keyHashVo = await KeyHash.fromRawKey(rawKey)
      const keyHash = keyHashVo.getValue()

      let appKey = await this.appApiKeyRepo.findByKeyHash(keyHash)

      if (!appKey) {
        appKey = await this.appApiKeyRepo.findByPreviousKeyHash(keyHash)
        if (appKey) {
          const gracePeriodEndsAt = appKey.gracePeriodEndsAt
          if (!gracePeriodEndsAt || gracePeriodEndsAt < new Date()) {
            return { success: false, error: 'INVALID_APP_KEY', message: 'App Key 無效或已過期' }
          }
        }
      }

      if (!appKey) {
        return { success: false, error: 'INVALID_APP_KEY', message: 'App Key 無效' }
      }

      if (appKey.status === 'revoked') {
        return { success: false, error: 'KEY_REVOKED', message: '此 App Key 已撤銷' }
      }

      if (appKey.status !== 'active') {
        return { success: false, error: 'KEY_INACTIVE', message: '此 App Key 未啟用' }
      }

      if (appKey.expiresAt && appKey.expiresAt < new Date()) {
        return { success: false, error: 'KEY_EXPIRED', message: '此 App Key 已過期' }
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
      const message = error instanceof Error ? error.message : '認證失敗'
      return { success: false, error: 'AUTH_ERROR', message }
    }
  }
}
