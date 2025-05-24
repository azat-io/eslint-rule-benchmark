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

ESLint Rule Benchmark times individual ESLint rules, capturing ops/sec, mean and median runtimes and rich latency percentiles to surface performance hotspots.

It helps you catch regressions and quantify optimization gains.

## Why?

- **Prevent performance regressions** – catch slow rules before they reach production
- **Compare implementations** – find the fastest approach with side-by-side benchmarks
- **Expose detailed metrics** – ops/sec, mean, median, percentiles and more
- **Track performance trends** – export JSON results for historical analysis
- **Benchmark real code** – measure against actual projects, not synthetic snippets
- **Use TypeScript natively** – run `.ts` rules out of the box
- **Automate CI/CD checks** – post performance impact straight to pull requests
- **Generate multiple report formats** – output to console, JSON or Markdown

## Quick Start

1. Install package:

```bash
npm install --save-dev eslint-rule-benchmark
```

2. Create a simple benchmark config `benchmark/config.js` or `benchmark/config.ts`:

```js
import { defineConfig } from 'eslint-rule-benchmark'

export default defineConfig({
  tests: [
    {
      name: 'My Rule Performance',
      ruleId: 'my-plugin/my-rule',
      rulePath: '../rules/my-rule.js',
      cases: [
        {
          testPath: './my-rule/base-case.js',
        },
      ],
    },
  ],
})
```

3. Run benchmarks:

```bash
npx eslint-rule-benchmark run
```

## Configuration File

By default, `eslint-rule-benchmark run` will look for the `config.{js,cjs,mts,ts,cts,mts}` configuration file in the `./benchmark/` directory.

The configuration file should export a configuration object, preferably using the `defineConfig` helper for type safety and autocompletion.

```typescript
import { defineConfig } from 'eslint-rule-benchmark'

export default defineConfig({
  /* Number of measurement iterations. Default: 1000. */
  iterations: 1000,

  /* Warmup configuration. */
  warmup: {
    /* Number of warmup iterations. Default: 100. */
    iterations: 100,

    /* Whether to enable warmup. Default: true. */
    enabled: true,
  },
  /* Max time per benchmark. Default: 5000. */
  timeout: 5000,

  /* Array of benchmark test specifications. */
  tests: [
    {
      /* Descriptive name for this test group/specification. */
      name: 'Rule: sort-imports',

      /* ESLint rule identifier. */
      ruleId: 'sort-imports',

      /* Path to the rule's implementation. */
      rulePath: '../lib/rules/sort-imports.ts',

      /* Override global benchmark settings for this specific test group. */
      iterations: 50,
      timeout: 300,
      warmup: {
        iterations: 10,
      },

      /* Array of test cases for this rule. */
      cases: [
        {
          testPath: './sort-imports/base-case.ts',

          /* ESLint rule options specific to this case. */
          options: [{ order: 'asc', ignoreCase: true }],

          /* ESLint rule severity for this case (0, 1, 2). Default: 2. */
          severity: 2,
        },
        {
          testPath: './sort-imports/complex-case.ts',
        },
      ],
    },
    {
      name: 'Rule: sort-vars',
      ruleId: 'sort-vars',
      rulePath: '../lib/rules/sort-vars.ts',
      cases: [
        {
          testPath: './sort-vars/base-case.ts',
        },
      ],
    },
    /* ... more test specifications */
  ],
})
```

## Metrics and Output

ESLint Rule Benchmark provides the following performance metrics:

| Metric                | Description                                       |
| --------------------- | ------------------------------------------------- |
| Operations per second | Number of operations per second                   |
| Average time          | Average execution time of the rule (e.g., in ms)  |
| Median time (P50)     | Median execution time (50th percentile)           |
| Minimum time          | Minimum execution time                            |
| Maximum time          | Maximum execution time                            |
| Standard deviation    | Standard deviation (measure of time variability)  |
| Total samples         | Number of measurements taken during the benchmark |

Metrics are available in Console, JSON, and Markdown formats, allowing integration with various systems and workflows.

### Example Output

```
--------------------------------------------------------------------------------------------------
                                   Rule: no-negated-conjunction
--------------------------------------------------------------------------------------------------
Sample          | Ops/sec        | Avg Time | Median   | Min      | Max      | StdDev    | Samples
base-case.ts    | 17,517 ops/sec | 0.057 ms | 0.056 ms | 0.053 ms | 0.065 ms | ±0.002 ms | 35,454
complex-case.ts | 17,582 ops/sec | 0.057 ms | 0.056 ms | 0.053 ms | 0.065 ms | ±0.002 ms | 33,267
--------------------------------------------------------------------------------------------------
--------------------------------------------------------------------------------------------------
                                   Rule: no-negated-disjunction
--------------------------------------------------------------------------------------------------
Sample          | Ops/sec        | Avg Time | Median   | Min      | Max      | StdDev    | Samples
base-case.ts    | 17,386 ops/sec | 0.058 ms | 0.057 ms | 0.054 ms | 0.066 ms | ±0.003 ms | 33,066
--------------------------------------------------------------------------------------------------

System Information:

Runtime: Node.js v22.15.1, V8 12.4.254.21-node.24, ESLint 9.25.1
Platform: darwin arm64 (24.5.0)
Hardware: Apple M1 Pro (10 cores, 2400 MHz), 32 GB RAM
```

## GitHub Actions Integration

ESLint Rule Benchmark automatically publishes benchmark results as comments to GitHub Pull Requests when running in GitHub Actions environment.

### Setup

ESLint Rule Benchmark automatically posts benchmark results as comments on pull requests.

### Example Workflow

Create `.github/workflows/benchmark.yml`:

```yaml
name: ESLint Rule Benchmark

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - name: Run benchmark
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx eslint-rule-benchmark run
```

## FAQ

### How accurate are the measurements?

The tool uses Tinybench with warmup phases and outlier filtering for high accuracy.

### How It Works

The tool uses [Tinybench](https://github.com/tinylibs/tinybench) for accurate and reliable benchmarking:

- Warmup phase to minimize JIT compilation impact
- Multiple iterations for statistical significance
- Isolation of the tested rule from other rules
- Outlier filtering (Tukey's fences method) for more stable and representative results, especially for maximum execution times.

### Can I benchmark TypeScript rules?

Yes! Native TypeScript support is included.

## Versioning Policy

This plugin is following [Semantic Versioning](https://semver.org/).

## Contributing

See [Contributing Guide](https://github.com/azat-io/eslint-rule-benchmark/blob/main/contributing.md).

## License

MIT &copy; [Azat S.](https://azat.io)
