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

Eslint Rule Benchmark is a tool for measuring the performance of custom ESLint rules, available both as a CLI and a programmatic API. It helps you identify slow rules, compare versions, and track performance regressions across updates.

Built for plugin authors, DevEx engineers, and CI workflows, it benchmarks rules using real or synthetic ASTs and reports metrics like ops/sec, mean time, and percentiles, with output in table, JSON, or Markdown formats.

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

ESLint Rule Benchmark provides the following metrics:

| Metric          | Description                             |
| --------------- | --------------------------------------- |
| Mean time       | Average execution time of the rule      |
| Median time     | Median time (50th percentile)           |
| Min time        | Minimum execution time                  |
| Max time        | Maximum execution time                  |
| 95th percentile | 95th percentile (resistant to outliers) |
| Ops/sec         | Operations per second                   |
| Total samples   | Number of measurements taken            |
| Total warnings  | Number of warnings found by the rule    |
| Total errors    | Number of errors found by the rule      |

## How It Works

The tool uses [Tinybench](https://github.com/tinylibs/tinybench) for accurate and reliable benchmarking:

- Warmup phase to minimize JIT compilation impact
- Multiple iterations for statistical significance
- Isolation of the tested rule from other rules
- Outlier filtering for stable results

### Example Output

```
Rule Benchmark Results: sort-imports

Metric               Value
===================================
Mean time            1.12 ms
Median time          0.94 ms
Min time             0.84 ms
Max time             5.87 ms
Total samples        82369
Total warnings       0
Total errors         287
```

## Versioning Policy

This plugin is following [Semantic Versioning](https://semver.org/).

## Contributing

See [Contributing Guide](https://github.com/azat-io/eslint-rule-benchmark/blob/main/contributing.md).

## License

MIT &copy; [Azat S.](https://azat.io)
