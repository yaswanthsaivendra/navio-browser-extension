/**
 * Authentication manager
 * High-level authentication orchestration and UI coordination
 */

import { config } from "~/config"

import { logError } from "../errors"
import { checkLoginStatus, fetchExtensionToken } from "./token-fetcher"

/**
 * Authentication status
 */
export type AuthStatus = "authenticated" | "unauthenticated" | "checking"

/**
 * Authentication state
 */
export interface AuthState {
  status: AuthStatus
  tenantName?: string
}

/**
 * Check authentication status and handle UI accordingly
 * Returns true if user is authenticated, false otherwise
 */
export async function checkAuthAndPrompt(): Promise<boolean> {
  const isLoggedIn = await checkLoginStatus()

  if (!isLoggedIn) {
    // User is not logged in - they need to log in to the web app
    // The UI should show a prompt to log in
    return false
  }

  return true
}

/**
 * Prompt user to log in by opening the web app login page
 */
export async function promptLogin(): Promise<void> {
  try {
    await chrome.tabs.create({
      url: `${config.apiBaseUrl}/login?redirect=/dashboard`,
    })
  } catch (error) {
    logError(error, { context: "promptLogin" })
    throw new Error("Failed to open login page")
  }
}

/**
 * Initialize authentication on extension startup
 * Tries to fetch token if user is logged in to web app
 * This runs silently in the background
 */
export async function initializeAuth(): Promise<void> {
  try {
    // Try to fetch token (will work if user is logged in)
    await fetchExtensionToken()
    // Token fetched and stored successfully
  } catch {
    // User is not logged in or other error occurred
    // This is expected and normal - we'll handle it when user tries to use features
    // Don't log this as an error since it's a normal state
  }
}

/**
 * Get current authentication status
 * Returns the current auth state without making network requests
 * Use this for UI display when you have the state cached
 */
export async function getAuthStatus(): Promise<AuthStatus> {
  try {
    const isLoggedIn = await checkLoginStatus()
    return isLoggedIn ? "authenticated" : "unauthenticated"
  } catch {
    return "checking"
  }
}
