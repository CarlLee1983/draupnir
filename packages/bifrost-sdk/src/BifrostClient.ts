import type { BifrostClientConfig } from './BifrostClientConfig'
import type {
  CreateVirtualKeyRequest,
  UpdateVirtualKeyRequest,
  BifrostVirtualKey,
  VirtualKeyResponse,
  VirtualKeyListResponse,
  BifrostLogsQuery,
  BifrostLogsResponse,
  BifrostLogsStats,
  BifrostModel,
  BifrostModelsQuery,
  BifrostModelsResponse,
} from './types'
import { BifrostApiError } from './errors'
import { withRetry } from './retry'

export class BifrostClient {
  private readonly config: BifrostClientConfig

  constructor(config: BifrostClientConfig) {
    this.config = config
  }

  async createVirtualKey(request: CreateVirtualKeyRequest): Promise<BifrostVirtualKey> {
    const response = await this.post<VirtualKeyResponse>('/api/governance/virtual-keys', request)
    return response.virtual_key
  }

  async listVirtualKeys(): Promise<readonly BifrostVirtualKey[]> {
    const response = await this.get<VirtualKeyListResponse>('/api/governance/virtual-keys')
    return response.virtual_keys
  }

  async getVirtualKey(vkId: string): Promise<BifrostVirtualKey> {
    const response = await this.get<VirtualKeyResponse>(
      `/api/governance/virtual-keys/${encodeURIComponent(vkId)}`,
    )
    return response.virtual_key
  }

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

  async deleteVirtualKey(vkId: string): Promise<void> {
    await this.delete(`/api/governance/virtual-keys/${encodeURIComponent(vkId)}`)
  }

  async getLogs(query?: BifrostLogsQuery): Promise<BifrostLogsResponse> {
    const params = query ? this.toQueryString(query) : ''
    const path = params ? `/api/logs?${params}` : '/api/logs'
    return this.get<BifrostLogsResponse>(path)
  }

  async getLogsStats(query?: BifrostLogsQuery): Promise<BifrostLogsStats> {
    const params = query ? this.toQueryString(query) : ''
    const path = params ? `/api/logs/stats?${params}` : '/api/logs/stats'
    return this.get<BifrostLogsStats>(path)
  }

  async listModels(query?: BifrostModelsQuery): Promise<readonly BifrostModel[]> {
    const params = query ? this.toQueryString(query) : ''
    const path = params ? `/v1/models?${params}` : '/v1/models'
    const response = await this.get<BifrostModelsResponse>(path)
    return response.data
  }

  private async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path)
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  private async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', path, body)
  }

  private async delete(path: string): Promise<void> {
    await this.request<unknown>('DELETE', path)
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.config.baseUrl}${path}`

    return withRetry(
      async () => {
        const response = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${this.config.masterKey}`,
            'Content-Type': 'application/json',
          },
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
      },
      { maxRetries: this.config.maxRetries, baseDelayMs: this.config.retryBaseDelayMs },
    )
  }

  private toQueryString(params: object): string {
    return Object.entries(params as Record<string, unknown>)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&')
  }
}
