/**
 * Dashboard module public surface.
 *
 * Provides services for aggregating and visualizing usage data, cost trends,
 * and key performance indicators (KPIs) for organizations.
 */

export { GetCostTrendsService } from './Application/Services/GetCostTrendsService'
export { GetDashboardSummaryService } from './Application/Services/GetDashboardSummaryService'
export { GetKpiSummaryService } from './Application/Services/GetKpiSummaryService'
export { GetModelComparisonService } from './Application/Services/GetModelComparisonService'
export { GetUsageChartService } from './Application/Services/GetUsageChartService'
export { DashboardServiceProvider } from './Infrastructure/Providers/DashboardServiceProvider'
export { UsageAggregator } from './Infrastructure/Services/UsageAggregator'
export { DashboardController } from './Presentation/Controllers/DashboardController'
export { registerDashboardRoutes } from './Presentation/Routes/dashboard.routes'
