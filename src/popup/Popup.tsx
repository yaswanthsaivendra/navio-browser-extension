import { Loader2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { createFlow as createFlowViaAPI } from "~/api/flows"
import { AuthStatus } from "~/components/AuthStatus"
import { LoginScreen } from "~/components/LoginScreen"
import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { RECORDING_CONFIG, UI_CONFIG } from "~/constants"
import type { FlowStep } from "~/types/flows"
import type { StartRecordingMessage } from "~/types/messages"
import { handleApiError, logError } from "~/utils/errors"
import { ensureContentScriptReady, sendMessage } from "~/utils/messaging"
import { createFlow as createLocalFlow } from "~/utils/storage"

type PopupState = "idle" | "recording"

function Popup() {
  const [authStatus, setAuthStatus] = useState<
    "checking" | "authenticated" | "unauthenticated"
  >("checking")
  const [state, setState] = useState<PopupState>("idle")
  const [stepCount, setStepCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [flowName, setFlowName] = useState("")
  const [pendingSteps, setPendingSteps] = useState<FlowStep[]>([])

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { checkAuthAndPrompt } = await import("~/utils/auth/auth-manager")
        const { isTokenValid } = await import("~/utils/auth-storage")

        // Fast path: Check local token first
        const hasValidToken = await isTokenValid()
        if (hasValidToken) {
          setAuthStatus("authenticated")
          return
        }

        // Check with server
        const isAuthenticated = await checkAuthAndPrompt()
        setAuthStatus(isAuthenticated ? "authenticated" : "unauthenticated")
      } catch (error) {
        logError(error, { context: "popup-auth-check" })
        setAuthStatus("unauthenticated")
      }
    }

    checkAuth()
  }, [])

  const handleLoginSuccess = async () => {
    // Recheck auth status after login
    try {
      const { checkAuthAndPrompt } = await import("~/utils/auth/auth-manager")
      const isAuthenticated = await checkAuthAndPrompt()
      setAuthStatus(isAuthenticated ? "authenticated" : "unauthenticated")
    } catch (error) {
      logError(error, { context: "popup-login-success" })
      setAuthStatus("unauthenticated")
    }
  }

  const checkRecordingState = useCallback(async () => {
    try {
      // Get recording state from background script (persists across navigations)
      const response = await sendMessage({
        type: "GET_RECORDING_STATE",
      })
      if (response.success && response.data) {
        const data = response.data as {
          stepCount: number
          isRecording: boolean
          state?: string
        }
        setStepCount(data.stepCount || 0)
        if (!data.isRecording && state === "recording") {
          setState("idle")
        } else if (data.isRecording && state !== "recording") {
          setState("recording")
        }
      }
    } catch (error) {
      logError(error, { context: "check-recording-state" })
    }
  }, [state])

  // Load flows and check recording state on mount (only if authenticated)
  useEffect(() => {
    if (authStatus !== "authenticated") return

    // Check if chrome.storage is available before loading
    const checkAndLoad = async () => {
      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.local
      ) {
        // Check recording state on mount to restore UI state
        await checkRecordingState()
      } else {
        // Retry after a short delay if not ready
        setTimeout(async () => {
          if (
            typeof chrome !== "undefined" &&
            chrome.storage &&
            chrome.storage.local
          ) {
            // Check recording state after retry
            await checkRecordingState()
          }
        }, RECORDING_CONFIG.STORAGE_CHECK_RETRY_MS)
      }
    }
    checkAndLoad()
  }, [checkRecordingState, authStatus])

  // Poll for recording state (only when recording)
  useEffect(() => {
    if (state === "recording") {
      checkRecordingState() // Check immediately
      const interval = window.setInterval(() => {
        checkRecordingState()
      }, RECORDING_CONFIG.POLLING_INTERVAL_MS)
      return () => window.clearInterval(interval)
    }
    return undefined
  }, [state, checkRecordingState])

  const handleStartRecording = async () => {
    setIsLoading(true)
    try {
      // Try to get active tab - use multiple strategies
      let tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      })

      // Fallback: if no active tab, try to get the current window's tabs
      if (!tabs[0]?.id) {
        tabs = await chrome.tabs.query({ currentWindow: true })
        // Get the first tab that's not a chrome:// page
        const validTab = tabs.find(
          (t) =>
            t.id &&
            t.url &&
            !t.url.startsWith("chrome://") &&
            !t.url.startsWith("chrome-extension://")
        )
        if (validTab) {
          tabs = [validTab]
        }
      }

      if (!tabs[0] || !tabs[0].id) {
        alert("No active tab found. Please open a webpage first.")
        setIsLoading(false)
        return
      }

      // Check if tab URL is accessible
      const tab = tabs[0]
      if (
        tab.url &&
        (tab.url.startsWith("chrome://") ||
          tab.url.startsWith("chrome-extension://") ||
          tab.url.startsWith("edge://"))
      ) {
        alert(
          "Recording cannot start on this page. Please navigate to a regular website (like google.com) to start recording."
        )
        setIsLoading(false)
        return
      }

      // Ensure content script is ready
      if (!tab.id) {
        alert("Invalid tab. Please try again.")
        setIsLoading(false)
        return
      }

      // Check if content script is loaded
      const isReady = await ensureContentScriptReady(tab.id)
      if (!isReady) {
        // Content script not loaded - offer to refresh
        const shouldRefresh = window.confirm(
          "Content script not loaded.\n\n" +
            "This usually happens when:\n" +
            "• The page was loaded before installing the extension\n" +
            "• The extension was just updated\n\n" +
            "Would you like to refresh the page now?"
        )
        if (shouldRefresh && tab.id) {
          await chrome.tabs.reload(tab.id)
          // Wait for page to reload
          await new Promise((resolve) =>
            setTimeout(resolve, RECORDING_CONFIG.PAGE_RELOAD_WAIT_MS)
          )
          // Try again after reload
          const retryReady = await ensureContentScriptReady(tab.id)
          if (!retryReady) {
            alert("Please wait a moment, then click 'Start Recording' again.")
            setIsLoading(false)
            return
          }
        } else {
          alert("Please refresh the page manually, then try again.")
          setIsLoading(false)
          return
        }
      }

      // Now send the start recording message to background (which will forward to content script)
      const response = await sendMessage({
        type: "START_RECORDING",
      } as StartRecordingMessage)

      if (response.success) {
        setState("recording")
        setStepCount(0)
      } else {
        alert(`Error: ${response.error || "Failed to start recording"}`)
      }
    } catch (error) {
      logError(error)
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      if (
        errorMsg.includes("Receiving end does not exist") ||
        errorMsg.includes("Could not establish connection")
      ) {
        alert(
          "Content script not loaded. Please refresh the page and try again."
        )
      } else {
        alert("Failed to start recording. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleStopRecording = async () => {
    setIsLoading(true)
    try {
      // Send stop message - background script will return accumulated steps
      const response = await sendMessage({
        type: "STOP_RECORDING",
      })
      if (response.success && response.data) {
        const steps = (response.data as { steps: FlowStep[] }).steps
        if (steps.length > 0) {
          // Store steps and open dialog
          setPendingSteps(steps)
          setFlowName("New Flow")
          setShowSaveDialog(true)
        } else {
          alert("No steps recorded. Please record at least one step.")
          setState("idle")
        }
      } else {
        alert(response.error || "Failed to stop recording")
      }
    } catch (error) {
      logError(error)
      alert("Failed to stop recording. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveFlow = async () => {
    const trimmedName = flowName.trim()
    if (!trimmedName) {
      alert("Please enter a flow name")
      return
    }

    if (trimmedName.length > UI_CONFIG.MAX_FLOW_NAME_LENGTH) {
      alert(
        `Flow name must be ${UI_CONFIG.MAX_FLOW_NAME_LENGTH} characters or less`
      )
      return
    }

    setIsLoading(true)
    try {
      // Create local flow object (temporary, just for structure)
      const flow = await createLocalFlow(trimmedName, pendingSteps)

      // Send flow to API
      await createFlowViaAPI(flow)

      // Success! Clear local data and reset UI
      setShowSaveDialog(false)
      setFlowName("")
      setPendingSteps([])
      setState("idle")

      // Show success message (could be replaced with a toast in the future)
      // For now, just reset to idle state - user can see the dialog closed
    } catch (error) {
      logError(error, { context: "handle-save-flow" })
      const errorMessage = handleApiError(error)
      alert(errorMessage)
      // Keep dialog open on error so user can retry
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelSave = () => {
    setShowSaveDialog(false)
    setFlowName("")
    setPendingSteps([])
    setState("idle")
  }

  // Show login screen if not authenticated
  if (authStatus === "checking") {
    return (
      <div className="w-[420px] min-h-[500px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (authStatus === "unauthenticated") {
    return (
      <div className="w-[420px] min-h-[500px]">
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </div>
    )
  }

  // Authenticated - show main UI
  return (
    <div className="p-4 w-[420px] min-h-[500px] flex flex-col">
      {/* Header with title and auth status */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <h2 className="m-0 text-lg font-semibold">Navio</h2>
        <div className="shrink-0">
          <AuthStatus />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {state === "idle" && (
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleStartRecording}
              disabled={isLoading}
              size="default"
              className="w-full">
              {isLoading ? "Starting..." : "Start Recording"}
            </Button>
          </div>
        )}

        {state === "recording" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-medium">
                Recording... Step {stepCount}
              </span>
            </div>

            <Button
              onClick={handleStopRecording}
              disabled={isLoading}
              variant="destructive"
              size="default"
              className="w-full">
              {isLoading ? "Stopping..." : "Finish & Save Flow"}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Save Flow</DialogTitle>
            <DialogDescription>
              Enter a name for your flow. You can edit this later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="flow-name">Flow Name</Label>
              <Input
                id="flow-name"
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                placeholder="Enter flow name"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && flowName.trim()) {
                    handleSaveFlow()
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelSave}
              disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveFlow}
              disabled={isLoading || !flowName.trim()}>
              {isLoading ? "Saving..." : "Save Flow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Popup
