import { describe, it, expect } from 'bun:test'
import { TestClient } from '../test-client'

describe('TestClient', () => {
	it('constructs with a base URL', () => {
		const client = new TestClient('http://localhost:3001')
		expect(client).toBeDefined()
	})

	it('builds correct URL from operation', () => {
		const client = new TestClient('http://localhost:3001')
		expect(client.getBaseURL()).toBe('http://localhost:3001')
	})

	it('formatError produces readable debug output', () => {
		const client = new TestClient('http://localhost:3001')
		const output = client.formatError({
			method: 'POST',
			path: '/api/auth/register',
			requestBody: { email: 'test@test.com' },
			status: 400,
			expectedStatus: 201,
			responseBody: { success: false, error: 'EMAIL_ALREADY_EXISTS' },
		})
		expect(output).toContain('POST')
		expect(output).toContain('/api/auth/register')
		expect(output).toContain('400')
		expect(output).toContain('201')
	})
})
