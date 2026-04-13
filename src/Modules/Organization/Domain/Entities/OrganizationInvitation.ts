import { InvitationStatus } from '../ValueObjects/InvitationStatus'
import { OrgMemberRole } from '../ValueObjects/OrgMemberRole'

const EXPIRY_DAYS = 7

async function sha256(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

interface OrganizationInvitationProps {
  id: string
  organizationId: string
  email: string
  token: string
  tokenHash: string
  role: OrgMemberRole
  invitedByUserId: string
  status: InvitationStatus
  expiresAt: Date
  createdAt: Date
}

export class OrganizationInvitation {
  private readonly props: OrganizationInvitationProps

  private constructor(props: OrganizationInvitationProps) {
    this.props = props
  }

  static async create(
    organizationId: string,
    email: string,
    role: OrgMemberRole,
    invitedByUserId: string,
  ): Promise<OrganizationInvitation> {
    const buffer = new Uint8Array(32)
    crypto.getRandomValues(buffer)
    const token = Array.from(buffer)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    const tokenHash = await sha256(token)
    return new OrganizationInvitation({
      id: crypto.randomUUID(),
      organizationId,
      email: email.toLowerCase(),
      token,
      tokenHash,
      role,
      invitedByUserId,
      status: new InvitationStatus('pending'),
      expiresAt: new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    })
  }

  /** 從持久層重建 OrganizationInvitation（不含業務邏輯）。 */
  static reconstitute(props: OrganizationInvitationProps): OrganizationInvitation {
    return new OrganizationInvitation(props)
  }

  get id(): string {
    return this.props.id
  }
  get organizationId(): string {
    return this.props.organizationId
  }
  get email(): string {
    return this.props.email
  }
  get token(): string {
    return this.props.token
  }
  /** Assigned role as OrgMemberRole VO. */
  get role(): OrgMemberRole {
    return this.props.role
  }
  get invitedByUserId(): string {
    return this.props.invitedByUserId
  }
  /** Invitation status as InvitationStatus VO. */
  get status(): InvitationStatus {
    return this.props.status
  }
  get expiresAt(): Date {
    return this.props.expiresAt
  }
  get createdAt(): Date {
    return this.props.createdAt
  }

  getTokenHash(): string {
    return this.props.tokenHash
  }

  isExpired(): boolean {
    return new Date() > this.props.expiresAt
  }

  isPending(): boolean {
    return this.props.status.isPending() && !this.isExpired()
  }

  markAsAccepted(): OrganizationInvitation {
    return new OrganizationInvitation({
      ...this.props,
      status: new InvitationStatus('accepted'),
    })
  }

  cancel(): OrganizationInvitation {
    return new OrganizationInvitation({
      ...this.props,
      status: new InvitationStatus('cancelled'),
    })
  }
}
