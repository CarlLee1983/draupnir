/**
 * Assert a response body matches expected assertions.
 */
export function assertBody(json: unknown, assertions: Record<string, unknown>): void {
  for (const [path, expected] of Object.entries(assertions)) {
    const actual = getNestedValue(json, path)

    if (typeof expected === 'object' && expected !== null) {
      const assertion = expected as Record<string, unknown>
      if ('exists' in assertion) {
        if (assertion.exists && (actual === undefined || actual === null)) {
          throw new Error(`Expected ${path} to exist, got ${actual}`)
        }
      }
      if ('gt' in assertion) {
        if (typeof actual !== 'number' || actual <= (assertion.gt as number)) {
          throw new Error(`Expected ${path} > ${assertion.gt}, got ${actual}`)
        }
      }
      if ('contains' in assertion) {
        if (typeof actual !== 'string' || !actual.includes(assertion.contains as string)) {
          throw new Error(`Expected ${path} to contain "${assertion.contains}", got ${actual}`)
        }
      }
      if ('length' in assertion) {
        if (!Array.isArray(actual) || actual.length !== (assertion.length as number)) {
          throw new Error(
            `Expected ${path} length ${assertion.length}, got ${Array.isArray(actual) ? actual.length : 'not-array'}`,
          )
        }
      }
    } else if (actual !== expected) {
      throw new Error(
        `Expected ${path} = ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
      )
    }
  }
}

function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}
