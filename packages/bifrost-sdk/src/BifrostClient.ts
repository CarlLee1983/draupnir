import type { BifrostClientConfig } from './BifrostClientConfig'
import { BifrostApiError } from './errors'
import { withRetry } from './retry'
import type {
  BifrostLogsQuery,
  BifrostLogsResponse,
  BifrostLogsStats,
  BifrostModel,
  BifrostModelsQuery,
  BifrostModelsResponse,
  BifrostTeam,
  BifrostTeamsQuery,
  BifrostVirtualKey,
  CreateTeamRequest,
  CreateVirtualKeyRequest,
  TeamListResponse,
  TeamResponse,
  UpdateTeamRequest,
  UpdateVirtualKeyRequest,
  VirtualKeyListResponse,
  VirtualKeyResponse,
} from './types'

/**
 * Bifrost AI Gateway Client.
 *
 * Provides management API operations for Virtual Key CRUD, log queries, and model listings.
 * All requests include built-in exponential backoff retries and timeout control.
 *
 * @example
 * ```ts
 * import { BifrostClient, createBifrostClientConfig } from '@cmg/bifrost-sdk'
 *
 * const client = new BifrostClient(createBifrostClientConfig())
 *
 * // Create Virtual Key
 * const vk = await client.createVirtualKey({
 *   name: 'my-key',
 *   provider_configs: [{ provider: 'openai' }],
 * })
 *
 * // Query log statistics
 * const stats = await client.getLogsStats({ start_time: '2026-01-01T00:00:00Z' })
 * ```
 */
export class BifrostClient {
  private readonly config: BifrostClientConfig

  /**
   * @param config - Client configuration, recommended to be created via {@link createBifrostClientConfig}
   */
  constructor(config: BifrostClientConfig) {
    this.config = config
  }

  /**
   * Creates a new Virtual Key.
   * @param request - Creation parameters
   * @returns The created Virtual Key (contains `value`, returned only once)
   */
  async createVirtualKey(request: CreateVirtualKeyRequest): Promise<BifrostVirtualKey> {
    const response = await this.post<VirtualKeyResponse>('/api/governance/virtual-keys', request)
    return response.virtual_key
  }

  /**
   * Lists all Virtual Keys.
   * @returns A list of Virtual Keys
   */
  async listVirtualKeys(): Promise<readonly BifrostVirtualKey[]> {
    const response = await this.get<VirtualKeyListResponse>('/api/governance/virtual-keys')
    return response.virtual_keys
  }

  /**
   * Retrieves details for a single Virtual Key.
   * @param vkId - Virtual Key ID
   * @returns Virtual Key data
   */
  async getVirtualKey(vkId: string): Promise<BifrostVirtualKey> {
    const response = await this.get<VirtualKeyResponse>(
      `/api/governance/virtual-keys/${encodeURIComponent(vkId)}`,
    )
    return response.virtual_key
  }

  /**
   * Updates a Virtual Key.
   * @param vkId - Virtual Key ID
   * @param request - Fields to update
   * @returns Updated Virtual Key data
   */
  async updateVirtualKey(
    vkId: string,
    request: UpdateVirtualKeyRequest,
  ): Promise<BifrostVirtualKey> {
    const response = await this.put<VirtualKeyResponse>(
      `/api/governance/virtual-keys/${encodeURIComponent(vkId)}`,
      request,
    )
    return response.virtual_key
  }

  /**
   * Deletes a Virtual Key.
   * @param vkId - Virtual Key ID
   */
  async deleteVirtualKey(vkId: string): Promise<void> {
    await this.delete(`/api/governance/virtual-keys/${encodeURIComponent(vkId)}`)
  }

  /**
   * Queries Gateway request logs.
   * @param query - Filtering and pagination parameters
   * @returns Log entries and total count
   */
  async getLogs(query?: BifrostLogsQuery): Promise<BifrostLogsResponse> {
    const params = query ? this.toQueryString(query) : ''
    const path = params ? `/api/logs?${params}` : '/api/logs'
    return this.get<BifrostLogsResponse>(path)
  }

  /**
   * Retrieves log statistics summary (total requests, cost, token count, average latency).
   * @param query - Filtering parameters (shared with {@link getLogs})
   * @returns Statistics summary
   */
  async getLogsStats(query?: BifrostLogsQuery): Promise<BifrostLogsStats> {
    const params = query ? this.toQueryString(query) : ''
    const path = params ? `/api/logs/stats?${params}` : '/api/logs/stats'
    return this.get<BifrostLogsStats>(path)
  }

  /**
   * Creates a new Team.
   * @param request - Creation parameters
   * @returns The created Team
   */
  async createTeam(request: CreateTeamRequest): Promise<BifrostTeam> {
    // retry: false — a 5xx from a retried POST could double-create upstream.
    const response = await this.post<TeamResponse>(
      '/api/governance/teams',
      request,
      { retry: false },
    )
    return response.team
  }

  /**
   * Lists Teams, optionally filtered by customer ID.
   * @param query - Optional filtering parameters
   * @returns A list of Teams
   */
  async listTeams(query?: BifrostTeamsQuery): Promise<readonly BifrostTeam[]> {
    const params = query ? this.toQueryString(query) : ''
    const path = params ? `/api/governance/teams?${params}` : '/api/governance/teams'
    const response = await this.get<TeamListResponse>(path)
    return response.teams
  }

  /**
   * Retrieves details for a single Team.
   * @param teamId - Team ID
   * @returns Team data
   */
  async getTeam(teamId: string): Promise<BifrostTeam> {
    const response = await this.get<TeamResponse>(
      `/api/governance/teams/${encodeURIComponent(teamId)}`,
    )
    return response.team
  }

  /**
   * Updates a Team.
   * @param teamId - Team ID
   * @param request - Fields to update
   * @returns Updated Team data
   */
  async updateTeam(teamId: string, request: UpdateTeamRequest): Promise<BifrostTeam> {
    const response = await this.put<TeamResponse>(
      `/api/governance/teams/${encodeURIComponent(teamId)}`,
      request,
    )
    return response.team
  }

  /**
   * Deletes a Team.
   * @param teamId - Team ID
   */
  async deleteTeam(teamId: string): Promise<void> {
    await this.delete(`/api/governance/teams/${encodeURIComponent(teamId)}`)
  }

  /**
   * Lists available AI models on the Gateway.
   * @param query - Filtering and pagination parameters
   * @returns List of models
   */
  async listModels(query?: BifrostModelsQuery): Promise<readonly BifrostModel[]> {
    const params = query ? this.toQueryString(query) : ''
    const path = params ? `/v1/models?${params}` : '/v1/models'
    const response = await this.get<BifrostModelsResponse>(path)
    return response.data
  }

  /** Sends a GET request. */
  private async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path)
  }

  /** Sends a POST request. */
  private async post<T>(path: string, body: unknown, opts?: { retry?: boolean }): Promise<T> {
    return this.request<T>('POST', path, body, opts)
  }

  /** Sends a PUT request. */
  private async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', path, body)
  }

  /** Sends a DELETE request. */
  private async delete(path: string): Promise<void> {
    await this.request<unknown>('DELETE', path)
  }

  /**
   * Core HTTP request method, integrating optional Bearer authentication, timeout control, and automatic retries.
   *
   * @typeParam T - Expected response JSON type
   * @param method - HTTP method
   * @param path - API path (appended to `baseUrl`)
   * @param body - Request body (serialized to JSON)
   * @returns Parsed response data
   * @throws {@link BifrostApiError} when the API returns a non-2xx status code
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    opts?: { retry?: boolean },
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`

    const run = async (): Promise<T> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      const bearer = this.config.masterKey?.trim()
      if (bearer) {
        headers.Authorization = `Bearer ${bearer}`
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.config.timeoutMs),
      })

      if (!response.ok) {
        let responseBody: unknown
        try {
          responseBody = await response.json()
        } catch {
          responseBody = await response.text().catch(() => null)
        }
        throw new BifrostApiError(response.status, path, `${method} request failed`, responseBody)
      }

      return response.json() as Promise<T>
    }

    if (opts?.retry === false) return run()
    return withRetry(run, {
      maxRetries: this.config.maxRetries,
      baseDelayMs: this.config.retryBaseDelayMs,
    })
  }

  /**
   * Converts an object to a URL query string, automatically filtering `undefined` and `null` values.
   * @param params - Query parameters object
   * @returns Encoded query string (without the `?` prefix)
   */
  private toQueryString(params: object): string {
    return Object.entries(params as Record<string, unknown>)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&')
  }
}
