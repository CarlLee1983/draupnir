import { describe, expect, test } from 'bun:test'
import { ApiKey } from '../Domain/Aggregates/ApiKey'

function makeKey(): ApiKey {
  return ApiKey.create({
    id: 'k-1',
    orgId: 'org-1',
    createdByUserId: 'mgr-1',
    label: 'test',
    gatewayKeyId: 'gw-1',
    keyHash: 'h'.repeat(64),
  })
}

describe('ApiKey assignment', () => {
  test('new key 沒有指派', () => {
    expect(makeKey().assignedMemberId).toBe(null)
  })

  test('assignTo 設定指派對象', () => {
    const k = makeKey().assignTo('user-42')
    expect(k.assignedMemberId).toBe('user-42')
  })

  test('assignTo 空字串拒絕', () => {
    expect(() => makeKey().assignTo('')).toThrow()
  })

  test('unassign 清除指派', () => {
    const k = makeKey().assignTo('user-42').unassign()
    expect(k.assignedMemberId).toBe(null)
  })

  test('revoked key 禁止 assignTo', () => {
    const k = makeKey().activate().revoke()
    expect(() => k.assignTo('user-42')).toThrow()
  })

  test('fromDatabase 讀入 assigned_member_id', () => {
    const row = {
      id: 'k-1', org_id: 'org-1', created_by_user_id: 'mgr-1',
      label: 'x', key_hash: 'h', bifrost_virtual_key_id: 'gw',
      status: 'active', scope: JSON.stringify({ allowedModels: [], rateLimit: { rpm: null, tpm: null } }),
      quota_allocated: 0, suspension_reason: null, pre_freeze_rate_limit: null,
      suspended_at: null, expires_at: null, revoked_at: null,
      created_at: '2026-04-16T00:00:00Z', updated_at: '2026-04-16T00:00:00Z',
      assigned_member_id: 'user-99',
    }
    const k = ApiKey.fromDatabase(row)
    expect(k.assignedMemberId).toBe('user-99')
  })
})
