import { describe, it, expect, beforeAll, beforeEach } from 'bun:test'
import { resolve } from 'path'
import { parseOpenAPI, type Operation } from './lib/spec-parser'
import { buildValidRequest } from './lib/request-builder'
import { validateSchema } from './lib/schema-validator'
import { TestClient } from './lib/test-client'
import { setupTestServer, getBaseURL } from './lib/test-server'
import { ensureAuth, resetAuth } from './lib/auth-helper'
import { resolveRefs, extractValue } from './lib/jsonpath'

const SPEC_PATH = resolve(import.meta.dir, '../../docs/openapi.yaml')

setupTestServer()

const spec = parseOpenAPI(SPEC_PATH)
let client: TestClient

beforeAll(() => {
	client = new TestClient(getBaseURL())
})

// Logout 等端點會撤銷 token；快取若不清空，後續需認證的測試仍舊 token 會 401
beforeEach(() => {
	resetAuth()
})

async function getAuthForOperation(op: Operation): Promise<string | null> {
	if (!op.requiresAuth) return null
	const role = op.testRole === 'admin' || op.path.startsWith('/api/organizations/{') ? 'admin' : 'user'
	const identity = await ensureAuth(client, role)
	return identity.token
}

function parseOperationId(opId: string): { method: string; path: string } {
	const dashIndex = opId.indexOf('-')
	return {
		method: opId.slice(0, dashIndex),
		path: opId.slice(dashIndex + 1),
	}
}

function substitutePath(path: string, context: Record<string, unknown>): string {
	const out = path.replace(/\{(\w+)\}/g, (_, key: string) => {
		const v = context[key]
		if (v === undefined || v === null) return `{${key}}`
		return encodeURIComponent(String(v))
	})
	if (out.includes('{')) {
		throw new Error(`Unresolved path template: ${path} ctx=${JSON.stringify(context)}`)
	}
	return out
}

async function runSetup(op: Operation): Promise<Record<string, unknown>> {
	const context: Record<string, unknown> = {}

	const userIdentity = await ensureAuth(client, 'user')
	const adminIdentity = await ensureAuth(client, 'admin')
	context.authUserId = userIdentity.userId
	context.authToken = userIdentity.token
	context.adminUserId = adminIdentity.userId
	context.adminToken = adminIdentity.token

	if (!op.testSetup) return context

	const auth = context.adminToken as string

	for (const step of op.testSetup) {
		const { method, path: rawPath } = parseOperationId(step.operation)
		const path = substitutePath(rawPath, context)
		let body = resolveRefs({ ...step.body }, context) as Record<string, unknown>

		if (step.operation === 'post-/api/auth/register') {
			body = {
				...body,
				email: `setup-${crypto.randomUUID().slice(0, 8)}@feature.test`,
				password: (body.password as string) || 'SecurePass123',
			}
		}
		if (step.operation === 'post-/api/organizations') {
			body = {
				...body,
				name: `Setup Org ${crypto.randomUUID().slice(0, 8)}`,
			}
		}

		const res = await client.request(
			{ method, path },
			{
				body: Object.keys(body).length > 0 ? body : undefined,
				auth,
			},
		)

		if (step.extract) {
			for (const [key, jp] of Object.entries(step.extract)) {
				const v = extractValue(res.json, jp)
				if (v === undefined) {
					throw new Error(`Setup extract "${key}" via "${jp}" failed: ${JSON.stringify(res.json)}`)
				}
				context[key] = v
			}
		}
	}

	return context
}

async function resolvePathWithCtx(op: Operation): Promise<{
	path: string
	setupCtx: Record<string, unknown>
}> {
	const setupCtx = await runSetup(op)
	let path = substitutePath(op.path, setupCtx)

	// 如果有必填查詢參數，自動加入 dummy 值
	const queryParams = new URLSearchParams()
	if (op.path === '/api/contracts' && op.method === 'get') {
		queryParams.append('targetId', (setupCtx.id as string) ?? (setupCtx.adminUserId as string))
	}
	if (op.path === '/api/dev-portal/apps' && op.method === 'get') {
		const org = (setupCtx.orgId as string) ?? (setupCtx.id as string)
		if (org) queryParams.append('orgId', org)
	}

	const qs = queryParams.toString()
	if (qs) {
		path += `?${qs}`
	}

	return { path, setupCtx }
}

function buildRequestBody(op: Operation, setupCtx: Record<string, unknown>): unknown | undefined {
	let body = buildValidRequest(op.requestSchema, { onlyRequired: true }) as Record<string, unknown>
	if (op.method === 'post' && op.path === '/api/organizations') {
		body = {
			...body,
			managerUserId: setupCtx.adminUserId,
			name: (body.name as string) || `Org ${crypto.randomUUID().slice(0, 8)}`,
		}
	}
	if (op.method === 'post' && op.path === '/api/dev-portal/apps') {
		const oid = setupCtx.orgId as string | undefined
		if (oid) body = { ...body, orgId: oid }
	}
	const m = op.method.toLowerCase()
	if (m === 'get' || m === 'delete' || m === 'head') {
		return undefined
	}
	if (Object.keys(body).length > 0) return body
	if (m === 'put' || m === 'patch') return {}
	return undefined
}

function buildRequestHeaders(op: Operation, setupCtx: Record<string, unknown>): Record<string, string> | undefined {
	const orgRoute = op.path.startsWith('/api/organizations/{')
	if (!orgRoute) return undefined

	const organizationId = setupCtx.id ?? setupCtx.orgId
	if (organizationId === undefined || organizationId === null) return undefined

	return {
		'x-organization-id': String(organizationId),
	}
}

async function prepareAuthedCall(op: Operation): Promise<{
	auth: string | null
	path: string
	requestBody: unknown | undefined
	headers: Record<string, string> | undefined
}> {
	const auth = await getAuthForOperation(op)
	const { path, setupCtx } = await resolvePathWithCtx(op)
	const requestBody = buildRequestBody(op, setupCtx)
	const headers = buildRequestHeaders(op, setupCtx)
	return { auth, path, requestBody, headers }
}

function hasPathParams(path: string): boolean {
	return path.includes('{')
}

for (const op of spec.operations) {
	// SDK 路由需 Bearer drp_app_…；自動化 walker 僅提供 JWT，且配發 App Key 會呼叫 Bifrost（feature server 未模擬）
	if (op.path.startsWith('/sdk/v')) continue
	if (hasPathParams(op.path) && !op.testSetup) continue
	// 需要有效 refresh JWT，Spec Walker 單步無法產生
	if (op.method === 'post' && op.path === '/api/auth/refresh') continue
	// 需已註冊之 email，與單次隨機 body 不相容；由 api-flows 覆蓋
	if (op.method === 'post' && op.path === '/api/auth/login') continue

	describe(`${op.method.toUpperCase()} ${op.path}`, () => {
		it(`回傳 ${op.successStatus}`, async () => {
			const { auth, path, requestBody, headers } = await prepareAuthedCall(op)
			const res = await client.request({ method: op.method, path }, { body: requestBody, auth, headers })
			expect(res.status).toBe(op.successStatus)
		})

		if (op.responseSchema) {
			it('response 結構符合 OpenAPI spec', async () => {
				const { auth, path, requestBody, headers } = await prepareAuthedCall(op)
				const res = await client.request({ method: op.method, path }, { body: requestBody, auth, headers })
				const validation = validateSchema(
					res.json,
					op.responseSchema as Record<string, unknown>,
					spec.componentSchemas,
				)
				if (!validation.valid) {
					throw new Error(
						`Schema validation failed:\n${validation.errors.map((e) => `  - ${e.instancePath}: ${e.message}`).join('\n')}`,
					)
				}
			})
		}

		if (op.requiresAuth) {
			it('未帶 token 回傳 401', async () => {
				const { path, setupCtx } = await resolvePathWithCtx(op)
				const requestBody = buildRequestBody(op, setupCtx)
				const headers = buildRequestHeaders(op, setupCtx)
				const res = await client.request({ method: op.method, path }, { body: requestBody, auth: null, headers })
				expect(res.status).toBe(401)
			})
		}

		// refresh 缺少 refreshToken 時實作回 401（INVALID_REFRESH_TOKEN），非 400
		const skipRequiredBodyTest =
			op.method === 'post' && op.path === '/api/auth/refresh' && op.requiredFields.includes('refreshToken')

		if (op.requiredFields.length > 0 && !skipRequiredBodyTest) {
			it('缺少必填欄位回傳 422', async () => {
				const auth = await getAuthForOperation(op)
				const { path, setupCtx } = await resolvePathWithCtx(op)
				const headers = buildRequestHeaders(op, setupCtx)
				const res = await client.request({ method: op.method, path }, { body: {}, auth, headers })
				expect(res.status).toBe(422)
			})
		}
	})
}
