// src/Modules/CliApi/Domain/ValueObjects/DeviceCode.ts
export enum DeviceCodeStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CONSUMED = 'consumed',
}

interface DeviceCodeProps {
  readonly deviceCode: string
  readonly userCode: string
  readonly verificationUri: string
  readonly status: DeviceCodeStatus
  readonly userId: string | null
  readonly userEmail: string | null
  readonly userRole: string | null
  readonly expiresAt: Date
  readonly createdAt: Date
}

interface CreateDeviceCodeParams {
  deviceCode: string
  userCode: string
  verificationUri: string
  expiresAt: Date
}

export class DeviceCode {
  private readonly props: DeviceCodeProps

  private constructor(props: DeviceCodeProps) {
    this.props = props
  }

  static create(params: CreateDeviceCodeParams): DeviceCode {
    return new DeviceCode({
      deviceCode: params.deviceCode,
      userCode: params.userCode,
      verificationUri: params.verificationUri,
      status: DeviceCodeStatus.PENDING,
      userId: null,
      userEmail: null,
      userRole: null,
      expiresAt: params.expiresAt,
      createdAt: new Date(),
    })
  }

  static generateUserCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
    const bytes = crypto.getRandomValues(new Uint8Array(8))
    return Array.from(bytes)
      .map((b) => chars[b % chars.length])
      .join('')
  }

  isExpired(): boolean {
    return this.props.expiresAt.getTime() <= Date.now()
  }

  authorize(userId: string, email: string, role: string): DeviceCode {
    if (this.isExpired()) {
      throw new Error('Device code 已過期')
    }
    if (this.props.status !== DeviceCodeStatus.PENDING) {
      throw new Error('此 device code 已被授權')
    }
    return new DeviceCode({
      ...this.props,
      status: DeviceCodeStatus.AUTHORIZED,
      userId,
      userEmail: email,
      userRole: role,
    })
  }

  consume(): DeviceCode {
    if (this.props.status !== DeviceCodeStatus.AUTHORIZED) {
      throw new Error('只有已授權的 device code 可以被消費')
    }
    return new DeviceCode({
      ...this.props,
      status: DeviceCodeStatus.CONSUMED,
    })
  }

  get deviceCode(): string {
    return this.props.deviceCode
  }
  get userCode(): string {
    return this.props.userCode
  }
  get verificationUri(): string {
    return this.props.verificationUri
  }
  get status(): DeviceCodeStatus {
    return this.props.status
  }
  get userId(): string | null {
    return this.props.userId
  }
  get userEmail(): string | null {
    return this.props.userEmail
  }
  get userRole(): string | null {
    return this.props.userRole
  }
  get expiresAt(): Date {
    return this.props.expiresAt
  }
  get createdAt(): Date {
    return this.props.createdAt
  }

  toDTO(): Record<string, unknown> {
    return {
      deviceCode: this.props.deviceCode,
      userCode: this.props.userCode,
      verificationUri: this.props.verificationUri,
      status: this.props.status,
      expiresAt: this.props.expiresAt.toISOString(),
    }
  }
}
