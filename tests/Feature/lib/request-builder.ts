interface PropertySchema {
	type?: string
	format?: string
	minLength?: number
	enum?: string[]
	properties?: Record<string, PropertySchema>
	required?: string[]
}

interface BuildOptions {
	onlyRequired?: boolean
}

/**
 * Generate a valid request body from an OpenAPI schema definition.
 * Each invocation generates unique values (UUIDs, emails) to avoid collisions.
 */
export function buildValidRequest(
	schema: Record<string, unknown> | null,
	options?: BuildOptions,
): Record<string, unknown> {
	if (!schema) return {}
	const props = schema.properties as Record<string, PropertySchema> | undefined
	if (!props) return {}

	const requiredFields = (schema.required as string[]) ?? []
	const result: Record<string, unknown> = {}

	for (const [name, prop] of Object.entries(props)) {
		if (options?.onlyRequired && !requiredFields.includes(name)) continue
		result[name] = generateValue(name, prop)
	}

	return result
}

function generateValue(fieldName: string, prop: PropertySchema): unknown {
	if (prop.type === 'object' && prop.properties) {
		return buildValidRequest(prop as Record<string, unknown>)
	}

	if (prop.type === 'boolean') return true
	if (prop.type === 'integer' || prop.type === 'number') return 1
	if (prop.type === 'array') {
		const items = (prop as any).items as PropertySchema | undefined
		if (items) return [generateValue('item', items)]
		return ['default']
	}

	if (prop.type === 'string') {
		if (prop.enum?.length) {
			return prop.enum[0]
		}
		// 與 RegisterUserSchema（大小寫+數字）一致
		if (fieldName === 'password') {
			return 'SecurePass123'
		}
		if (prop.format === 'email') {
			return `test-${crypto.randomUUID().slice(0, 8)}@feature.test`
		}
		if (prop.format === 'uuid') {
			return crypto.randomUUID()
		}
		if (prop.format === 'date-time' || prop.format === 'date') {
			return '2026-06-15T00:00:00.000Z'
		}
		if (prop.minLength) {
			return 'A'.repeat(prop.minLength + 4)
		}
		return `test-${fieldName}-${crypto.randomUUID().slice(0, 8)}`
	}

	if (prop.enum?.length) {
		return prop.enum[0]
	}

	return `test-${fieldName}-${crypto.randomUUID().slice(0, 8)}`
}
