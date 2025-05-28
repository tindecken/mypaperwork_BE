/**
 * Utility functions for working with binary data
 */

/**
 * Converts an ArrayBuffer to a base64 string
 * @param buffer - The ArrayBuffer to convert
 * @returns A base64 string representation of the input buffer
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
