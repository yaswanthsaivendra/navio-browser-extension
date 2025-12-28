/**
 * Authentication storage utilities
 * Manages token storage and retrieval from chrome.storage.local
 */

import { AUTH_CONFIG } from "~/constants"
import type { StoredToken } from "~/types/api"

import { logError, safeAsync } from "./errors"

/**
 * Check if chrome.storage is available
 */
function isStorageAvailable(): boolean {
  try {
    if (typeof chrome === "undefined" || chrome === null) {
      return false
    }
    if (!chrome.storage || !chrome.storage.local) {
      return false
    }
    return typeof chrome.storage.local.get === "function"
  } catch {
    return false
  }
}

/**
 * Save token data to storage
 */
export async function saveToken(data: StoredToken): Promise<void> {
  if (!isStorageAvailable()) {
    throw new Error("Chrome storage is not available")
  }

  return safeAsync(async () => {
    await chrome.storage.local.set({
      [AUTH_CONFIG.TOKEN_KEY]: data.token,
      [AUTH_CONFIG.TOKEN_EXPIRY_KEY]: data.expiresAt,
      [AUTH_CONFIG.TENANT_ID_KEY]: data.tenantId,
      [AUTH_CONFIG.TENANT_NAME_KEY]: data.tenantName,
    })
  }) as Promise<void>
}

/**
 * Get token string from storage
 */
export async function getToken(): Promise<string | null> {
  if (!isStorageAvailable()) {
    return null
  }

  return safeAsync(async () => {
    const result = await chrome.storage.local.get(AUTH_CONFIG.TOKEN_KEY)
    return (result[AUTH_CONFIG.TOKEN_KEY] as string) || null
  }, null) as Promise<string | null>
}

/**
 * Get complete token data from storage
 */
export async function getTokenData(): Promise<StoredToken | null> {
  if (!isStorageAvailable()) {
    return null
  }

  return safeAsync(async () => {
    const result = await chrome.storage.local.get([
      AUTH_CONFIG.TOKEN_KEY,
      AUTH_CONFIG.TOKEN_EXPIRY_KEY,
      AUTH_CONFIG.TENANT_ID_KEY,
      AUTH_CONFIG.TENANT_NAME_KEY,
    ])

    const token = result[AUTH_CONFIG.TOKEN_KEY] as string | undefined
    if (!token) {
      return null
    }

    return {
      token,
      expiresAt: (result[AUTH_CONFIG.TOKEN_EXPIRY_KEY] as string) || "",
      tenantId: (result[AUTH_CONFIG.TENANT_ID_KEY] as string) || "",
      tenantName: (result[AUTH_CONFIG.TENANT_NAME_KEY] as string) || "",
    }
  }, null) as Promise<StoredToken | null>
}

/**
 * Clear token data from storage
 */
export async function clearToken(): Promise<void> {
  if (!isStorageAvailable()) {
    return
  }

  await safeAsync(async () => {
    await chrome.storage.local.remove([
      AUTH_CONFIG.TOKEN_KEY,
      AUTH_CONFIG.TOKEN_EXPIRY_KEY,
      AUTH_CONFIG.TENANT_ID_KEY,
      AUTH_CONFIG.TENANT_NAME_KEY,
    ])
  })
}

/**
 * Check if stored token is valid (not expired)
 * Returns true if token exists and expires more than 5 minutes in the future
 */
export async function isTokenValid(): Promise<boolean> {
  const data = await getTokenData()
  if (!data || !data.expiresAt) {
    return false
  }

  try {
    const expiresAt = new Date(data.expiresAt)
    const now = new Date()
    const threshold = now.getTime() + AUTH_CONFIG.TOKEN_REFRESH_THRESHOLD_MS

    return expiresAt.getTime() > threshold
  } catch (error) {
    logError(error, { context: "isTokenValid" })
    return false
  }
}
