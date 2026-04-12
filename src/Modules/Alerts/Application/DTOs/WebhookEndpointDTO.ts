import type { WebhookEndpoint } from '../../Domain/Aggregates/WebhookEndpoint'

export interface WebhookEndpointListDTO {
  id: string
  orgId: string
  url: string
  active: boolean
  description: string | null
  createdAt: string
  lastSuccessAt: string | null
  lastFailureAt: string | null
  secretMask: string
}

export interface WebhookEndpointCreatedDTO extends Omit<WebhookEndpointListDTO, 'secretMask'> {
  secret: string
}

function maskSecret(secret: string): string {
  return `whsec_****${secret.slice(-4)}`
}

export function toListDTO(endpoint: WebhookEndpoint): WebhookEndpointListDTO {
  return {
    id: endpoint.id,
    orgId: endpoint.orgId,
    url: endpoint.url,
    active: endpoint.active,
    description: endpoint.description,
    createdAt: endpoint.createdAt,
    lastSuccessAt: endpoint.lastSuccessAt,
    lastFailureAt: endpoint.lastFailureAt,
    secretMask: maskSecret(endpoint.secret),
  }
}

export function toCreatedDTO(endpoint: WebhookEndpoint, plaintextSecret: string): WebhookEndpointCreatedDTO {
  return {
    id: endpoint.id,
    orgId: endpoint.orgId,
    url: endpoint.url,
    active: endpoint.active,
    description: endpoint.description,
    createdAt: endpoint.createdAt,
    lastSuccessAt: endpoint.lastSuccessAt,
    lastFailureAt: endpoint.lastFailureAt,
    secret: plaintextSecret,
  }
}
