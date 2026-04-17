import { describe, expect, test } from 'bun:test'
import { dashboardPathForWebRole } from '../../Auth/dashboardPathForWebRole'

describe('dashboardPathForWebRole', () => {
  test('admin', () => {
    expect(dashboardPathForWebRole('admin')).toBe('/admin/dashboard')
  })
  test('manager', () => {
    expect(dashboardPathForWebRole('manager')).toBe('/manager/dashboard')
  })
  test('member', () => {
    expect(dashboardPathForWebRole('member')).toBe('/member/api-keys')
  })
  test('unknown role defaults to member dashboard', () => {
    expect(dashboardPathForWebRole('guest')).toBe('/member/api-keys')
  })
})
