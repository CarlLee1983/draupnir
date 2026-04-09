import { describe, it, expect } from 'vitest'
import { KeyRotationPolicy } from '../Domain/ValueObjects/KeyRotationPolicy'

describe('KeyRotationPolicy', () => {
	it('應建立預設策略（手動輪換，24h 寬限期）', () => {
		const policy = KeyRotationPolicy.manual()
		expect(policy.isAutoRotate()).toBe(false)
		expect(policy.getGracePeriodHours()).toBe(24)
	})

	it('應建立自動輪換策略', () => {
		const policy = KeyRotationPolicy.auto(90, 48)
		expect(policy.isAutoRotate()).toBe(true)
		expect(policy.getRotationIntervalDays()).toBe(90)
		expect(policy.getGracePeriodHours()).toBe(48)
	})

	it('輪換天數不能為零或負數', () => {
		expect(() => KeyRotationPolicy.auto(0, 24)).toThrow('輪換間隔天數必須大於 0')
		expect(() => KeyRotationPolicy.auto(-1, 24)).toThrow('輪換間隔天數必須大於 0')
	})

	it('寬限期不能為負數', () => {
		expect(() => KeyRotationPolicy.auto(90, -1)).toThrow('寬限期時數不能為負數')
	})

	it('應正確序列化/反序列化 JSON', () => {
		const policy = KeyRotationPolicy.auto(90, 48)
		const json = policy.toJSON()
		expect(json).toEqual({
			auto_rotate: true,
			rotation_interval_days: 90,
			grace_period_hours: 48,
		})
		const restored = KeyRotationPolicy.fromJSON(json)
		expect(restored.isAutoRotate()).toBe(true)
		expect(restored.getRotationIntervalDays()).toBe(90)
		expect(restored.getGracePeriodHours()).toBe(48)
	})

	it('手動策略序列化不含 rotation_interval_days', () => {
		const policy = KeyRotationPolicy.manual(12)
		const json = policy.toJSON()
		expect(json).toEqual({
			auto_rotate: false,
			rotation_interval_days: null,
			grace_period_hours: 12,
		})
	})
})
