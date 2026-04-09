// src/Modules/CliApi/Application/Services/InitiateDeviceFlowService.ts
import type { IDeviceCodeStore } from '../../Domain/Ports/IDeviceCodeStore'
import { DeviceCode } from '../../Domain/ValueObjects/DeviceCode'
import type { InitiateDeviceFlowResponse } from '../DTOs/DeviceFlowDTO'

const DEVICE_CODE_TTL_SECONDS = 600 // 10 minutes
const POLLING_INTERVAL_SECONDS = 5

export class InitiateDeviceFlowService {
  constructor(
    private readonly store: IDeviceCodeStore,
    private readonly verificationUri: string,
  ) {}

  async execute(): Promise<InitiateDeviceFlowResponse> {
    try {
      const deviceCodeId = crypto.randomUUID()
      const userCode = DeviceCode.generateUserCode()
      const expiresAt = new Date(Date.now() + DEVICE_CODE_TTL_SECONDS * 1000)

      const deviceCode = DeviceCode.create({
        deviceCode: deviceCodeId,
        userCode,
        verificationUri: this.verificationUri,
        expiresAt,
      })

      await this.store.save(deviceCode)

      return {
        success: true,
        message: 'Device code 已產生，請前往驗證頁面輸入 user code',
        data: {
          deviceCode: deviceCodeId,
          userCode,
          verificationUri: this.verificationUri,
          expiresIn: DEVICE_CODE_TTL_SECONDS,
          interval: POLLING_INTERVAL_SECONDS,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Device flow 初始化失敗'
      return { success: false, message, error: message }
    }
  }
}
