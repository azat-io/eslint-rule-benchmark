import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import os from 'node:os'

/** System information collected during benchmark execution. */
export interface SystemInfo {
  /** Total system memory in gigabytes. */
  totalMemoryGb: number

  /** ESLint version used during benchmarking. */
  eslintVersion: string

  /** Node.js version (e.g., "v20.11.0"). */
  nodeVersion: string

  /** CPU base frequency in MHz. */
  cpuSpeedMHz: number

  /** Operating system release version (e.g., "22.6.0", "10.0.22621"). */
  osRelease: string

  /** V8 JavaScript engine version. */
  v8Version: string

  /** Operating system platform (e.g., "darwin", "linux", "win32"). */
  platform: string

  /** Number of CPU cores. */
  cpuCount: number

  /** CPU model (e.g., "Intel(R) Core(TM) i7-12700K CPU @ 3.60GHz"). */
  cpuModel: string

  /** CPU architecture (e.g., "x64", "arm64"). */
  arch: string
}

/**
 * Collects system information that may affect benchmark results.
 *
 * @returns Object containing system specifications and versions.
 */
export async function collectSystemInfo(): Promise<SystemInfo> {
  let require = createRequire(import.meta.url)
  let eslintPackagePath = require.resolve('eslint/package.json')
  let eslintPackageContent = await fs.readFile(eslintPackagePath, 'utf8')
  let eslintPackage = JSON.parse(eslintPackageContent) as { version: string }
  let eslintVersion = eslintPackage.version

  let totalMemoryBytes = os.totalmem()
  let totalMemoryGb = Math.round(totalMemoryBytes / (1024 * 1024 * 1024))

  let cpus = os.cpus()
  let [firstCpu] = cpus

  return {
    v8Version: process.versions.v8,
    nodeVersion: process.version,
    cpuSpeedMHz: firstCpu!.speed,
    cpuModel: firstCpu!.model,
    platform: os.platform(),
    osRelease: os.release(),
    cpuCount: cpus.length,
    arch: os.arch(),
    totalMemoryGb,
    eslintVersion,
  }
}
