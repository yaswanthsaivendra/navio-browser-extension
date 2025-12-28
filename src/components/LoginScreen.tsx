/**
 * Login Screen Component
 * Full-screen login interface shown when user is not authenticated
 */

import { Loader2, LogIn } from "lucide-react"
import { useState } from "react"

import { Button } from "~/components/ui/button"
import { promptLogin } from "~/utils/auth/auth-manager"
import { logError } from "~/utils/errors"

interface LoginScreenProps {
  onLoginSuccess?: () => void
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    try {
      setIsLoading(true)
      await promptLogin()

      // Notify parent component to check auth status
      if (onLoginSuccess) {
        // Wait a bit for user to log in
        setTimeout(() => {
          onLoginSuccess()
        }, 2000)
      }
    } catch (error) {
      logError(error, { context: "login-screen-handle-login" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[500px] p-8 text-center">
      <div className="w-full max-w-xs space-y-6">
        {/* Logo/Branding */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Navio</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to start recording and managing your demo flows
          </p>
        </div>

        {/* Login Button */}
        <Button
          onClick={handleLogin}
          disabled={isLoading}
          size="lg"
          className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Opening login page...
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4 mr-2" />
              Sign in to Navio
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
