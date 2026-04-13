/**
 * IAlertRecipientResolver
 *
 * Alerts-owned Domain port (D-05) that abstracts cross-module recipient resolution.
 * SendAlertService consumes this port instead of depending directly on
 * IOrganizationRepository, IOrganizationMemberRepository, and IAuthRepository.
 *
 * @module Alerts/Domain/Services
 */

/**
 * Resolved context for a single organization's alert recipients.
 */
export interface AlertRecipientContext {
  /** Organization identifier. */
  readonly orgId: string
  /** Human-readable organization name. */
  readonly orgName: string
  /** Deduplicated list of manager email addresses to notify. */
  readonly emails: readonly string[]
  /** Optional locale hint for email template localization. */
  readonly locale?: string
}

/**
 * Port for resolving who should receive alerts for a given organization.
 *
 * Implemented in Infrastructure (AlertRecipientResolverImpl) which composes
 * the three cross-module repos. DI-less tests use InMemoryAlertRecipientResolver.
 */
export interface IAlertRecipientResolver {
  /**
   * Resolves the recipient context for an organization.
   *
   * @param orgId - The organization identifier.
   * @returns Alert recipient context including org name and deduplicated manager emails.
   */
  resolveByOrg(orgId: string): Promise<AlertRecipientContext>
}
