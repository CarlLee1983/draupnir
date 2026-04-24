import { describe, expect, test } from 'bun:test'
import { ApiKey } from '../Domain/Aggregates/ApiKey'
import { toDatabaseRow } from '../Infrastructure/Mappers/ApiKeyMapper'

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

describe('toDatabaseRow (ApiKey)', () => {
  test('未指派時 assigned_member_id 為 null', () => {
    const row = toDatabaseRow(makeKey())
    expect(row.assigned_member_id).toBe(null)
  })

  test('指派後寫入 assigned_member_id', () => {
    const row = toDatabaseRow(makeKey().assignTo('user-42'))
    expect(row.assigned_member_id).toBe('user-42')
  })

  test('quota_allocated 預設為 0 並可被調整', () => {
    expect(toDatabaseRow(makeKey()).quota_allocated).toBe(0)
    const adjusted = makeKey().adjustQuotaAllocated(100)
    expect(toDatabaseRow(adjusted).quota_allocated).toBe(100)
  })

  test('未傳入 gatewayKeyValue 時 bifrost_key_value 為 null', () => {
    const row = toDatabaseRow(makeKey())
    expect(row.bifrost_key_value).toBe(null)
  })

  test('傳入 gatewayKeyValue 時寫入 bifrost_key_value', () => {
    const key = ApiKey.create({
      id: 'k-2',
      orgId: 'org-1',
      createdByUserId: 'mgr-1',
      label: 'test',
      gatewayKeyId: 'gw-uuid-123',
      gatewayKeyValue: 'sk-bf-04b9f808-6d4f-44dc-a247-1d73ecf4cbcb',
      keyHash: 'h'.repeat(64),
    })
    const row = toDatabaseRow(key)
    expect(row.bifrost_key_value).toBe('sk-bf-04b9f808-6d4f-44dc-a247-1d73ecf4cbcb')
    expect(row.bifrost_virtual_key_id).toBe('gw-uuid-123')
  })
})
