/**
 * API Configuration
 * Centralized configuration for API endpoints and environment settings
 */

/**
 * API base URL
 * Supports environment variables via Vite (VITE_API_BASE_URL)
 * Defaults to production URL if not set
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://your-app.vercel.app"

/**
 * Application configuration
 */
export const config = {
  /** API base URL for all requests */
  apiBaseUrl: API_BASE_URL,
  /** Current environment (development, production, etc.) */
  environment: import.meta.env.MODE || "production",
  /** API endpoints */
  endpoints: {
    /** Token endpoint for authentication */
    token: "/api/extension/token",
    /** Flows endpoint (for future use) */
    flows: "/api/extension/v1/flows",
  },
} as const
