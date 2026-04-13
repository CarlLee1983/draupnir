// src/Modules/CliApi/Infrastructure/Services/MemoryDeviceCodeStore.ts
import type { IDeviceCodeStore } from '../../Domain/Ports/IDeviceCodeStore'
import type { DeviceCode } from '../../Domain/ValueObjects/DeviceCode'

interface StoredEntry {
  readonly deviceCode: DeviceCode
}

export class MemoryDeviceCodeStore implements IDeviceCodeStore {
  private readonly store = new Map<string, StoredEntry>()
  private readonly userCodeIndex = new Map<string, string>() // userCode -> deviceCode

  async save(deviceCode: DeviceCode): Promise<void> {
    this.store.set(deviceCode.deviceCode, { deviceCode })
    this.userCodeIndex.set(deviceCode.userCode, deviceCode.deviceCode)
  }

  async findByDeviceCode(code: string): Promise<DeviceCode | null> {
    const entry = this.store.get(code)
    if (!entry) return null
    return entry.deviceCode
  }

  async findByUserCode(userCode: string): Promise<DeviceCode | null> {
    const deviceCodeKey = this.userCodeIndex.get(userCode)
    if (!deviceCodeKey) return null
    return this.findByDeviceCode(deviceCodeKey)
  }

  async update(deviceCode: DeviceCode): Promise<void> {
    this.store.set(deviceCode.deviceCode, { deviceCode })
  }

  async delete(code: string): Promise<void> {
    const entry = this.store.get(code)
    if (entry) {
      this.userCodeIndex.delete(entry.deviceCode.userCode)
    }
    this.store.delete(code)
  }

  async cleanup(): Promise<void> {
    for (const [key, entry] of this.store.entries()) {
      if (entry.deviceCode.isExpired()) {
        this.userCodeIndex.delete(entry.deviceCode.userCode)
        this.store.delete(key)
      }
    }
  }
}
