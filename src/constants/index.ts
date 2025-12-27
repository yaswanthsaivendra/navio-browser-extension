/**
 * Application constants
 * Centralized configuration values to avoid magic numbers
 */

/**
 * Screenshot configuration
 */
export const SCREENSHOT_CONFIG = {
  /** Maximum width for thumbnails in pixels */
  THUMBNAIL_MAX_WIDTH: 320,
  /** Size threshold in KB - screenshots larger than this go to IndexedDB */
  FULL_SIZE_THRESHOLD_KB: 200,
  /** Compression quality for thumbnails (0-1) */
  THUMBNAIL_QUALITY: 0.7,
  /** Compression quality for full screenshots (0-1) */
  FULL_COMPRESSION_QUALITY: 0.85,
  /** Default compression quality (0-1) */
  DEFAULT_QUALITY: 0.75,
} as const

/**
 * Recording configuration
 */
export const RECORDING_CONFIG = {
  /** Polling interval for recording state checks in milliseconds */
  POLLING_INTERVAL_MS: 500,
  /** Delays for content script retry checks in milliseconds (exponential backoff) */
  CONTENT_SCRIPT_RETRY_DELAYS: [200, 500, 1000] as const,
  /** Maximum number of retries for content script checks */
  MAX_RETRIES: 3,
  /** Wait time after page reload in milliseconds */
  PAGE_RELOAD_WAIT_MS: 1500,
  /** Initial retry delay for storage checks in milliseconds */
  STORAGE_CHECK_RETRY_MS: 200,
} as const

/**
 * Storage configuration
 */
export const STORAGE_CONFIG = {
  /** Key for flows in chrome.storage.local */
  FLOWS_KEY: "navio_flows",
  /** Key for recording session in chrome.storage.local */
  RECORDING_SESSION_KEY: "navio_recording_session",
} as const

/**
 * IndexedDB configuration
 */
export const INDEXEDDB_CONFIG = {
  /** Database name */
  DB_NAME: "navio_screenshots",
  /** Database version */
  DB_VERSION: 1,
  /** Object store name */
  STORE_NAME: "screenshots",
} as const

/**
 * UI configuration
 */
export const UI_CONFIG = {
  /** Maximum length for flow names */
  MAX_FLOW_NAME_LENGTH: 100,
  /** Minimum length for flow names */
  MIN_FLOW_NAME_LENGTH: 1,
  /** Maximum length for step explanations */
  MAX_EXPLANATION_LENGTH: 200,
  /** Minimum length for step explanations */
  MIN_EXPLANATION_LENGTH: 1,
} as const
