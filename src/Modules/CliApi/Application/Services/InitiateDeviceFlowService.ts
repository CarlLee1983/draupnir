// src/Modules/CliApi/Application/Services/InitiateDeviceFlowService.ts
/**
 * InitiateDeviceFlowService
 * Application service: starts the OAuth 2.0 Device Authorization flow for CLI clients.
 *
 * Responsibilities:
 * - Generate unique device codes and human-friendly user codes
 * - Persist request state for downstream verification and polling
 * - Return initialization metadata (uri, codes, TTL) to the CLI
 */

import type { IDeviceCodeStore } from '../../Domain/Ports/IDeviceCodeStore'
import { DeviceCode } from '../../Domain/ValueObjects/DeviceCode'
import type { InitiateDeviceFlowResponse } from '../DTOs/DeviceFlowDTO'

/**
 * Service facilitating the start of a CLI authentication session.
 */
export class InitiateDeviceFlowService {
  constructor(
    private readonly store: IDeviceCodeStore,
    private readonly verificationUri: string,
    private readonly ttlSeconds: number = 600,
    private readonly pollingIntervalSeconds: number = 5,
  ) {}

  /**
   * Executes the device flow initiation.
   */
  async execute(): Promise<InitiateDeviceFlowResponse> {
    try {
      const deviceCodeId = crypto.randomUUID()
      const userCode = DeviceCode.generateUserCode()
      const expiresAt = new Date(Date.now() + this.ttlSeconds * 1000)

      const deviceCode = DeviceCode.create({
        deviceCode: deviceCodeId,
        userCode,
        verificationUri: this.verificationUri,
        expiresAt,
      })

      await this.store.save(deviceCode)

      return {
        success: true,
        message: 'Device code generated. Please visit the verification page and enter the user code.',
        data: {
          deviceCode: deviceCodeId,
          userCode,
          verificationUri: this.verificationUri,
          expiresIn: this.ttlSeconds,
          interval: this.pollingIntervalSeconds,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Device flow initialization failed'
      return { success: false, message, error: message }
    }
  }
}

