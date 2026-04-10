/**
 * Extract a value from an object using a simple $.dot.path notation.
 * Only supports dot-separated keys — no array indexing or wildcards.
 */
export function extractValue(obj: unknown, path: string): unknown {
  const keys = path.replace(/^\$\./, '').split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

/**
 * Resolve a single string value — if it starts with $. resolve from context,
 * otherwise return the literal string.
 */
export function resolveRef(value: string, context: Record<string, unknown>): unknown {
  if (value.startsWith('$.')) {
    const key = value.slice(2)
    return context[key]
  }
  return value
}

/**
 * Deep-resolve all $. references in an object's string values.
 * Returns a new object — does not mutate the original.
 */
export function resolveRefs(
  obj: Record<string, unknown> | undefined,
  context: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (obj == null) return undefined
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.startsWith('$.')) {
      result[key] = resolveRef(value, context)
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = resolveRefs(value as Record<string, unknown>, context)!
    } else {
      result[key] = value
    }
  }
  return result
}
