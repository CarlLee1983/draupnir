import { describe, it, expect, beforeEach } from 'vitest'
import { QueryBalance } from '../Application/UseCases/QueryBalance'
import type { ICreditAccountRepository } from '@/Modules/Credit/Domain/Repositories/ICreditAccountRepository'
import type { AppAuthContext } from '../Application/DTOs/SdkApiDTO'
import { CreditAccount } from '@/Modules/Credit/Domain/Aggregates/CreditAccount'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

class MockCreditAccountRepo implements ICreditAccountRepository {
	private accounts = new Map<string, CreditAccount>()

	setAccount(orgId: string, balance: string, status: 'active' | 'frozen' = 'active') {
		this.accounts.set(
			orgId,
			CreditAccount.fromDatabase({
				id: `acc-${orgId}`,
				org_id: orgId,
				balance,
				low_balance_threshold: '100',
				status,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			}),
		)
	}

	async findByOrgId(orgId: string) {
		return this.accounts.get(orgId) ?? null
	}

	async findById() {
		return null
	}
	async save() {}
	async update() {}
	withTransaction(_tx: IDatabaseAccess): ICreditAccountRepository {
		return this
	}
}

describe('QueryBalance', () => {
	let useCase: QueryBalance
	let mockRepo: MockCreditAccountRepo
	const authContext: AppAuthContext = {
		appKeyId: 'appkey-1',
		orgId: 'org-1',
		bifrostVirtualKeyId: 'bfr-vk-1',
		scope: 'read',
		boundModuleIds: [],
	}

	beforeEach(() => {
		mockRepo = new MockCreditAccountRepo()
		useCase = new QueryBalance(mockRepo)
	})

	it('應成功查詢組織餘額', async () => {
		mockRepo.setAccount('org-1', '5000.50')

		const result = await useCase.execute(authContext)

		expect(result.success).toBe(true)
		expect(result.data).toEqual({
			balance: '5000.5',
			lowBalanceThreshold: '100',
			status: 'active',
		})
	})

	it('無帳戶時應回傳零餘額', async () => {
		const result = await useCase.execute(authContext)

		expect(result.success).toBe(true)
		expect(result.data!.balance).toBe('0')
	})

	it('scope 為 read 應允許查詢餘額', async () => {
		mockRepo.setAccount('org-1', '100')
		const readAuth: AppAuthContext = { ...authContext, scope: 'read' }

		const result = await useCase.execute(readAuth)

		expect(result.success).toBe(true)
	})
})
