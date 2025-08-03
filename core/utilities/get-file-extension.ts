/**
 * Get the file extension from a filename.
 *
 * @param filename - The name of the file.
 * @returns The file extension or an empty string if no extension is found.
 */
export function getFileExtension(filename: string): string {
  let lastDotIndex = filename.lastIndexOf('.')
  if (lastDotIndex <= 0) {
    return ''
  }

  let extension = filename.slice(lastDotIndex + 1)
  return extension.length > 0 ? extension : ''
}
