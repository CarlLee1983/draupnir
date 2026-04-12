import type {
  AlertEventHistoryDTO,
  AlertDeliveryDTO,
  WebhookEndpointCreatedDTO,
  WebhookEndpointListDTO,
} from './types'

type ApiEnvelope<T> = {
  success?: boolean
  message?: string
  data?: T
}

function readCsrfToken(): string {
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
  return token ?? ''
}

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers ?? {})
  headers.set('Accept', 'application/json')

  const method = (init.method ?? 'GET').toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') {
    headers.set('Content-Type', 'application/json')
    const csrfToken = readCsrfToken()
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken)
    }
  }

  const response = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    method,
    headers,
  })

  const text = await response.text()
  const payload = text.length > 0 ? (JSON.parse(text) as ApiEnvelope<T>) : null

  if (!response.ok) {
    throw new Error(payload?.message ?? `Request failed with status ${response.status}`)
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload.data as T) ?? (undefined as T)
  }

  return undefined as T
}

export async function listWebhooks(orgId: string): Promise<WebhookEndpointListDTO[]> {
  return requestJson<WebhookEndpointListDTO[]>(
    `/api/organizations/${encodeURIComponent(orgId)}/alerts/webhooks`,
  )
}

export async function createWebhook(
  orgId: string,
  body: { url: string; description?: string | null },
): Promise<WebhookEndpointCreatedDTO> {
  return requestJson<WebhookEndpointCreatedDTO>(
    `/api/organizations/${encodeURIComponent(orgId)}/alerts/webhooks`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )
}

export async function updateWebhook(
  orgId: string,
  endpointId: string,
  body: { active?: boolean; description?: string | null },
): Promise<WebhookEndpointListDTO> {
  return requestJson<WebhookEndpointListDTO>(
    `/api/organizations/${encodeURIComponent(orgId)}/alerts/webhooks/${encodeURIComponent(endpointId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  )
}

export async function rotateSecret(
  orgId: string,
  endpointId: string,
): Promise<WebhookEndpointCreatedDTO> {
  return requestJson<WebhookEndpointCreatedDTO>(
    `/api/organizations/${encodeURIComponent(orgId)}/alerts/webhooks/${encodeURIComponent(endpointId)}/rotate-secret`,
    {
      method: 'POST',
    },
  )
}

export async function testWebhook(
  orgId: string,
  endpointId: string,
): Promise<{ success: boolean; statusCode: number | null; attempts: number; error: string | null }> {
  const payload = await requestJson<{
    success: boolean
    data: { statusCode: number | null; attempts: number; error: string | null }
  }>(
    `/api/organizations/${encodeURIComponent(orgId)}/alerts/webhooks/${encodeURIComponent(endpointId)}/test`,
    {
      method: 'POST',
    },
  )

  return payload.data
}

export async function deleteWebhook(orgId: string, endpointId: string): Promise<void> {
  await requestJson<void>(
    `/api/organizations/${encodeURIComponent(orgId)}/alerts/webhooks/${encodeURIComponent(endpointId)}`,
    {
      method: 'DELETE',
    },
  )
}

export async function listHistory(
  orgId: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<AlertEventHistoryDTO[]> {
  const params = new URLSearchParams({
    limit: String(opts.limit ?? 50),
    offset: String(opts.offset ?? 0),
  })
  return requestJson<AlertEventHistoryDTO[]>(
    `/api/organizations/${encodeURIComponent(orgId)}/alerts/history?${params.toString()}`,
  )
}

export async function resendDelivery(
  orgId: string,
  deliveryId: string,
): Promise<AlertDeliveryDTO> {
  return requestJson<AlertDeliveryDTO>(
    `/api/organizations/${encodeURIComponent(orgId)}/alerts/deliveries/${encodeURIComponent(deliveryId)}/resend`,
    {
      method: 'POST',
    },
  )
}

export { requestJson }
