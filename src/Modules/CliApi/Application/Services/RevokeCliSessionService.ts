// src/Modules/CliApi/Application/Services/RevokeCliSessionService.ts
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'
import type { RevokeCliSessionResponse } from '../DTOs/DeviceFlowDTO'

interface RevokeRequest {
  userId: string
  tokenHash: string
}

interface RevokeAllRequest {
  userId: string
}

export class RevokeCliSessionService {
  constructor(private readonly authTokenRepository: IAuthTokenRepository) {}

  async execute(request: RevokeRequest): Promise<RevokeCliSessionResponse> {
    try {
      await this.authTokenRepository.revoke(request.tokenHash)
      return { success: true, message: 'CLI session 已撤銷' }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '撤銷失敗'
      return { success: false, message, error: message }
    }
  }

  async executeRevokeAll(request: RevokeAllRequest): Promise<RevokeCliSessionResponse> {
    try {
      await this.authTokenRepository.revokeAll(request.userId)
      return { success: true, message: '所有 CLI session 已撤銷' }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '撤銷失敗'
      return { success: false, message, error: message }
    }
  }
}
