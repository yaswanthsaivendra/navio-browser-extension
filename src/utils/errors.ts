/**
 * Error handling utilities
 */

export class ExtensionError extends Error {
  constructor(
    message: string,
    public code?: string,
    public context?: Record<string, unknown>
  ) {
    super(message)
    this.name = "ExtensionError"
  }
}

/**
 * Log error with context
 */
export function logError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (error instanceof ExtensionError) {
    console.error(`[Navio Extension Error] ${error.message}`, {
      code: error.code,
      context: { ...error.context, ...context },
    })
  } else if (error instanceof Error) {
    console.error(`[Navio Extension Error] ${error.message}`, {
      stack: error.stack,
      context,
    })
  } else {
    console.error("[Navio Extension Error] Unknown error", { error, context })
  }
}

/**
 * Safe async wrapper
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await fn()
  } catch (error) {
    logError(error)
    return fallback
  }
}
