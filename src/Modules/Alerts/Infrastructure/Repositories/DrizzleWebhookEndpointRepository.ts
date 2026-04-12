import { and, desc, eq, sql } from 'drizzle-orm'
import { getDrizzleInstance } from '@/Shared/Infrastructure/Database/Adapters/Drizzle/config'
import { webhookEndpoints } from '@/Shared/Infrastructure/Database/Adapters/Drizzle/schema'
import type { IWebhookEndpointRepository } from '../../Domain/Repositories/IWebhookEndpointRepository'
import { WebhookEndpoint } from '../../Domain/Aggregates/WebhookEndpoint'
import { WebhookEndpointMapper } from '../Mappers/WebhookEndpointMapper'

export class DrizzleWebhookEndpointRepository implements IWebhookEndpointRepository {
  constructor(_db: unknown) {}

  async findById(id: string): Promise<WebhookEndpoint | null> {
    const db = getDrizzleInstance()
    const rows = await db.select().from(webhookEndpoints).where(eq(webhookEndpoints.id, id)).limit(1)
    return rows[0] ? WebhookEndpointMapper.toDomain(rows[0] as Record<string, unknown>) : null
  }

  async findByOrg(orgId: string): Promise<WebhookEndpoint[]> {
    const db = getDrizzleInstance()
    const rows = await db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.org_id, orgId))
      .orderBy(desc(webhookEndpoints.created_at))

    return rows.map((row: Record<string, unknown>) => WebhookEndpointMapper.toDomain(row))
  }

  async findActiveByOrg(orgId: string): Promise<WebhookEndpoint[]> {
    const db = getDrizzleInstance()
    const rows = await db
      .select()
      .from(webhookEndpoints)
      .where(and(eq(webhookEndpoints.org_id, orgId), eq(webhookEndpoints.active, true)))
      .orderBy(desc(webhookEndpoints.created_at))

    return rows.map((row: Record<string, unknown>) => WebhookEndpointMapper.toDomain(row))
  }

  async countByOrg(orgId: string): Promise<number> {
    const db = getDrizzleInstance()
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.org_id, orgId))

    return Number(rows[0]?.count ?? 0)
  }

  async save(endpoint: WebhookEndpoint): Promise<void> {
    const db = getDrizzleInstance()
    await db
      .insert(webhookEndpoints)
      .values(WebhookEndpointMapper.toPersistence(endpoint))
      .onConflictDoUpdate({
        target: webhookEndpoints.id,
        set: {
          org_id: endpoint.orgId,
          url: endpoint.url,
          secret: endpoint.secret,
          active: endpoint.active,
          description: endpoint.description,
          created_at: endpoint.createdAt,
          last_success_at: endpoint.lastSuccessAt,
          last_failure_at: endpoint.lastFailureAt,
        },
      })
  }

  async delete(id: string): Promise<void> {
    const db = getDrizzleInstance()
    await db.delete(webhookEndpoints).where(eq(webhookEndpoints.id, id))
  }
}
