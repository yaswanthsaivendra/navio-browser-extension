/**
 * Authentication Status Component
 * Displays authentication status and provides login functionality
 * Follows industry best practices for profile display in browser extensions
 */

import { Loader2, LogIn } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "~/components/ui/button"
import { getTokenData, isTokenValid } from "~/utils/auth-storage"
import { checkAuthAndPrompt, promptLogin } from "~/utils/auth/auth-manager"
import { logError } from "~/utils/errors"
import { getEmailFromToken } from "~/utils/jwt"

type AuthStatusState = "checking" | "authenticated" | "unauthenticated"

/**
 * Get user initials from email or name
 */
function getInitials(email: string | null): string {
  if (!email) return "?"
  const parts = email.split("@")[0].split(/[.\-_]/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return email.substring(0, 2).toUpperCase()
}

export function AuthStatus() {
  const [status, setStatus] = useState<AuthStatusState>("checking")
  const [tenantName, setTenantName] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const checkAuth = async () => {
      try {
        if (cancelled) return

        // Fast path: Check if we have a valid token stored locally first
        const hasValidToken = await isTokenValid()
        if (hasValidToken) {
          // We have a valid token, load user info immediately (no network request)
          const tokenData = await getTokenData()
          if (tokenData && !cancelled) {
            setTenantName(tokenData.tenantName || null)
            const email = getEmailFromToken(tokenData.token)
            setUserEmail(email)
            setStatus("authenticated")
            return // Exit early, no need to make network request
          }
        }

        // Slow path: Token missing/invalid, check with server
        if (cancelled) return
        setStatus("checking")
        const isAuthenticated = await checkAuthAndPrompt()

        if (cancelled) return
        if (isAuthenticated) {
          // Get token data and extract user information
          const tokenData = await getTokenData()
          if (tokenData) {
            setTenantName(tokenData.tenantName || null)
            // Extract email from JWT token
            const email = getEmailFromToken(tokenData.token)
            setUserEmail(email)
          }
          setStatus("authenticated")
        } else {
          setTenantName(null)
          setUserEmail(null)
          setStatus("unauthenticated")
        }
      } catch (error) {
        if (cancelled) return
        logError(error, { context: "check-auth-status" })
        setStatus("unauthenticated")
        setTenantName(null)
        setUserEmail(null)
      }
    }

    checkAuth()

    return () => {
      cancelled = true
    }
  }, [])

  const handleLogin = async () => {
    try {
      await promptLogin()
      // Refresh auth status after a short delay (user might log in)
      setTimeout(async () => {
        try {
          setStatus("checking")
          const isAuthenticated = await checkAuthAndPrompt()

          if (isAuthenticated) {
            const tokenData = await getTokenData()
            if (tokenData) {
              setTenantName(tokenData.tenantName || null)
              const email = getEmailFromToken(tokenData.token)
              setUserEmail(email)
            }
            setStatus("authenticated")
          } else {
            setTenantName(null)
            setUserEmail(null)
            setStatus("unauthenticated")
          }
        } catch (error) {
          logError(error, { context: "check-auth-status-after-login" })
          setStatus("unauthenticated")
          setTenantName(null)
          setUserEmail(null)
        }
      }, 2000)
    } catch (error) {
      logError(error, { context: "handle-login" })
    }
  }

  if (status === "checking") {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Checking...</span>
      </div>
    )
  }

  if (status === "authenticated") {
    const initials = getInitials(userEmail)
    const displayEmail = userEmail || "User"

    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/50 dark:bg-muted/30 rounded-md border border-border hover:bg-muted/70 dark:hover:bg-muted/50 transition-colors">
        {/* Avatar/Initials Circle */}
        <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
          <span className="text-[10px] font-semibold text-primary">
            {initials}
          </span>
        </div>

        {/* User Info - Compact layout for top right */}
        <div className="flex flex-col min-w-0 max-w-[140px]">
          <span className="text-xs font-medium text-foreground truncate leading-tight">
            {displayEmail}
          </span>
          {tenantName && (
            <span className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
              {tenantName}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleLogin}
      className="border-yellow-300 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-xs px-2.5 py-1.5 h-auto">
      <LogIn className="h-3.5 w-3.5 mr-1.5" />
      Log In
    </Button>
  )
}
