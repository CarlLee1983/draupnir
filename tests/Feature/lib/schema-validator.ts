import Ajv, { type ErrorObject } from 'ajv'
import addFormats from 'ajv-formats'

export interface ValidationResult {
  valid: boolean
  errors: ErrorObject[]
}

const ajv = new Ajv({ allErrors: true })
addFormats(ajv)

/**
 * Validate data against a JSON Schema.
 * Resolves $ref from componentSchemas if needed.
 */
export function validateSchema(
  data: unknown,
  schema: Record<string, unknown>,
  componentSchemas: Record<string, Record<string, unknown>>,
): ValidationResult {
  const resolved = resolveIfRef(schema, componentSchemas)

  for (const [name, s] of Object.entries(componentSchemas)) {
    const schemaId = `#/components/schemas/${name}`
    if (!ajv.getSchema(schemaId)) {
      ajv.addSchema(s, schemaId)
    }
  }

  const validate = ajv.compile(resolved)
  const valid = validate(data)

  return {
    valid: !!valid,
    errors: validate.errors ?? [],
  }
}

function resolveIfRef(
  schema: Record<string, unknown>,
  componentSchemas: Record<string, Record<string, unknown>>,
): Record<string, unknown> {
  if (schema.$ref && typeof schema.$ref === 'string') {
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by control flow or DOM contract
    const name = (schema.$ref as string).split('/').pop()!
    return componentSchemas[name] ?? schema
  }
  return schema
}
