import { describe, it, expect } from 'bun:test'
import { extractRoutesFromSource } from '../route-extractor'

describe('extractRoutesFromSource', () => {
	it('extracts routes from all *.routes.ts files', () => {
		const routes = extractRoutesFromSource()
		expect(routes.length).toBeGreaterThan(0)
	})

	it('includes known auth routes', () => {
		const routes = extractRoutesFromSource()
		expect(routes).toContain('POST /api/auth/register')
		expect(routes).toContain('POST /api/auth/login')
		expect(routes).toContain('POST /api/auth/refresh')
		expect(routes).toContain('POST /api/auth/logout')
	})

	it('includes known org routes', () => {
		const routes = extractRoutesFromSource()
		expect(routes).toContain('POST /api/organizations')
		expect(routes).toContain('GET /api/organizations')
	})

	it('uses /api/users/me not /api/user/me', () => {
		const routes = extractRoutesFromSource()
		expect(routes).toContain('GET /api/users/me')
		expect(routes).not.toContain('GET /api/user/me')
	})

	it('excludes test-only routes (__test__)', () => {
		const routes = extractRoutesFromSource()
		const testRoutes = routes.filter((r) => r.includes('__test__'))
		expect(testRoutes).toEqual([])
	})
})
