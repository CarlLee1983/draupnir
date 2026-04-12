export class WebhookEndpointGoneError extends Error {
  constructor(message = 'Webhook endpoint no longer exists') {
    super(message)
    this.name = 'WebhookEndpointGoneError'
  }
}
