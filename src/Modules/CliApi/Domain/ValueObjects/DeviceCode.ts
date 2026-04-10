// src/Modules/CliApi/Domain/ValueObjects/DeviceCode.ts
/**
 * DeviceCode
 * Domain Value Object: represents an OAuth 2.0 Device Authorization code.
 *
 * Responsibilities:
 * - Generate human-readable user codes
 * - Manage device flow status (pending, authorized, consumed)
 * - Track temporal validity (expiration)
 * - Store authorization context (userId, role) after user verification
 */

/** Possible states for a device flow authorization request. */
export enum DeviceCodeStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CONSUMED = 'consumed',
}

/** Properties defining a DeviceCode's state. */
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

/** Parameters for creating a new DeviceCode. */
interface CreateDeviceCodeParams {
  deviceCode: string
  userCode: string
  verificationUri: string
  expiresAt: Date
}

/**
 * DeviceCode Value Object
 * Handles the logic for device-based authorization requests.
 */
export class DeviceCode {
  private readonly props: DeviceCodeProps

  private constructor(props: DeviceCodeProps) {
    this.props = props
  }

  /**
   * Creates a new pending device authorization request.
   */
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

  /**
   * Generates a short, human-friendly alphanumeric code for user entry.
   */
  static generateUserCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
    const bytes = crypto.getRandomValues(new Uint8Array(8))
    return Array.from(bytes)
      .map((b) => chars[b % chars.length])
      .join('')
  }

  /** Returns true if the current time has passed the expiration deadline. */
  isExpired(): boolean {
    return this.props.expiresAt.getTime() <= Date.now()
  }

  /**
   * Transitions the device request to authorized state.
   * Invoked after successful user authentication on a separate device.
   */
  authorize(userId: string, email: string, role: string): DeviceCode {
    if (this.isExpired()) {
      throw new Error('Device code has expired')
    }
    if (this.props.status !== DeviceCodeStatus.PENDING) {
      throw new Error('This device code has already been authorized or consumed')
    }
    return new DeviceCode({
      ...this.props,
      status: DeviceCodeStatus.AUTHORIZED,
      userId,
      userEmail: email,
      userRole: role,
    })
  }

  /**
   * Marks the code as consumed, typically after successful token exchange.
   */
  consume(): DeviceCode {
    if (this.props.status !== DeviceCodeStatus.AUTHORIZED) {
      throw new Error('Only authorized device codes can be consumed')
    }
    return new DeviceCode({
      ...this.props,
      status: DeviceCodeStatus.CONSUMED,
    })
  }

  /** Unique device-side identifier. */
  get deviceCode(): string { return this.props.deviceCode }
  /** Human-readable code for user entry. */
  get userCode(): string { return this.props.userCode }
  /** Target URI for user verification. */
  get verificationUri(): string { return this.props.verificationUri }
  /** Current state of the flow. */
  get status(): DeviceCodeStatus { return this.props.status }
  /** ID of the authorized user (null if pending). */
  get userId(): string | null { return this.props.userId }
  /** Email of the authorized user. */
  get userEmail(): string | null { return this.props.userEmail }
  /** System role of the authorized user. */
  get userRole(): string | null { return this.props.userRole }
  /** Expiration deadline. */
  get expiresAt(): Date { return this.props.expiresAt }
  /** Creation timestamp. */
  get createdAt(): Date { return this.props.createdAt }

}

