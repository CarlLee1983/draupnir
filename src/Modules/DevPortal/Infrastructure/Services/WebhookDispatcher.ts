import type { WebhookSecret } from '../../Domain/ValueObjects/WebhookSecret'

interface DispatchRequest {
  url: string
  secret: WebhookSecret
  eventType: string
  payload: Record<string, unknown>
}

interface DispatchResult {
  success: boolean
  statusCode?: number
  error?: string
  attempts: number
}

export class WebhookDispatcher {
  private readonly maxRetries = 3
  private readonly baseDelayMs = 100

  async dispatch(request: DispatchRequest): Promise<DispatchResult> {
    const webhookPayload = {
      id: crypto.randomUUID(),
      event: request.eventType,
      data: request.payload,
      timestamp: new Date().toISOString(),
    }

    const body = JSON.stringify(webhookPayload)
    const signature = request.secret.sign(body)

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(request.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': request.eventType,
            'X-Webhook-Id': webhookPayload.id,
          },
          body,
        })

        if (response.ok) {
          return {
            success: true,
            statusCode: response.status,
            attempts: attempt,
          }
        }

        if (attempt < this.maxRetries) {
          await this.delay(attempt)
        } else {
          return {
            success: false,
            statusCode: response.status,
            error: `Webhook 發送失敗，HTTP ${response.status}，已重試 ${this.maxRetries} 次`,
            attempts: attempt,
          }
        }
      } catch (error: unknown) {
        if (attempt < this.maxRetries) {
          await this.delay(attempt)
        } else {
          const message = error instanceof Error ? error.message : '未知錯誤'
          return {
            success: false,
            error: `Webhook 發送失敗: ${message}，已重試 ${this.maxRetries} 次`,
            attempts: attempt,
          }
        }
      }
    }

    return {
      success: false,
      error: '超過最大重試次數',
      attempts: this.maxRetries,
    }
  }

  private delay(attempt: number): Promise<void> {
    const ms = this.baseDelayMs * 2 ** (attempt - 1)
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
