/**
 * Environment-based logging utility
 * Only logs debug messages in development mode
 */

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private isDevelopment: boolean

  constructor() {
    // Check if we're in development mode
    // For Vite, import.meta.env.DEV is available
    // For runtime, we check if the extension is unpacked
    this.isDevelopment =
      typeof chrome !== "undefined" &&
      chrome.runtime &&
      !("update_url" in chrome.runtime.getManifest())
  }

  /**
   * Debug level - only shown in development
   */
  debug(message: string, context?: unknown): void {
    if (this.isDevelopment) {
      if (context !== undefined) {
        // eslint-disable-next-line no-console
        console.log(`[Navio Debug] ${message}`, context)
      } else {
        // eslint-disable-next-line no-console
        console.log(`[Navio Debug] ${message}`)
      }
    }
  }

  /**
   * Info level - shown in all environments
   */
  info(message: string, context?: LogContext): void {
    if (context) {
      // eslint-disable-next-line no-console
      console.log(`[Navio] ${message}`, context)
    } else {
      // eslint-disable-next-line no-console
      console.log(`[Navio] ${message}`)
    }
  }

  /**
   * Warning level - shown in all environments
   */
  warn(message: string, context?: LogContext): void {
    if (context) {
      console.warn(`[Navio] ${message}`, context)
    } else {
      console.warn(`[Navio] ${message}`)
    }
  }

  /**
   * Error level - shown in all environments
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (error instanceof Error) {
      console.error(`[Navio] ${message}`, error, context || {})
    } else if (error) {
      console.error(`[Navio] ${message}`, error, context || {})
    } else {
      console.error(`[Navio] ${message}`, context || {})
    }
  }
}

// Export singleton instance
export const logger = new Logger()
