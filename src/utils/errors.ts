/**
 * Error handling utilities
 */

import type { ApiErrorResponse } from "~/types/api"

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
 * API Error class for structured error handling
 */
export class ApiError extends Error {
  code: string
  statusCode: number
  details?: Array<{
    path: (string | number)[]
    message: string
  }>

  constructor(
    message: string,
    code: string,
    statusCode: number,
    details?: Array<{
      path: (string | number)[]
      message: string
    }>
  ) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }

  /**
   * Create ApiError from API error response
   */
  static fromResponse(response: ApiErrorResponse): ApiError {
    const { error } = response
    return new ApiError(
      error.message,
      error.code,
      error.statusCode,
      error.details
    )
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
 * Format validation errors into a user-friendly message
 */
function formatValidationErrors(
  details: Array<{
    path: (string | number)[]
    message: string
  }>
): string {
  if (details.length === 0) return ""

  const messages = details.map((detail) => {
    const path = detail.path.join(".")
    return `${path}: ${detail.message}`
  })

  return messages.join(", ")
}

/**
 * Handle API errors and return user-friendly error messages
 */
export function handleApiError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "UNAUTHORIZED":
        return "Your session has expired. Please reconnect your account."
      case "VALIDATION_ERROR":
        if (error.details && error.details.length > 0) {
          const formatted = formatValidationErrors(error.details)
          return `Validation failed: ${formatted}`
        }
        return "Validation failed. Please check your input."
      case "DUPLICATE_STEP_ORDER":
        return "Step orders must be unique. Please check your flow steps."
      case "SCREENSHOT_TOO_LARGE":
        return "Screenshot is too large. Please try again with a smaller image."
      case "NO_ACTIVE_TENANT":
        return "No active organization. Please select an organization in the web app."
      default:
        return error.message || "An error occurred"
    }
  }

  if (error instanceof Error) {
    // Handle network errors
    if (
      error.message.includes("Failed to fetch") ||
      error.message.includes("NetworkError")
    ) {
      return "Network error. Please check your internet connection and try again."
    }

    // Handle other errors
    return error.message || "An error occurred"
  }

  return "An unexpected error occurred"
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
