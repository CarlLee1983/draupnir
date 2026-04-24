/**
 * Reports module public surface.
 *
 * Manages automated report scheduling, generation of PDF assets, 
 * and delivery of historical usage summaries to stakeholders.
 */

// Application Services
export { ScheduleReportService } from './Application/Services/ScheduleReportService'
export { GeneratePdfService } from './Application/Services/GeneratePdfService'

// Domain
export { ReportSchedule } from './Domain/Aggregates/ReportSchedule'
export type { IReportRepository } from './Domain/Repositories/IReportRepository'

// Infrastructure
export { ReportsServiceProvider } from './Infrastructure/Providers/ReportsServiceProvider'

// Presentation
export { ReportController } from './Presentation/Controllers/ReportController'
export { registerReportRoutes } from './Presentation/Routes/report.routes'
