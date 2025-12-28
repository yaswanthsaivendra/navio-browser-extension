/**
 * API Client
 * Base HTTP client with authentication for all API requests
 */

import { config } from "~/config"
import type {
  ApiErrorResponse,
  CreateFlowRequest,
  CreateFlowResponse,
} from "~/types/api"
import { ensureValidToken } from "~/utils/auth/token-fetcher"
import { ApiError, logError } from "~/utils/errors"

/**
 * API Client class
 * Handles HTTP requests with automatic authentication
 */
export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = config.apiBaseUrl) {
    this.baseUrl = baseUrl
  }

  /**
   * Get authentication headers with token
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await ensureValidToken()
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }
  }

  /**
   * Handle API response and transform errors
   */
  private async handleResponse<T>(response: globalThis.Response): Promise<T> {
    if (!response.ok) {
      let errorData: ApiErrorResponse | null = null
      try {
        errorData = await response.json()
      } catch {
        // If response is not JSON, create a generic error
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          "HTTP_ERROR",
          response.status
        )
      }

      if (errorData && errorData.error) {
        throw ApiError.fromResponse(errorData)
      }

      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        "HTTP_ERROR",
        response.status
      )
    }

    return response.json() as Promise<T>
  }

  /**
   * Create a flow
   */
  async createFlow(data: CreateFlowRequest): Promise<CreateFlowResponse> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await globalThis.fetch(
        `${this.baseUrl}${config.endpoints.flows}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(data),
          credentials: "include", // Include cookies for same-origin requests
        }
      )

      return await this.handleResponse<CreateFlowResponse>(response)
    } catch (error) {
      // If it's already an ApiError, rethrow it
      if (error instanceof ApiError) {
        throw error
      }

      // Log unexpected errors
      logError(error, { context: "api-client-create-flow" })

      // Wrap in ApiError
      if (error instanceof Error) {
        throw new ApiError(error.message, "NETWORK_ERROR", 0)
      }

      throw new ApiError("An unexpected error occurred", "UNKNOWN_ERROR", 0)
    }
  }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient()
