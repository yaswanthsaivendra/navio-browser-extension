/**
 * Token fetcher utilities
 * Handles automatic token fetching from the API using browser cookies
 */

import { config } from "~/config"
import type { StoredToken, TokenResponse } from "~/types/api"

import { getTokenData, isTokenValid, saveToken } from "../auth-storage"
import { logError } from "../errors"

/**
 * Custom error for authentication failures
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: "NOT_LOGGED_IN" | "NO_TENANT" | "NETWORK_ERROR" | "UNKNOWN"
  ) {
    super(message)
    this.name = "AuthError"
  }
}

/**
 * Automatically fetch extension token from web app
 * Uses browser cookies for authentication (seamless if user is logged in)
 *
 * @throws {AuthError} If authentication fails
 */
export async function fetchExtensionToken(): Promise<TokenResponse> {
  try {
    const response = await globalThis.fetch(
      `${config.apiBaseUrl}${config.endpoints.token}`,
      {
        method: "POST",
        credentials: "include", // Important: includes cookies
        headers: {
          "Content-Type": "application/json",
        },
      }
    )

    if (!response.ok) {
      if (response.status === 401) {
        throw new AuthError(
          "User is not logged in to the web app",
          "NOT_LOGGED_IN"
        )
      }

      if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}))
        if (errorData.error?.code === "NO_ACTIVE_TENANT") {
          throw new AuthError(
            "No active tenant found. Please select a tenant in the web app.",
            "NO_TENANT"
          )
        }
      }

      const errorData = await response.json().catch(() => ({}))
      throw new AuthError(
        errorData.error?.message ||
          `Failed to fetch token: ${response.statusText}`,
        "UNKNOWN"
      )
    }

    const data: TokenResponse = await response.json()

    // Validate response structure
    if (!data.token || !data.expiresAt) {
      throw new AuthError("Invalid token response from server", "UNKNOWN")
    }

    // Store token data
    const tokenData: StoredToken = {
      token: data.token,
      expiresAt: data.expiresAt,
      tenantId: data.tenantId,
      tenantName: data.tenantName,
    }
    await saveToken(tokenData)

    return data
  } catch (error) {
    if (error instanceof AuthError) {
      throw error
    }

    // Network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      logError(error, { context: "fetchExtensionToken" })
      throw new AuthError(
        "Network error: Could not connect to server",
        "NETWORK_ERROR"
      )
    }

    logError(error, { context: "fetchExtensionToken" })
    throw new AuthError("Failed to fetch token", "UNKNOWN")
  }
}

/**
 * Get a valid token, fetching a new one if needed
 * This is the main function to use when you need an auth token
 *
 * @throws {AuthError} If authentication fails
 */
export async function ensureValidToken(): Promise<string> {
  // Check if we have a valid token
  const isValid = await isTokenValid()
  if (isValid) {
    const data = await getTokenData()
    if (data?.token) {
      return data.token
    }
  }

  // Token is invalid or missing, try to fetch a new one
  // This will work if user is logged in to web app (browser cookies)
  const tokenData = await fetchExtensionToken()
  return tokenData.token
}

/**
 * Check if user is logged in to web app
 * First checks local storage for a valid token (fast path).
 * Only makes a network request if token is missing or invalid.
 *
 * @returns true if user is logged in, false otherwise
 */
export async function checkLoginStatus(): Promise<boolean> {
  // First check if we have a valid token stored locally (fast path)
  const isValid = await isTokenValid()
  if (isValid) {
    // We have a valid token, user is logged in
    return true
  }

  // Token is missing or invalid, check if user is still logged in via network
  try {
    await fetchExtensionToken()
    return true
  } catch (error) {
    if (error instanceof AuthError && error.code === "NOT_LOGGED_IN") {
      return false
    }
    // For other errors (network, etc.), we assume user is not logged in
    return false
  }
}
