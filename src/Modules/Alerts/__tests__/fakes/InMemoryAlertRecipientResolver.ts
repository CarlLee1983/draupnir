import type {
  AlertRecipientContext,
  IAlertRecipientResolver,
} from '../../Domain/Services/IAlertRecipientResolver'

/**
 * InMemoryAlertRecipientResolver
 *
 * DI-less test fake (D-16) for IAlertRecipientResolver.
 * Supports seeded construction for immediate test setup without requiring
 * Organization, Auth, or OrgMember mock infrastructure.
 *
 * @example
 * ```typescript
 * const resolver = new InMemoryAlertRecipientResolver({
 *   'org-1': { orgId: 'org-1', orgName: 'Acme', emails: ['a@example.com'] },
 * })
 * ```
 */
export class InMemoryAlertRecipientResolver implements IAlertRecipientResolver {
  private readonly store: Map<string, AlertRecipientContext>

  constructor(seed: Record<string, AlertRecipientContext> = {}) {
    this.store = new Map(Object.entries(seed))
  }

  async resolveByOrg(orgId: string): Promise<AlertRecipientContext> {
    return this.store.get(orgId) ?? { orgId, orgName: 'Unknown', emails: [] }
  }

  /**
   * Programmatically seed or update a recipient context.
   * Useful for test scenarios that need to set up state after construction.
   */
  setContext(orgId: string, ctx: AlertRecipientContext): void {
    this.store.set(orgId, ctx)
  }
}
