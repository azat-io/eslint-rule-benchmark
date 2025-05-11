/**
 * Number of warmup iterations before actual benchmarking. Lower values speed up
 * total benchmark time, but may lead to less stable results.
 */
export const DEFAULT_WARMUP_ITERATIONS = 10

/**
 * Target time in milliseconds for each warmup phase. This controls how long the
 * warmup phase will try to run.
 */
export const DEFAULT_WARMUP_TIME_MS = 1

/**
 * Whether warmup phase is enabled by default. Warmup helps stabilize JIT
 * compilation before actual measurements.
 */
export const DEFAULT_WARMUP_ENABLED = true

/**
 * Target time in milliseconds for benchmarking. This is NOT a timeout limit,
 * but rather how long Tinybench will try to run iterations to gather
 * statistically significant results. Lower values result in fewer iterations
 * and faster overall completion.
 */
export const DEFAULT_TIMEOUT_MS = 300

/**
 * Minimum number of benchmark iterations to perform. Actual number may be
 * higher if iterations complete quickly.
 */
export const DEFAULT_ITERATIONS = 50

/**
 * Default output format for benchmark results. Options include: 'console',
 * 'json', 'markdown', 'html'
 */
export const DEFAULT_REPORTER_FORMAT = 'console'
