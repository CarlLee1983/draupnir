import { describe, expect, test } from 'bun:test'
import { ApiKey } from '../Domain/Aggregates/ApiKey'
import { ApiKeyMapper } from '../Infrastructure/Mappers/ApiKeyMapper'

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

describe('ApiKeyMapper.toDatabaseRow', () => {
  test('未指派時 assigned_member_id 為 null', () => {
    const row = ApiKeyMapper.toDatabaseRow(makeKey())
    expect(row.assigned_member_id).toBe(null)
  })

  test('指派後寫入 assigned_member_id', () => {
    const row = ApiKeyMapper.toDatabaseRow(makeKey().assignTo('user-42'))
    expect(row.assigned_member_id).toBe('user-42')
  })

  test('quota_allocated 預設為 0 並可被調整', () => {
    expect(ApiKeyMapper.toDatabaseRow(makeKey()).quota_allocated).toBe(0)
    const adjusted = makeKey().adjustQuotaAllocated(100)
    expect(ApiKeyMapper.toDatabaseRow(adjusted).quota_allocated).toBe(100)
  })
})
