/**
 * Utilities for manipulating and normalizing URL paths.
 */

/**
 * Joins path segments with `/`, trims trailing slashes on parts, and collapses duplicate slashes.
 *
 * @param parts - Path fragments (no `..` resolution).
 * @returns Joined path string.
 */
export function joinPath(...parts: string[]): string {
  const joined = parts.map((p) => p.replace(/\/$/, '')).join('/')
  return joined.replace(/\/+/g, '/').replace(/\/\.(?=\/|$)/g, '')
}

/**
 * Resolves `.` / `..` segments to a canonical slash-separated path for prefix safety checks.
 *
 * @param path - Filesystem-style path using `/` separators.
 * @returns Normalized path string.
 */
export function normalizePath(path: string): string {
  const parts = path.split('/')
  const normalized: string[] = []
  for (const part of parts) {
    if (part === '' || part === '.') {
      continue
    }
    if (part === '..') {
      normalized.pop()
    } else {
      normalized.push(part)
    }
  }
  return normalized.join('/')
}
