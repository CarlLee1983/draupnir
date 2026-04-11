// src/Modules/CliApi/Application/Services/ExchangeDeviceCodeService.ts
import type { IDeviceCodeStore } from '../../Domain/Ports/IDeviceCodeStore'
import { DeviceCodeStatus } from '../../Domain/ValueObjects/DeviceCode'
import type { IJwtTokenService } from '@/Modules/Auth/Application/Ports/IJwtTokenService'
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'
import type { ExchangeDeviceCodeRequest, ExchangeDeviceCodeResponse } from '../DTOs/DeviceFlowDTO'

async function sha256(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export class ExchangeDeviceCodeService {
  constructor(
    private readonly store: IDeviceCodeStore,
    private readonly jwtService: IJwtTokenService,
    private readonly authTokenRepository: IAuthTokenRepository,
  ) {}

  async execute(request: ExchangeDeviceCodeRequest): Promise<ExchangeDeviceCodeResponse> {
    try {
      const deviceCode = await this.store.findByDeviceCode(request.deviceCode)

      // findByDeviceCode returns null for expired entries
      if (!deviceCode) {
        return {
          success: false,
          message: 'Invalid or expired device code',
          error: 'invalid_device_code',
        }
      }

      if (deviceCode.isExpired()) {
        return {
          success: false,
          message: 'Device code has expired, please request a new one',
          error: 'expired',
        }
      }

      if (deviceCode.status === DeviceCodeStatus.CONSUMED) {
        return {
          success: false,
          message: 'This device code has already been used',
          error: 'invalid_device_code',
        }
      }

      if (deviceCode.status === DeviceCodeStatus.PENDING) {
        return {
          success: false,
          message: 'Waiting for user authorization',
          error: 'authorization_pending',
        }
      }

      // Status is AUTHORIZED -- issue tokens
      const userId = deviceCode.userId!
      const email = deviceCode.userEmail!
      const role = deviceCode.userRole!

      const accessTokenObj = this.jwtService.signAccessToken({
        userId,
        email,
        role,
        permissions: [],
      })

      const refreshTokenObj = this.jwtService.signRefreshToken({
        userId,
        email,
        role,
        permissions: [],
      })

      // Save tokens for revocation tracking
      const accessTokenStr = accessTokenObj.getValue()
      const accessTokenHash = await sha256(accessTokenStr)
      await this.authTokenRepository.save({
        id: `${userId}_cli_access_${Date.now()}`,
        userId,
        tokenHash: accessTokenHash,
        type: 'access',
        expiresAt: accessTokenObj.getExpiresAt(),
        createdAt: new Date(),
      })

      const refreshTokenStr = refreshTokenObj.getValue()
      const refreshTokenHash = await sha256(refreshTokenStr)
      await this.authTokenRepository.save({
        id: `${userId}_cli_refresh_${Date.now()}`,
        userId,
        tokenHash: refreshTokenHash,
        type: 'refresh',
        expiresAt: refreshTokenObj.getExpiresAt(),
        createdAt: new Date(),
      })

      // Mark device code as consumed
      const consumed = deviceCode.consume()
      await this.store.update(consumed)

      return {
        success: true,
        message: 'CLI login successful',
        data: {
          accessToken: accessTokenStr,
          refreshToken: refreshTokenStr,
          user: { id: userId, email, role },
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Token 交換失敗'
      return { success: false, message, error: message }
    }
  }
}
