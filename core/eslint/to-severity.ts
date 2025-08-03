/**
 * Converts numeric severity level to ESLint string severity format.
 *
 * @param level - Numeric severity level (0 - off, 1 - warn, 2 - error).
 * @returns String representation of severity level.
 */
export function toSeverity(level: 0 | 1 | 2): 'error' | 'warn' | 'off' {
  switch (level) {
    case 0:
      return 'off'
    case 1:
      return 'warn'
    case 2:
      return 'error'
  }
}
