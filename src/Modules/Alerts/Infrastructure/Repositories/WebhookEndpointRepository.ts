import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { WebhookEndpoint } from '../../Domain/Aggregates/WebhookEndpoint'
import type { IWebhookEndpointRepository } from '../../Domain/Repositories/IWebhookEndpointRepository'
import { WebhookEndpointMapper } from '../Mappers/WebhookEndpointMapper'

/**
 * Webhook Endpoint Repository — IDatabaseAccess Implementation
 *
 * Replaces the Drizzle-coupled version using the ORM-agnostic IDatabaseAccess port.
 * The `save` operation performs an upsert via delete-then-insert semantics since
 * IDatabaseAccess does not expose an `onConflictDoUpdate` API.
 */
export class WebhookEndpointRepository implements IWebhookEndpointRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async findById(id: string): Promise<WebhookEndpoint | null> {
    const row = await this.db.table('webhook_endpoints').where('id', '=', id).first()
    return row ? WebhookEndpointMapper.toDomain(row) : null
  }

  async findByOrg(orgId: string): Promise<WebhookEndpoint[]> {
    const rows = await this.db
      .table('webhook_endpoints')
      .where('org_id', '=', orgId)
      .orderBy('created_at', 'DESC')
      .select()
    return rows.map((row) => WebhookEndpointMapper.toDomain(row))
  }

  async findActiveByOrg(orgId: string): Promise<WebhookEndpoint[]> {
    const rows = await this.db
      .table('webhook_endpoints')
      .where('org_id', '=', orgId)
      .where('active', '=', true)
      .orderBy('created_at', 'DESC')
      .select()
    return rows.map((row) => WebhookEndpointMapper.toDomain(row))
  }

  async countByOrg(orgId: string): Promise<number> {
    return this.db.table('webhook_endpoints').where('org_id', '=', orgId).count()
  }

  /**
   * Upserts a WebhookEndpoint.
   *
   * Uses a transaction with delete-then-insert because IDatabaseAccess does not
   * expose an `onConflictDoUpdate` API. This is semantically equivalent to the
   * Drizzle `onConflictDoUpdate` pattern.
   */
  async save(endpoint: WebhookEndpoint): Promise<void> {
    const data = WebhookEndpointMapper.toPersistence(endpoint) as unknown as Record<string, unknown>
    await this.db.transaction(async (tx) => {
      await tx.table('webhook_endpoints').where('id', '=', endpoint.id).delete()
      await tx.table('webhook_endpoints').insert(data)
    })
  }

  async delete(id: string): Promise<void> {
    await this.db.table('webhook_endpoints').where('id', '=', id).delete()
  }
}
