import { useEffect, useState } from "react"

import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
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
import type { Flow, FlowStep } from "~/types/flows"
import { logError } from "~/utils/errors"
import { ensureContentScriptReady, sendMessage } from "~/utils/messaging"
import { createFlow, getAllFlows } from "~/utils/storage"

type PopupState = "idle" | "recording" | "playback"

function Popup() {
  const [state, setState] = useState<PopupState>("idle")
  const [flows, setFlows] = useState<Flow[]>([])
  const [stepCount, setStepCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [flowName, setFlowName] = useState("")
  const [pendingSteps, setPendingSteps] = useState<FlowStep[]>([])

  // Load flows and check recording state on mount
  useEffect(() => {
    // Check if chrome.storage is available before loading
    const checkAndLoad = async () => {
      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.local
      ) {
        await loadFlows()
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
            await loadFlows()
            // Check recording state after retry
            await checkRecordingState()
          }
        }, 200)
      }
    }
    checkAndLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Poll for recording state (only when recording)
  useEffect(() => {
    if (state === "recording") {
      checkRecordingState() // Check immediately
      const interval = window.setInterval(() => {
        checkRecordingState()
      }, 500)
      return () => window.clearInterval(interval)
    }
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const loadFlows = async () => {
    const loadedFlows = await getAllFlows()
    setFlows(loadedFlows)
  }

  const checkRecordingState = async () => {
    try {
      // Get recording state from background script (persists across navigations)
      const response = await sendMessage({
        type: "GET_RECORDING_STATE",
      })
      console.warn("[Navio Popup] checkRecordingState response", {
        success: response.success,
        data: response.data,
        currentState: state,
      })
      if (response.success && response.data) {
        const data = response.data as {
          stepCount: number
          isRecording: boolean
          state?: string
        }
        setStepCount(data.stepCount || 0)
        // Update state if recording stopped
        if (!data.isRecording && state === "recording") {
          console.warn(
            "[Navio Popup] Recording stopped, setting state to idle",
            {
              wasRecording: state,
              isRecording: data.isRecording,
            }
          )
          setState("idle")
        } else if (data.isRecording && state !== "recording") {
          console.warn(
            "[Navio Popup] Recording active but state was not recording, updating",
            {
              wasState: state,
              isRecording: data.isRecording,
            }
          )
          setState("recording")
        }
      } else {
        console.warn("[Navio Popup] checkRecordingState failed", {
          success: response.success,
          error: response.error,
        })
      }
    } catch (error) {
      console.warn("[Navio Popup] checkRecordingState error", error)
      logError(error, { context: "check-recording-state" })
    }
  }

  const handleStartRecording = async () => {
    setIsLoading(true)
    try {
      // First check if we have an active tab
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      })
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
          await new Promise((resolve) => setTimeout(resolve, 1500))
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
      console.warn("[Navio Popup] Sending START_RECORDING to background", {
        tabId: tab.id,
      })
      const response = await sendMessage({
        type: "START_RECORDING",
      })

      console.warn("[Navio Popup] START_RECORDING response", {
        success: response.success,
        data: response.data,
        error: response.error,
      })

      if (response.success) {
        console.warn(
          "[Navio Popup] Recording started successfully, setting state to recording"
        )
        setState("recording")
        setStepCount(0)
      } else {
        // Show user-friendly error
        const errorMsg = response.error || "Failed to start recording"
        console.warn("[Navio Popup] Failed to start recording", {
          error: errorMsg,
        })
        alert(`Error: ${errorMsg}`)
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
        const steps = (response.data as { steps: Flow["steps"] }).steps
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
    if (!flowName.trim()) {
      alert("Please enter a flow name")
      return
    }

    setIsLoading(true)
    try {
      await createFlow(flowName.trim(), pendingSteps)
      await loadFlows()
      setShowSaveDialog(false)
      setFlowName("")
      setPendingSteps([])
      setState("idle")
    } catch (error) {
      logError(error)
      alert("Failed to save flow. Please try again.")
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

  return (
    <div className="p-4 w-[360px]">
      <h2 className="m-0 mb-4 text-lg font-semibold">Navio</h2>

      {state === "idle" && (
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleStartRecording}
            disabled={isLoading}
            size="default"
            className="w-full">
            {isLoading ? "Starting..." : "Start Recording"}
          </Button>

          {flows.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2 text-muted-foreground">
                Saved Flows ({flows.length})
              </h3>
              <div className="flex flex-col gap-2">
                {flows.map((flow) => (
                  <Card key={flow.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{flow.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-muted-foreground">
                        {flow.steps.length} step
                        {flow.steps.length !== 1 ? "s" : ""}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
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
