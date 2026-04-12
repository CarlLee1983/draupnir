export interface WebhookEndpointProps {
  readonly id: string
  readonly orgId: string
  readonly url: string
  readonly secret: string
  readonly active: boolean
  readonly description: string | null
  readonly createdAt: string
  readonly lastSuccessAt: string | null
  readonly lastFailureAt: string | null
}

export class WebhookEndpoint {
  private readonly props: WebhookEndpointProps

  private constructor(props: WebhookEndpointProps) {
    this.props = props
  }

  static create(orgId: string, url: string, description: string | null = null): WebhookEndpoint {
    return new WebhookEndpoint({
      id: crypto.randomUUID(),
      orgId,
      url,
      secret: WebhookEndpoint.generateSecret(),
      active: true,
      description,
      createdAt: new Date().toISOString(),
      lastSuccessAt: null,
      lastFailureAt: null,
    })
  }

  static rehydrate(props: WebhookEndpointProps): WebhookEndpoint {
    return new WebhookEndpoint({
      ...props,
      description: props.description ?? null,
      lastSuccessAt: props.lastSuccessAt ?? null,
      lastFailureAt: props.lastFailureAt ?? null,
    })
  }

  activate(): WebhookEndpoint {
    if (this.props.active) {
      return this
    }

    return new WebhookEndpoint({
      ...this.props,
      active: true,
    })
  }

  deactivate(): WebhookEndpoint {
    if (!this.props.active) {
      return this
    }

    return new WebhookEndpoint({
      ...this.props,
      active: false,
    })
  }

  rotateSecret(): WebhookEndpoint {
    return new WebhookEndpoint({
      ...this.props,
      secret: WebhookEndpoint.generateSecret(),
    })
  }

  recordSuccess(at: string): WebhookEndpoint {
    return new WebhookEndpoint({
      ...this.props,
      lastSuccessAt: at,
    })
  }

  recordFailure(at: string): WebhookEndpoint {
    return new WebhookEndpoint({
      ...this.props,
      lastFailureAt: at,
    })
  }

  withDescription(description: string | null): WebhookEndpoint {
    return new WebhookEndpoint({
      ...this.props,
      description,
    })
  }

  get id(): string {
    return this.props.id
  }

  get orgId(): string {
    return this.props.orgId
  }

  get url(): string {
    return this.props.url
  }

  get secret(): string {
    return this.props.secret
  }

  get active(): boolean {
    return this.props.active
  }

  get description(): string | null {
    return this.props.description
  }

  get createdAt(): string {
    return this.props.createdAt
  }

  get lastSuccessAt(): string | null {
    return this.props.lastSuccessAt
  }

  get lastFailureAt(): string | null {
    return this.props.lastFailureAt
  }

  private static generateSecret(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(32))
    const suffix = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
    return `whsec_${suffix}`
  }
}
