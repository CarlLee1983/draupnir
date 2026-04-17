/**
 * Organization
 * Domain Aggregate: represents a business unit or team.
 *
 * Responsibilities:
 * - Define identity and unique slug
 * - Manage active/suspended status
 * - Encapsulate organization-level metadata
 */

import { OrgSlug } from '../ValueObjects/OrgSlug'

/** Properties defining an Organization's state. */
interface OrganizationProps {
  id: string
  name: string
  slug: string
  description: string
  status: 'active' | 'suspended'
  /**
   * Bifrost Team ID linked to this organization. Populated lazily by
   * ProvisionOrganizationDefaultsService after the Bifrost Team is created.
   * Virtual keys minted for this org are attached to this Team so spend aggregates.
   */
  gatewayTeamId: string | null
  createdAt: Date
  updatedAt: Date
}

/** Fields available for organization updates. */
export interface UpdateOrganizationFields {
  name?: string
  description?: string
}

/**
 * Organization Aggregate Root
 * Handles business logic for organization state and settings.
 */
export class Organization {
  private readonly props: OrganizationProps

  private constructor(props: OrganizationProps) {
    this.props = props
  }

  /** Creates a new organization. */
  static create(id: string, name: string, description: string, slug?: string): Organization {
    const orgSlug = slug ? new OrgSlug(slug) : OrgSlug.fromName(name)
    return new Organization({
      id,
      name,
      slug: orgSlug.getValue(),
      description,
      status: 'active',
      gatewayTeamId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  /** Attaches a Bifrost Team ID to this organization (post-provisioning). */
  attachGatewayTeam(teamId: string): Organization {
    return new Organization({ ...this.props, gatewayTeamId: teamId, updatedAt: new Date() })
  }

  /** 從持久層重建 Organization（不含業務邏輯）。 */
  static reconstitute(props: OrganizationProps): Organization {
    return new Organization(props)
  }

  /** Updates optional organization fields. */
  update(fields: UpdateOrganizationFields): Organization {
    return new Organization({
      ...this.props,
      ...(fields.name !== undefined && { name: fields.name }),
      ...(fields.description !== undefined && { description: fields.description }),
      updatedAt: new Date(),
    })
  }

  /** Marks the organization as suspended. */
  suspend(): Organization {
    return new Organization({ ...this.props, status: 'suspended', updatedAt: new Date() })
  }

  /** Reactivates a suspended organization. */
  activate(): Organization {
    return new Organization({ ...this.props, status: 'active', updatedAt: new Date() })
  }

  /** Unique identifier. */
  get id(): string {
    return this.props.id
  }
  /** Human-readable name. */
  get name(): string {
    return this.props.name
  }
  /** URL-friendly identifier. */
  get slug(): string {
    return this.props.slug
  }
  /** Business description. */
  get description(): string {
    return this.props.description
  }
  /** Current status (active/suspended). */
  get status(): string {
    return this.props.status
  }
  /** Bifrost Team ID linked to this organization, or null before provisioning completes. */
  get gatewayTeamId(): string | null {
    return this.props.gatewayTeamId
  }
  /** Creation timestamp. */
  get createdAt(): Date {
    return this.props.createdAt
  }
  /** Last update timestamp. */
  get updatedAt(): Date {
    return this.props.updatedAt
  }
}
