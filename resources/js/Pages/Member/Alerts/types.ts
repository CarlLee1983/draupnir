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

export interface AlertDeliveryDTO {
  id: string
  channel: 'email' | 'webhook'
  target: string
  targetUrl: string | null
  status: 'pending' | 'sent' | 'failed'
  attempts: number
  statusCode: number | null
  errorMessage: string | null
  dispatchedAt: string
  deliveredAt: string | null
}

export interface AlertEventHistoryDTO {
  id: string
  orgId: string
  tier: 'warning' | 'critical'
  month: string
  budgetUsd: string
  actualCostUsd: string
  percentage: string
  createdAt: string
  deliveries: AlertDeliveryDTO[]
}

export interface AlertsPageProps {
  orgId: string | null
  budget: { budgetUsd: string | null; warningPct: number; criticalPct: number } | null
  webhookEndpoints: WebhookEndpointListDTO[]
  alertHistory: AlertEventHistoryDTO[]
  error?: string | null
}

export type AlertsTab = 'budgets' | 'webhooks' | 'history'
