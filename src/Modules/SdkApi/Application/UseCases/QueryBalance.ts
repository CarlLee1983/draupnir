import type { ICreditAccountRepository } from '@/Modules/Credit/Domain/Repositories/ICreditAccountRepository'
import type { AppAuthContext, BalanceQueryResponse } from '../DTOs/SdkApiDTO'

export class QueryBalance {
	constructor(private readonly creditAccountRepo: ICreditAccountRepository) {}

	async execute(auth: AppAuthContext): Promise<BalanceQueryResponse> {
		try {
			const account = await this.creditAccountRepo.findByOrgId(auth.orgId)

			if (!account) {
				return {
					success: true,
					message: '查詢成功',
					data: { balance: '0', lowBalanceThreshold: '100', status: 'active' },
				}
			}

			return {
				success: true,
				message: '查詢成功',
				data: {
					balance: account.balance,
					lowBalanceThreshold: account.lowBalanceThreshold,
					status: account.status,
				},
			}
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : '查詢餘額失敗'
			return { success: false, message, error: 'BALANCE_QUERY_ERROR' }
		}
	}
}
