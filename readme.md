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

Eslint Rule Benchmark is a specialized tool for accurately measuring the performance of ESLint rules, helping plugin developers identify optimization opportunities and detect regressions through comprehensive timing metrics available in console, JSON, and Markdown formats.

Built for plugin authors, DevEx engineers, and CI workflows, it reports metrics like ops/sec, mean time, and percentiles.

## Features

- **Precise timing measurements** for individual ESLint rules
- **Testing against real projects** and code files
- **Automatic regression detection** with customizable thresholds
- **Detailed statistics** with various metrics (mean time, median, percentiles)
- **Multiple report formats** (console, JSON, Markdown)
- **CI/CD integration** for continuous performance monitoring

## Installation

```bash
npm install --save-dev eslint-rule-benchmark
```

## Usage

```sh
eslint-rule-benchmark run --rule ./dist/rules/sort-imports.js --name sort-imports --source index.js
```

## Metrics and Output

ESLint Rule Benchmark provides the following performance metrics:

| Metric                | Description                                          |
| --------------------- | ---------------------------------------------------- |
| Operations per second | Number of operations per second                      |
| Average time          | Average execution time of the rule                   |
| Median time (P50)     | Median execution time (50th percentile)              |
| Minimum time          | Minimum execution time                               |
| Maximum time          | Maximum execution time                               |
| P75 Percentile        | 75th percentile (time for 75% of fastest executions) |
| P99 Percentile        | 99th percentile (time for 99% of fastest executions) |
| Standard deviation    | Standard deviation (measure of time variability)     |
| Margin of error       | Relative margin of error in measurements             |
| Total samples         | Number of measurements taken during the benchmark    |
| Total warnings        | Number of warnings found by the rule                 |
| Total errors          | Number of errors found by the rule                   |

Metrics are available in Console, JSON, and Markdown formats, allowing integration with various systems and workflows.

## How It Works

The tool uses [Tinybench](https://github.com/tinylibs/tinybench) for accurate and reliable benchmarking:

- Warmup phase to minimize JIT compilation impact
- Multiple iterations for statistical significance
- Isolation of the tested rule from other rules
- Outlier filtering for stable results

### Example Output

```
┌─────────────────────────────────────────────────────────────────┐
│              Rule Benchmark Results: sort-imports               │
│ Metric                                   │ Value                │
│ Operations per second                    │ 989                  │
│ Average time                             │ 1.10 ms              │
│ Median time (P50)                        │ 0.94 ms              │
│ Minimum time                             │ 0.87 ms              │
│ Maximum time                             │ 3.78 ms              │
│ P75 Percentile                           │ 1.01 ms              │
│ P99 Percentile                           │ 2.62 ms              │
│ Standard deviation                       │ 0.45 ms              │
│ Relative margin of error                 │ ±4.86%               │
│ Total samples                            │ 274                  │
└──────────────────────────────────────────┴──────────────────────┘
```

## Versioning Policy

This plugin is following [Semantic Versioning](https://semver.org/).

## Contributing

See [Contributing Guide](https://github.com/azat-io/eslint-rule-benchmark/blob/main/contributing.md).

## License

MIT &copy; [Azat S.](https://azat.io)
