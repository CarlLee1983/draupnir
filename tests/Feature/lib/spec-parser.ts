import { readFileSync } from 'fs'
import { parse as parseYAML } from 'yaml'

export interface Operation {
	method: string
	path: string
	tags: string[]
	summary: string
	requiresAuth: boolean
	requestSchema: Record<string, unknown> | null
	responseSchema: Record<string, unknown> | null
	requiredFields: string[]
	successStatus: number
	testRole: string | null
	testSetup: TestSetupStep[] | null
}

export interface TestSetupStep {
	operation: string
	body: Record<string, unknown>
	extract?: Record<string, string>
}

export interface FlowStep {
	operation: string
	body?: Record<string, unknown>
	auth?: string
	expect?: {
		status?: number
		body?: Record<string, unknown>
	}
	extract?: Record<string, string>
}

export interface TestFlow {
	description: string
	setup?: string
	steps: FlowStep[]
}

export interface ParsedSpec {
	operations: Operation[]
	flows: Record<string, TestFlow>
	componentSchemas: Record<string, Record<string, unknown>>
}

export function parseOpenAPI(specPath: string): ParsedSpec {
	const raw = readFileSync(specPath, 'utf-8')
	const doc = parseYAML(raw) as Record<string, unknown>

	const componentSchemas: Record<string, Record<string, unknown>> =
		(doc.components as { schemas?: Record<string, Record<string, unknown>> })?.schemas ?? {}

	const operations: Operation[] = []

	for (const [path, methods] of Object.entries((doc.paths as Record<string, unknown>) ?? {})) {
		const methodMap = methods as Record<string, unknown>
		for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
			const op = methodMap[method] as Record<string, unknown> | undefined
			if (!op) continue

			const requiresAuth = Array.isArray(op.security) && (op.security as unknown[]).length > 0

			let requestSchema: Record<string, unknown> | null = null
			let requiredFields: string[] = []
			const reqBody = (op.requestBody as Record<string, unknown> | undefined)?.content as
				| Record<string, { schema?: Record<string, unknown> }>
				| undefined
			const reqJson = reqBody?.['application/json']?.schema
			if (reqJson) {
				requestSchema = resolveSchema(reqJson, componentSchemas)
				requiredFields = (requestSchema?.required as string[]) ?? []
			}

			let responseSchema: Record<string, unknown> | null = null
			let successStatus = 200
			for (const [code, resp] of Object.entries((op.responses as Record<string, unknown>) ?? {})) {
				const statusCode = Number(code)
				if (statusCode >= 200 && statusCode < 300) {
					successStatus = statusCode
					const respObj = resp as Record<string, unknown>
					const respContent = respObj?.content as
						| Record<string, { schema?: Record<string, unknown> }>
						| undefined
					const respSchema = respContent?.['application/json']?.schema
					if (respSchema) {
						responseSchema = resolveSchema(respSchema, componentSchemas)
					}
					break
				}
			}

			operations.push({
				method,
				path,
				tags: (op.tags as string[]) ?? [],
				summary: (op.summary as string) ?? '',
				requiresAuth,
				requestSchema,
				responseSchema,
				requiredFields,
				successStatus,
				testRole: (op['x-test-role'] as string) ?? null,
				testSetup: (op['x-test-setup'] as TestSetupStep[]) ?? null,
			})
		}
	}

	const flows = (doc['x-test-flows'] as Record<string, TestFlow>) ?? {}

	return { operations, flows, componentSchemas }
}

function resolveSchema(
	schema: Record<string, unknown>,
	componentSchemas: Record<string, Record<string, unknown>>,
): Record<string, unknown> {
	if (schema.$ref && typeof schema.$ref === 'string') {
		const name = schema.$ref.split('/').pop()!
		return componentSchemas[name] ?? schema
	}
	return schema
}
