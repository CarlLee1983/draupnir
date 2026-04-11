// src/Modules/CliApi/Application/Services/AuthorizeDeviceService.ts
import type { IDeviceCodeStore } from '../../Domain/Ports/IDeviceCodeStore'
import type { AuthorizeDeviceResponse } from '../DTOs/DeviceFlowDTO'

interface AuthorizeDeviceRequest {
  userCode: string
  userId: string
  email: string
  role: string
}

export class AuthorizeDeviceService {
  constructor(private readonly store: IDeviceCodeStore) {}

  async execute(request: AuthorizeDeviceRequest): Promise<AuthorizeDeviceResponse> {
    try {
      if (!request.userCode || !request.userCode.trim()) {
        return { success: false, message: 'User code is required', error: 'USER_CODE_REQUIRED' }
      }

      const deviceCode = await this.store.findByUserCode(request.userCode.toUpperCase())
      if (!deviceCode) {
        return { success: false, message: 'Invalid user code', error: 'INVALID_USER_CODE' }
      }

      const authorized = deviceCode.authorize(request.userId, request.email, request.role)
      await this.store.update(authorized)

      return { success: true, message: 'CLI device authorized successfully, return to CLI to complete login' }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '授權失敗'
      return { success: false, message, error: message }
    }
  }
}
