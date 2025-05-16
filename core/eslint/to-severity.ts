/**
 * Converts numeric severity level to ESLint string severity format.
 *
 * @param {0 | 1 | 2} level - Numeric severity level (0 - off, 1 - warn, 2 -
 *   error).
 * @returns {'off' | 'warn' | 'error'} String representation of severity level.
 */
export let toSeverity = (level: 0 | 1 | 2): 'error' | 'warn' | 'off' => {
  switch (level) {
    case 0:
      return 'off'
    case 1:
      return 'warn'
    case 2:
      return 'error'
  }
}
