export interface AppKeyCreatedEvent {
  readonly type: 'app_key.created'
  readonly data: {
    readonly keyId: string
    readonly orgId: string
    readonly issuedByUserId: string
    readonly scope: string
  }
  readonly occurredAt: Date
}

export interface AppKeyRotatedEvent {
  readonly type: 'app_key.rotated'
  readonly data: {
    readonly keyId: string
    readonly orgId: string
    readonly previousGatewayKeyId: string
    readonly newGatewayKeyId: string
    readonly gracePeriodEndsAt: string
  }
  readonly occurredAt: Date
}

export interface AppKeyRevokedEvent {
  readonly type: 'app_key.revoked'
  readonly data: {
    readonly keyId: string
    readonly orgId: string
    readonly gatewayKeyId: string
    readonly previousGatewayKeyId: string | null
  }
  readonly occurredAt: Date
}

export type AppApiKeyEvent = AppKeyCreatedEvent | AppKeyRotatedEvent | AppKeyRevokedEvent
