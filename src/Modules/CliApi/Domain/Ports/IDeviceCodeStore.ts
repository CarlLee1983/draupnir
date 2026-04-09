// src/Modules/CliApi/Domain/Ports/IDeviceCodeStore.ts
import type { DeviceCode } from '../ValueObjects/DeviceCode'

export interface IDeviceCodeStore {
  save(deviceCode: DeviceCode): Promise<void>
  findByDeviceCode(deviceCode: string): Promise<DeviceCode | null>
  findByUserCode(userCode: string): Promise<DeviceCode | null>
  update(deviceCode: DeviceCode): Promise<void>
  delete(deviceCode: string): Promise<void>
  cleanup(): Promise<void>
}
