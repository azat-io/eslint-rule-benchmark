# ESLint Rule Benchmark

<img
  src="https://raw.githubusercontent.com/azat-io/eslint-rule-benchmark/main/assets/logo.svg"
  alt="ESLint Rule Benchmark logo"
  width="160"
  height="160"
  align="right"
/>

[![Version](https://img.shields.io/npm/v/eslint-rule-benchmark.svg?color=ffa500&labelColor=324cc2)](https://npmjs.com/package/eslint-rule-benchmark)
[![Code Coverage](https://img.shields.io/codecov/c/github/azat-io/eslint-rule-benchmark.svg?color=ffa500&labelColor=324cc2)](https://npmjs.com/package/eslint-rule-benchmark)
[![GitHub License](https://img.shields.io/badge/license-MIT-232428.svg?color=ffa500&labelColor=324cc2)](https://github.com/azat-io/eslint-rule-benchmark/blob/main/license.md)

ESLint Rule Benchmark is a tool that times individual ESLint rules, capturing ops /sec, mean and median runtimes, and rich latency percentiles to surface performance hotspots.

Allows to catch regressions and quantify optimization gains.

## Features

- **Precise timing measurements** for individual ESLint rules
- **Testing against real projects** and code files
- **Native TypeScript support** for rules written in .ts files
- **Automatic regression detection** with customizable thresholds
- **Detailed statistics** with various metrics (mean time, median, percentiles)
- **Multiple report formats** (console, JSON, Markdown)
- **CI/CD integration** for continuous performance monitoring

## Installation

```bash
npm install --save-dev eslint-rule-benchmark
```

## Usage

ESLint Rule Benchmark provides two main commands:

### 1. `run` - Benchmarking with a Configuration File

This command is used to run a suite of benchmarks defined in a configuration file. It allows for defining multiple test scenarios, global benchmark settings, and per-test overrides.

**Syntax:**

```sh
eslint-rule-benchmark run [options]
```

**Options:**

- `--config <path>`: Path to your benchmark configuration file (e.g., `benchmark.config.js`, `benchmark.config.ts`). If not provided, the tool will search for default configuration files (e.g., `benchmark/config.js`, `benchmark/config.ts`, etc. in the current directory).
- `--report <format>`: Specify the output report format. Available formats: `console` (default), `json`, `markdown`.
- `--output <file>`: Specify a file path to save the report (applicable for `json` and `markdown` formats).

**Example:**

```sh
# Run benchmarks using a configuration file
eslint-rule-benchmark run --config ./my-benchmarks.config.js

# Run and generate a JSON report
eslint-rule-benchmark run --config ./my-benchmarks.config.js --report json --output benchmark-results.json
```

### 2. `run-single` - Benchmarking a Single Rule via CLI

This command allows for quick benchmarking of a single ESLint rule without needing a separate configuration file. All parameters are passed via CLI options.

**Syntax:**

```sh
eslint-rule-benchmark run-single --rule <rulePath> --name <ruleName> --source <sourcePath> [options]
```

**Required Options:**

- `--rule <rulePath>`: Path to the JavaScript/TypeScript file implementing the ESLint rule.
- `--name <ruleName>`: The identifier (name) of the ESLint rule (e.g., `my-plugin/my-rule`). This is used as the `ruleId`.
- `--source <sourcePath>`: Path to the directory or a single file containing code samples to test the rule against.

**Optional Options:**

- `--iterations <number>`: Number of benchmark iterations (default: 50).
- `--warmup <number>`: Number of warmup iterations (default: 10).
- `--max-duration <number>`: Target time in milliseconds for benchmarking each sample (default: 300ms).
- `--report <format>`: Report format (`console`, `json`, `markdown`). Default: `console`.
- `--output <file>`: Output file for the report.
- `--config <eslintConfigPath>`: Optional path to an ESLint configuration file to use during linting.

**Example:**

```sh
eslint-rule-benchmark run-single --rule ./rules/sort-imports.ts --name my-plugin/sort-imports --source ./test-code/ --report console
```

## Configuration File

For more complex scenarios or when benchmarking multiple rules, you can use a configuration file. By default, `eslint-rule-benchmark run` will look for files like `benchmark.config.js`, `benchmark.config.ts`, or files in a `./benchmark/` directory.

The configuration file should export a configuration object, preferably using the `defineConfig` helper for type safety and autocompletion.

**Example `benchmark.config.ts`:**

```typescript
import { defineConfig } from 'eslint-rule-benchmark'

export default defineConfig({
  /* Optional: Default iterations for all tests */
  iterations: 100,

  /* Optional: Default warmup configuration */
  warmup: {
    /* Optional: Number of warmup iterations */
    iterations: 20,

    /* Optional: Whether to enable warmup */
    enabled: true,
  },
  /* Optional: Default timeout for each test */
  timeout: 500,

  /* Array of benchmark test specifications */
  tests: [
    {
      /* Required: Descriptive name for this test group/specification */
      name: 'My Custom Rule: no-vars',

      /* Required: ESLint rule identifier (e.g., plugin-name/rule-name) */
      ruleId: 'my-plugin/no-vars',

      /* Required: Path to the rule's implementation */
      rulePath: './lib/rules/no-vars.js',

      /* Optional: Override global benchmark settings for this specific test group */
      iterations: 50,

      /* Optional: Override global warmup settings for this specific test group */
      timeout: 300,

      /* Optional: Override global warmup settings for this specific test group */
      warmup: {
        /* Optional: Number of warmup iterations */
        iterations: 10,
      },

      /* Required: Array of test cases for this rule */
      cases: [
        {
          /* Required: Path(s) to files or directories for this specific case */
          testPath: './test/fixtures/no-vars/valid.js',

          /* Optional: ESLint rule options specific to this case */
          options: [{ allowLet: true }],

          /* Optional: ESLint rule severity for this case (0, 1, 2) - defaults to 2 */
          severity: 2,
        },
        {
          /* Optional: Descriptive name for this specific test case */
          testPath: './test/fixtures/no-vars/invalid.js',

          /* Optional: ESLint rule options specific to this case */
          options: [{ allowLet: false }],
        },
      ],
    },
    {
      name: 'Another Rule: prefer-const',
      ruleId: 'prefer-const',
      cases: [
        {
          testPath: [
            './test/fixtures/general/file1.js',
            './test/fixtures/general/file2.ts',
          ],
        },
        {
          name: 'Prefer Const with specific options',
          testPath: './test/fixtures/general/file3.js',
          options: [{ destructuring: 'all' }],
        },
      ],
    },
    /* ... more test specifications */
  ],
})
```

**Configuration Fields:**

- **Global Settings (optional, at the root of the config object):**
  - `iterations: number`: Default number of measurement iterations for each code sample.
  - `warmup: object`: Default warmup configuration.
    - `iterations: number`: Number of warmup iterations.
    - `enabled: boolean`: Whether warmup is enabled (defaults to `true`).
  - `timeout: number`: Default target time in milliseconds for tinybench to run each sample's benchmark.
- **`tests: array` (required):** An array of test specification objects. Each object defines a rule to be benchmarked and can contain multiple test cases.
  - `name: string` (required): A descriptive name for this test specification (e.g., "Rule: no-console Performance"). Used in reports.
  - `ruleId: string` (required): The ESLint rule identifier (e.g., `plugin-name/rule-name` or `core-rule-name`).
  - `rulePath: string` (required for local/custom rules): The file path to the rule's implementation.
  - `iterations?: number`: Optional. Overrides global `iterations` for all cases in this test specification.
  - `warmup?: object`: Optional. Overrides global `warmup` settings for all cases in this test specification.
    - `iterations?: number`
    - `enabled?: boolean`
  - `timeout?: number`: Optional. Overrides global `timeout` for all cases in this test specification.
  - **`cases: array` (required):** An array of test case objects for this rule. Each case defines a specific scenario.
    - `name?: string`: Optional. A descriptive name for this specific test case. If not provided, one might be generated.
    - `testPath: string | string[]` (required): Path(s) to files or directories containing code samples for this case.
    - `options?: unknown[]`: Optional. An array of options for the ESLint rule for this specific case, same as in an ESLint config file.
    - `severity?: 0 | 1 | 2`: Optional. The severity for the rule for this specific case (0=off, 1=warn, 2=error). Defaults to 2 (error) if not specified.

## Metrics and Output

ESLint Rule Benchmark provides the following performance metrics:

| Metric                | Description                                          |
| --------------------- | ---------------------------------------------------- |
| Operations per second | Number of operations per second                      |
| Average time          | Average execution time of the rule (e.g., in ms)     |
| Median time (P50)     | Median execution time (50th percentile)              |
| Minimum time          | Minimum execution time                               |
| Maximum time          | Maximum execution time                               |
| P75 Percentile        | 75th percentile (time for 75% of fastest executions) |
| P99 Percentile        | 99th percentile (time for 99% of fastest executions) |
| Standard deviation    | Standard deviation (measure of time variability)     |
| Total samples         | Number of measurements taken during the benchmark    |

Metrics are available in Console, JSON, and Markdown formats, allowing integration with various systems and workflows.

## How It Works

The tool uses [Tinybench](https://github.com/tinylibs/tinybench) for accurate and reliable benchmarking:

- Warmup phase to minimize JIT compilation impact
- Multiple iterations for statistical significance
- Isolation of the tested rule from other rules
- Outlier filtering (Tukey's fences method) for more stable and representative results, especially for maximum execution times.

### Example Output

```
-------------------------------------------------------------------------------------------------
                                  Rule: no-negated-conjunction
-------------------------------------------------------------------------------------------------
Sample          | Ops/sec        | Avg Time | Median   | Min      | Max      | StdDev   | Samples
base-case.ts    | 18,013 ops/sec | 0.056 ms | 0.055 ms | 0.053 ms | 0.063 ms | 0.002 ms | 36,829
complex-case.ts | 17,244 ops/sec | 0.058 ms | 0.058 ms | 0.053 ms | 0.065 ms | 0.002 ms | 25,664
-------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------
                                  Rule: no-negated-disjunction
-------------------------------------------------------------------------------------------------
Sample          | Ops/sec        | Avg Time | Median   | Min      | Max      | StdDev   | Samples
base-case.ts    | 17,506 ops/sec | 0.057 ms | 0.057 ms | 0.053 ms | 0.067 ms | 0.003 ms | 27,567
-------------------------------------------------------------------------------------------------
```

## Versioning Policy

This plugin is following [Semantic Versioning](https://semver.org/).

## Contributing

See [Contributing Guide](https://github.com/azat-io/eslint-rule-benchmark/blob/main/contributing.md).

## License

MIT &copy; [Azat S.](https://azat.io)
