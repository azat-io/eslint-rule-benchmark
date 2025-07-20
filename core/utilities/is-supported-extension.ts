import { SUPPORTED_EXTENSIONS } from '../../constants'

/**
 * Type representing the supported file extensions for the benchmark runner.
 * This is derived from the SUPPORTED_EXTENSIONS constant.
 */
type Extensions = (typeof SUPPORTED_EXTENSIONS)[number]

/**
 * Check if the given extension is supported by the benchmark runner.
 *
 * @param {string} extension - The file extension to check.
 * @returns {boolean} True if the extension is supported, false otherwise.
 */
export function isSupportedExtension(
  extension: string,
): extension is Extensions {
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(extension)
}
