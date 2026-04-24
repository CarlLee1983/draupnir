/**
 * Credit module public surface.
 *
 * Manages organization credit balances, transaction history, and 
 * consumption-based billing triggers.
 */

// Application Services
export { DeductCreditService } from './Application/Services/DeductCreditService'
export { TopUpCreditService } from './Application/Services/TopUpCreditService'
export { GetBalanceService } from './Application/Services/GetBalanceService'

// Domain
export { CreditAccount } from './Domain/Aggregates/CreditAccount'
export { CreditTransaction } from './Domain/Entities/CreditTransaction'
export type { ICreditAccountRepository } from './Domain/Repositories/ICreditAccountRepository'
export { Balance } from './Domain/ValueObjects/Balance'

// Infrastructure
export { CreditServiceProvider } from './Infrastructure/Providers/CreditServiceProvider'

// Presentation
export { CreditController } from './Presentation/Controllers/CreditController'
export { registerCreditRoutes } from './Presentation/Routes/credit.routes'
