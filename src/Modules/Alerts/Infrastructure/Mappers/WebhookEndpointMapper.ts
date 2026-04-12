import { WebhookEndpoint, type WebhookEndpointProps } from '../../Domain/Aggregates/WebhookEndpoint'

export interface WebhookEndpointsInsert {
  id: string
  org_id: string
  url: string
  secret: string
  active: boolean
  description: string | null
  created_at: string
  last_success_at: string | null
  last_failure_at: string | null
}

export class WebhookEndpointMapper {
  static toDomain(row: Record<string, unknown>): WebhookEndpoint {
    return WebhookEndpoint.rehydrate({
      id: String(row.id),
      orgId: String(row.org_id),
      url: String(row.url),
      secret: String(row.secret),
      active: Boolean(row.active),
      description: row.description === null || row.description === undefined ? null : String(row.description),
      createdAt: String(row.created_at),
      lastSuccessAt: row.last_success_at === null || row.last_success_at === undefined ? null : String(row.last_success_at),
      lastFailureAt: row.last_failure_at === null || row.last_failure_at === undefined ? null : String(row.last_failure_at),
    } satisfies WebhookEndpointProps)
  }

  static toPersistence(endpoint: WebhookEndpoint): WebhookEndpointsInsert {
    return {
      id: endpoint.id,
      org_id: endpoint.orgId,
      url: endpoint.url,
      secret: endpoint.secret,
      active: endpoint.active,
      description: endpoint.description,
      created_at: endpoint.createdAt,
      last_success_at: endpoint.lastSuccessAt,
      last_failure_at: endpoint.lastFailureAt,
    }
  }
}
