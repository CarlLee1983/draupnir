/**
 * Stateful in-memory implementation of ILLMGatewayClient for use in tests.
 *
 * @remarks
 * This class MUST NOT be imported in runtime src/ code — tests only.
 * Enforced by CI grep check in package.json `check:no-mock-in-src` script.
 *
 * Features:
 * - Stateful in-memory key store with monotonic ID generator
 * - `calls` getter for asserting received requests without vi.fn wrappers
 * - `failNext(error)` for single-shot failure injection (FIFO queue)
 * - Seeded UsageStats and LogEntry fixtures configurable at construction
 */

import type { GatewayError } from '../errors'
import type { ILLMGatewayClient } from '../ILLMGatewayClient'
import type {
  CreateKeyRequest,
  KeyResponse,
  LogEntry,
  UpdateKeyRequest,
  UsageQuery,
  UsageStats,
} from '../types'

interface StoredKey {
  readonly id: string
  readonly name: string
  readonly isActive: boolean
  readonly rateLimit?: CreateKeyRequest['rateLimit']
  readonly providerConfigs?: CreateKeyRequest['providerConfigs']
}

interface CallLog {
  readonly createKey: readonly CreateKeyRequest[]
  readonly updateKey: readonly { readonly keyId: string; readonly request: UpdateKeyRequest }[]
  readonly deleteKey: readonly string[]
  readonly getUsageStats: readonly { readonly keyIds: readonly string[]; readonly query?: UsageQuery }[]
  readonly getUsageLogs: readonly { readonly keyIds: readonly string[]; readonly query?: UsageQuery }[]
}

export class MockGatewayClient implements ILLMGatewayClient {
  private readonly keys: Map<string, StoredKey> = new Map()
  private idCounter = 0
  private readonly failQueue: GatewayError[] = []

  private readonly _calls: {
    createKey: CreateKeyRequest[]
    updateKey: { keyId: string; request: UpdateKeyRequest }[]
    deleteKey: string[]
    getUsageStats: { keyIds: readonly string[]; query?: UsageQuery }[]
    getUsageLogs: { keyIds: readonly string[]; query?: UsageQuery }[]
  } = {
    createKey: [],
    updateKey: [],
    deleteKey: [],
    getUsageStats: [],
    getUsageLogs: [],
  }

  constructor(
    private readonly seedStats: UsageStats = {
      totalRequests: 0,
      totalCost: 0,
      totalTokens: 0,
      avgLatency: 0,
    },
    private readonly seedLogs: readonly LogEntry[] = [],
  ) {}

  /** Read-only snapshot of all received calls per method. */
  get calls(): CallLog {
    return {
      createKey: [...this._calls.createKey],
      updateKey: [...this._calls.updateKey],
      deleteKey: [...this._calls.deleteKey],
      getUsageStats: [...this._calls.getUsageStats],
      getUsageLogs: [...this._calls.getUsageLogs],
    }
  }

  /**
   * Queue a single-shot failure. The next interface call will throw this error,
   * then the queue entry is consumed. Multiple calls to failNext drain FIFO.
   */
  failNext(error: GatewayError): void {
    this.failQueue.push(error)
  }

  private generateId(): string {
    this.idCounter++
    return `mock_vk_${String(this.idCounter).padStart(6, '0')}`
  }

  private maybeThrow(): void {
    if (this.failQueue.length > 0) {
      throw this.failQueue.shift()
    }
  }

  async createKey(request: CreateKeyRequest): Promise<KeyResponse> {
    this.maybeThrow()
    this._calls.createKey.push(request)
    const id = this.generateId()
    const key: StoredKey = {
      id,
      name: request.name,
      isActive: request.isActive ?? true,
      rateLimit: request.rateLimit,
      providerConfigs: request.providerConfigs,
    }
    this.keys.set(id, key)
    return {
      id: key.id,
      name: key.name,
      value: `mock-key-value-${id}`,
      isActive: key.isActive,
    }
  }

  async updateKey(keyId: string, request: UpdateKeyRequest): Promise<KeyResponse> {
    this.maybeThrow()
    this._calls.updateKey.push({ keyId, request })
    const existing = this.keys.get(keyId)
    if (!existing) {
      const { GatewayError: GatewayErrorClass } = await import('../errors')
      throw new GatewayErrorClass(`Key not found: ${keyId}`, 'NOT_FOUND', 404, false)
    }
    const updated: StoredKey = {
      ...existing,
      isActive: request.isActive ?? existing.isActive,
      rateLimit: request.rateLimit ?? existing.rateLimit,
      providerConfigs: request.providerConfigs ?? existing.providerConfigs,
    }
    this.keys.set(keyId, updated)
    return {
      id: updated.id,
      name: updated.name,
      isActive: updated.isActive,
    }
  }

  async deleteKey(keyId: string): Promise<void> {
    this.maybeThrow()
    this._calls.deleteKey.push(keyId)
    this.keys.delete(keyId)
  }

  async getUsageStats(keyIds: readonly string[], query?: UsageQuery): Promise<UsageStats> {
    this.maybeThrow()
    this._calls.getUsageStats.push({ keyIds, query })
    return { ...this.seedStats }
  }

  async getUsageLogs(keyIds: readonly string[], query?: UsageQuery): Promise<readonly LogEntry[]> {
    this.maybeThrow()
    this._calls.getUsageLogs.push({ keyIds, query })
    return [...this.seedLogs]
  }
}
