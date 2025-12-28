/**
 * JWT utility functions
 * Simple JWT decoding (no verification - we trust tokens from our API)
 */

import { logError } from "./errors"

/**
 * JWT payload structure (as per API documentation)
 */
export interface JWTPayload {
  userId: string
  tenantId: string
  email: string
  iat: number
  exp: number
}

/**
 * Decode JWT token without verification
 * Returns null if token is invalid or cannot be decoded
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split(".")
    if (parts.length !== 3) {
      return null
    }

    // Decode base64url payload (second part)
    const payload = parts[1]
    // Replace base64url characters with base64 characters
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    // Add padding if needed
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)

    // Decode base64
    const decoded = atob(padded)
    const parsed = JSON.parse(decoded) as JWTPayload

    return parsed
  } catch (error) {
    logError(error, { context: "decodeJWT" })
    return null
  }
}

/**
 * Extract email from JWT token
 */
export function getEmailFromToken(token: string): string | null {
  const payload = decodeJWT(token)
  return payload?.email || null
}

/**
 * Extract user ID from JWT token
 */
export function getUserIdFromToken(token: string): string | null {
  const payload = decodeJWT(token)
  return payload?.userId || null
}
