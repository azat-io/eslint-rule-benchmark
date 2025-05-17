/**
 * Number of warmup iterations before actual benchmarking. Lower values speed up
 * total benchmark time, but may lead to less stable results.
 */
export const DEFAULT_WARMUP_ITERATIONS = 10 as const

/**
 * Target time in milliseconds for each warmup phase. This controls how long the
 * warmup phase will try to run.
 */
export const DEFAULT_WARMUP_TIME_MS = 1 as const

/**
 * Whether warmup phase is enabled by default. Warmup helps stabilize JIT
 * compilation before actual measurements.
 */
export const DEFAULT_WARMUP_ENABLED = true as const

/**
 * Target time in milliseconds for benchmarking. This is NOT a timeout limit,
 * but rather how long Tinybench will try to run iterations to gather
 * statistically significant results. Lower values result in fewer iterations
 * and faster overall completion.
 */
export const DEFAULT_TIMEOUT_MS = 300 as const

/**
 * Minimum number of benchmark iterations to perform. Actual number may be
 * higher if iterations complete quickly.
 */
export const DEFAULT_ITERATIONS = 50 as const

/**
 * Default severity level for benchmark results. This is used to determine the
 * severity of the benchmark results in the output report.
 */
export const DEFAULT_SEVERITY = 2 as const

/**
 * Default output format for benchmark results. Options include: 'console',
 * 'json', 'markdown', 'html'
 */
export const DEFAULT_REPORTER_FORMAT = 'console' as const

/**
 * Extensions that are supported by the benchmark runner. This is used to
 * determine which files can be run as benchmarks.
 */
export const SUPPORTED_EXTENSIONS = [
  'js',
  'mjs',
  'cjs',
  'jsx',
  'ts',
  'mts',
  'cts',
  'tsx',
  'astro',
  'svelte',
  'vue',
] as const

/**
 * Supported languages for the benchmark. This is used to determine which
 * language a file belongs to based on its extension.
 */
export const LANGUAGES = [
  'typescript-react',
  'javascript-react',
  'javascript',
  'typescript',
  'svelte',
  'astro',
  'vue',
] as const
