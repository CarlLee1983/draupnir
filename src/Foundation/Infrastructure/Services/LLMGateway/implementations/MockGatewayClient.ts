/**
 * Stateful in-memory test double for ILLMGatewayClient.
 *
 * @remarks
 * USE IN TEST FILES ONLY. Never import from runtime src/ code.
 * Import directly from this file path, not from the barrel index.ts.
 * Enforced by CI grep check in package.json `check:no-mock-in-src` script.
 *
 * Features:
 * - Stateful key management (Map-backed, monotonic IDs)
 * - Call tracking via `.calls` getter (readonly arrays per method)
 * - Single-shot failure injection via `.failNext(error)` (FIFO queue)
 * - Reset capability via `.reset()` for clean test isolation
 * - Seed methods `.seedUsageStats()` and `.seedUsageLogs()` to configure return values
 */

import type { GatewayError } from '../errors'
import type { ILLMGatewayClient } from '../ILLMGatewayClient'
import type {
  CreateKeyRequest,
  CreateTeamRequest,
  KeyResponse,
  LogEntry,
  TeamResponse,
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
  readonly createTeam: readonly CreateTeamRequest[]
  readonly ensureTeam: readonly CreateTeamRequest[]
  readonly createKey: readonly CreateKeyRequest[]
  readonly updateKey: readonly { readonly keyId: string; readonly request: UpdateKeyRequest }[]
  readonly deleteKey: readonly string[]
  readonly getUsageStats: readonly {
    readonly keyIds: readonly string[]
    readonly query?: UsageQuery
  }[]
  readonly getUsageLogs: readonly {
    readonly keyIds: readonly string[]
    readonly query?: UsageQuery
  }[]
}

export class MockGatewayClient implements ILLMGatewayClient {
  private readonly keys: Map<string, StoredKey> = new Map()
  private idCounter = 0
  private readonly failQueue: GatewayError[] = []

  private seededStats: UsageStats = {
    totalRequests: 0,
    totalCost: 0,
    totalTokens: 0,
    avgLatency: 0,
  }

  private seededLogs: readonly LogEntry[] = []

  private readonly teams: Map<string, TeamResponse> = new Map()
  private teamCounter = 0

  private readonly _calls: {
    createTeam: CreateTeamRequest[]
    ensureTeam: CreateTeamRequest[]
    createKey: CreateKeyRequest[]
    updateKey: { keyId: string; request: UpdateKeyRequest }[]
    deleteKey: string[]
    getUsageStats: { keyIds: readonly string[]; query?: UsageQuery }[]
    getUsageLogs: { keyIds: readonly string[]; query?: UsageQuery }[]
  } = {
    createTeam: [],
    ensureTeam: [],
    createKey: [],
    updateKey: [],
    deleteKey: [],
    getUsageStats: [],
    getUsageLogs: [],
  }

  /** Read-only snapshot of all received calls per method. */
  get calls(): CallLog {
    return {
      createTeam: [...this._calls.createTeam],
      ensureTeam: [...this._calls.ensureTeam],
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

  /**
   * Configure the UsageStats to be returned by getUsageStats().
   * Replaces previous seeded value.
   */
  seedUsageStats(stats: UsageStats): void {
    this.seededStats = stats
  }

  /**
   * Configure the LogEntry array to be returned by getUsageLogs().
   * Replaces previous seeded value.
   */
  seedUsageLogs(logs: readonly LogEntry[]): void {
    this.seededLogs = logs
  }

  /**
   * Reset mock to initial state: clear keys, call records, fail queue, and seeds.
   * Useful in beforeEach() to reuse a single instance across tests.
   */
  reset(): void {
    this.keys.clear()
    this.teams.clear()
    this.idCounter = 0
    this.teamCounter = 0
    this.failQueue.length = 0
    this.seededStats = { totalRequests: 0, totalCost: 0, totalTokens: 0, avgLatency: 0 }
    this.seededLogs = []
    this._calls.createTeam.length = 0
    this._calls.ensureTeam.length = 0
    this._calls.createKey.length = 0
    this._calls.updateKey.length = 0
    this._calls.deleteKey.length = 0
    this._calls.getUsageStats.length = 0
    this._calls.getUsageLogs.length = 0
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

  async createTeam(request: CreateTeamRequest): Promise<TeamResponse> {
    this.maybeThrow()
    this._calls.createTeam.push(request)
    this.teamCounter++
    const id = `mock_team_${String(this.teamCounter).padStart(6, '0')}`
    const team: TeamResponse = {
      id,
      name: request.name,
      ...(request.customerId !== undefined && { customerId: request.customerId }),
      ...(request.budget !== undefined && { budgetId: `mock_budget_${id}` }),
    }
    this.teams.set(id, team)
    return team
  }

  async ensureTeam(request: CreateTeamRequest): Promise<TeamResponse> {
    this.maybeThrow()
    this._calls.ensureTeam.push(request)
    for (const team of this.teams.values()) {
      if (team.name === request.name) return team
    }
    return this.createTeam(request)
  }

  async createKey(request: CreateKeyRequest): Promise<KeyResponse> {
    this.maybeThrow()
    this._calls.createKey.push(request)
    const id = this.generateId()
    const rawValue = `mock_raw_key_${String(this.idCounter).padStart(6, '0')}`
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
      value: rawValue,
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
    return { ...this.seededStats }
  }

  async getUsageLogs(keyIds: readonly string[], query?: UsageQuery): Promise<readonly LogEntry[]> {
    this.maybeThrow()
    this._calls.getUsageLogs.push({ keyIds, query })
    const offset = query?.offset ?? 0
    const limit = query?.limit ?? this.seededLogs.length
    return this.seededLogs.slice(offset, offset + limit)
  }
}
