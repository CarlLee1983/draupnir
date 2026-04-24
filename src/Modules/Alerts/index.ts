/**
 * Alerts module public surface.
 *
 * Handles budget threshold evaluation, automated notifications (Email/Webhook),
 * and alert delivery history tracking.
 */

// Application Services
export { EvaluateThresholdsService } from './Application/Services/EvaluateThresholdsService'
export { RegisterWebhookEndpointService } from './Application/Services/RegisterWebhookEndpointService'

// Domain
export { AlertConfig } from './Domain/Aggregates/AlertConfig'
export { WebhookEndpoint } from './Domain/Aggregates/WebhookEndpoint'
export type { IAlertConfigRepository } from './Domain/Repositories/IAlertConfigRepository'

// Infrastructure
export { AlertsServiceProvider } from './Infrastructure/Providers/AlertsServiceProvider'

// Presentation
export { AlertController } from './Presentation/Controllers/AlertController'
export { AlertHistoryController } from './Presentation/Controllers/AlertHistoryController'
export { WebhookEndpointController } from './Presentation/Controllers/WebhookEndpointController'
export { registerAlertRoutes } from './Presentation/Routes/alert.routes'
