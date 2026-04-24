import type { WebhookSecret } from '../Services/Webhook/WebhookSecret'

/**
 * Payload for dispatching a webhook event.
 */
export interface WebhookDispatchRequest {
  /** Target URL for the webhook POST request. */
  readonly url: string
  /** Secret used to sign the webhook payload. */
  readonly secret: WebhookSecret
  /** Event type identifier (e.g., 'organization.created'). */
  readonly eventType: string
  /** Data payload to be sent as JSON in the request body. */
  readonly payload: Record<string, unknown>
}

/**
 * Result of a webhook dispatch attempt.
 */
export interface WebhookDispatchResult {
  /** Whether the dispatch was successful (received HTTP 2xx). */
  readonly success: boolean
  /** HTTP status code returned by the target URL. */
  readonly statusCode?: number
  /** Error message if the dispatch failed. */
  readonly error?: string
  /** Number of attempts made to deliver the webhook. */
  readonly attempts: number
  /** Unique identifier for this webhook execution. */
  readonly webhookId: string
  /** True when the job was accepted into a background queue but not yet delivered. */
  readonly enqueued?: boolean
}

/**
 * Port for dispatching webhooks to external URLs.
 */
export interface IWebhookDispatcher {
  /**
   * Dispatches a webhook request to the target URL.
   * @param request - The webhook dispatch parameters
   * @returns The result of the dispatch attempt or queueing status
   */
  dispatch(request: WebhookDispatchRequest): Promise<WebhookDispatchResult>
}
