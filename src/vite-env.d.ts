/// <reference types="vite/client" />

/**
 * Vite environment variable types
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
