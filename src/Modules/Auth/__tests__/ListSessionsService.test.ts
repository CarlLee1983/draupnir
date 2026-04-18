import { describe, expect, mock, test } from 'bun:test'
import { ListSessionsService } from '../Application/Services/ListSessionsService'
import type { IAuthTokenRepository, TokenRecord } from '../Domain/Repositories/IAuthTokenRepository'

function token(partial: Partial<TokenRecord> & Pick<TokenRecord, 'id' | 'tokenHash'>): TokenRecord {
  return {
    userId: 'u1',
    type: 'access',
    expiresAt: new Date('2030-01-01'),
    createdAt: new Date('2026-01-01'),
    ...partial,
  }
}

describe('ListSessionsService', () => {
  test('returns access rows only with isCurrent when hash matches', async () => {
    const rows: TokenRecord[] = [
      token({ id: 'a1', tokenHash: 'hash1' }),
      token({ id: 'r1', tokenHash: 'rh', type: 'refresh' }),
    ]
    const repo: IAuthTokenRepository = {
      findByUserId: mock(() => Promise.resolve(rows)),
    } as unknown as IAuthTokenRepository

    const svc = new ListSessionsService(repo)
    const result = await svc.execute('u1', 'hash1')

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.sessions).toHaveLength(1)
    expect(result.sessions[0]!.id).toBe('a1')
    expect(result.sessions[0]!.isCurrent).toBe(true)
  })

  test('marks isCurrent false when no current hash', async () => {
    const rows: TokenRecord[] = [token({ id: 'a1', tokenHash: 'hash1' })]
    const repo: IAuthTokenRepository = {
      findByUserId: mock(() => Promise.resolve(rows)),
    } as unknown as IAuthTokenRepository

    const svc = new ListSessionsService(repo)
    const result = await svc.execute('u1')

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.sessions[0]!.isCurrent).toBe(false)
  })
})
