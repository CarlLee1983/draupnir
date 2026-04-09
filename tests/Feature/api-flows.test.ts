import { describe, it, beforeAll, beforeEach } from 'bun:test'
import { resolve } from 'path'
import { parseOpenAPI } from './lib/spec-parser'
import { TestClient } from './lib/test-client'
import { setupTestServer, getBaseURL } from './lib/test-server'
import { ensureAuth, resetAuth } from './lib/auth-helper'
import { extractValue, resolveRefs, resolveRef } from './lib/jsonpath'
import { assertBody } from './lib/flow-assertions'

const SPEC_PATH = resolve(import.meta.dir, '../../docs/openapi.yaml')

setupTestServer()

const spec = parseOpenAPI(SPEC_PATH)
let client: TestClient

beforeAll(() => {
	client = new TestClient(getBaseURL())
})

beforeEach(() => {
	resetAuth()
})

function parseOperationId(opId: string): { method: string; path: string } {
	const dashIndex = opId.indexOf('-')
	return {
		method: opId.slice(0, dashIndex),
		path: opId.slice(dashIndex + 1),
	}
}

for (const [flowName, flow] of Object.entries(spec.flows)) {
	describe(`流程鏈: ${flow.description}`, () => {
		it('完成所有步驟', async () => {
			const context: Record<string, unknown> = {}

			if (flow.setup === 'admin') {
				const admin = await ensureAuth(client, 'admin')
				context.adminToken = admin.token
				context.adminUserId = admin.userId
			}

			if (flowName === 'org-flow') {
				context.orgFlowName = `Test Org ${crypto.randomUUID().slice(0, 8)}`
			}
			if (flowName === 'auth-flow') {
				context.authFlowEmail = `flow-auth-${crypto.randomUUID().slice(0, 8)}@feature.test`
			}

			for (let i = 0; i < flow.steps.length; i++) {
				const step = flow.steps[i]
				const { method, path } = parseOperationId(step.operation)

				let body = step.body ? resolveRefs({ ...step.body }, context) : undefined
				if (flowName === 'org-flow' && step.operation === 'post-/api/organizations' && body) {
					body = { ...body, name: context.orgFlowName ?? body.name }
				}
				if (flowName === 'auth-flow' && body && typeof body === 'object' && 'email' in body) {
					const em = (body as { email?: string }).email
					if (em === 'flow-auth@feature.test') {
						body = { ...body, email: context.authFlowEmail as string }
					}
				}

				const auth = step.auth ? (resolveRef(step.auth, context) as string) : undefined

				const res = await client.request({ method, path }, { body, auth })

				if (step.expect?.status) {
					if (res.status !== step.expect.status) {
						throw new Error(
							`Step ${i + 1} (${step.operation}) failed:\n` +
								`  Expected status ${step.expect.status}, got ${res.status}\n` +
								`  Response: ${JSON.stringify(res.json)}`,
						)
					}
				}

				if (step.expect?.body) {
					assertBody(res.json, step.expect.body)
				}

				if (step.extract) {
					for (const [key, jsonPath] of Object.entries(step.extract)) {
						context[key] = extractValue(res.json, jsonPath)
						if (context[key] === undefined) {
							throw new Error(
								`Step ${i + 1}: Failed to extract "${key}" via "${jsonPath}" from:\n` +
									`  ${JSON.stringify(res.json)}`,
							)
						}
					}
				}
			}
		})
	})
}
