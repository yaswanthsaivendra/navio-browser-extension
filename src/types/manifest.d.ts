/**
 * Type definitions for Chrome Extension Manifest V3
 * Extends the built-in chrome types for better type safety
 */

declare module "*.json" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value: any
  export default value
}
