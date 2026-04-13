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
  role: string
  invitedByUserId: string
  status: string
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
    role: string,
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
      status: 'pending',
      expiresAt: new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    })
  }

  static fromDatabase(row: Record<string, unknown>): OrganizationInvitation {
    return new OrganizationInvitation({
      id: row.id as string,
      organizationId: row.organization_id as string,
      email: row.email as string,
      token: '',
      tokenHash: row.token_hash as string,
      role: row.role as string,
      invitedByUserId: row.invited_by_user_id as string,
      status: row.status as string,
      expiresAt: new Date(row.expires_at as string),
      createdAt: new Date(row.created_at as string),
    })
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
  get role(): string {
    return this.props.role
  }
  get invitedByUserId(): string {
    return this.props.invitedByUserId
  }
  get status(): string {
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
    return this.props.status === 'pending' && !this.isExpired()
  }

  markAsAccepted(): OrganizationInvitation {
    return new OrganizationInvitation({ ...this.props, status: 'accepted' })
  }

  cancel(): OrganizationInvitation {
    return new OrganizationInvitation({ ...this.props, status: 'cancelled' })
  }
}
