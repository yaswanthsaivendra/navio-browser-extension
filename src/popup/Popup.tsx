import { Eye, Trash2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import toast from "react-hot-toast"

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
import { RECORDING_CONFIG, UI_CONFIG } from "~/constants"
import type { Flow, FlowStep } from "~/types/flows"
import type {
  SaveFlowMessage,
  SaveScreenshotMessage,
  StartRecordingMessage,
} from "~/types/messages"
import { logError } from "~/utils/errors"
import { ensureContentScriptReady, sendMessage } from "~/utils/messaging"
import { createFlow, getAllFlows } from "~/utils/storage"

type PopupState = "idle" | "recording"

function Popup() {
  const [state, setState] = useState<PopupState>("idle")
  const [flows, setFlows] = useState<Flow[]>([])
  const [stepCount, setStepCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [flowName, setFlowName] = useState("")
  const [pendingSteps, setPendingSteps] = useState<FlowStep[]>([])
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null)
  const [showFlowDetails, setShowFlowDetails] = useState(false)

  const loadFlows = async () => {
    const loadedFlows = await getAllFlows()
    setFlows(loadedFlows)
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
        }, RECORDING_CONFIG.STORAGE_CHECK_RETRY_MS)
      }
    }
    checkAndLoad()
  }, [checkRecordingState])

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
        toast.error("No active tab found. Please open a webpage first.")
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
        toast.error(
          "Recording cannot start on this page. Please navigate to a regular website (like google.com) to start recording."
        )
        setIsLoading(false)
        return
      }

      // Ensure content script is ready
      if (!tab.id) {
        toast.error("Invalid tab. Please try again.")
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
            toast.error(
              "Please wait a moment, then click 'Start Recording' again."
            )
            setIsLoading(false)
            return
          }
        } else {
          toast.error("Please refresh the page manually, then try again.")
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
        toast.success("Recording started!")
      } else {
        toast.error(response.error || "Failed to start recording")
      }
    } catch (error) {
      logError(error)
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      if (
        errorMsg.includes("Receiving end does not exist") ||
        errorMsg.includes("Could not establish connection")
      ) {
        toast.error(
          "Content script not loaded. Please refresh the page and try again."
        )
      } else {
        toast.error("Failed to start recording. Please try again.")
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
          toast.error("No steps recorded. Please record at least one step.")
          setState("idle")
        }
      } else {
        toast.error(response.error || "Failed to stop recording")
      }
    } catch (error) {
      logError(error)
      toast.error("Failed to stop recording. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveFlow = async () => {
    const trimmedName = flowName.trim()
    if (!trimmedName) {
      toast.error("Please enter a flow name")
      return
    }

    if (trimmedName.length > UI_CONFIG.MAX_FLOW_NAME_LENGTH) {
      toast.error(
        `Flow name must be ${UI_CONFIG.MAX_FLOW_NAME_LENGTH} characters or less`
      )
      return
    }

    setIsLoading(true)
    try {
      const flow = await createFlow(trimmedName, pendingSteps)
      await sendMessage({
        type: "SAVE_FLOW",
        flow,
      } as SaveFlowMessage)

      // If any steps have screenshots that need IndexedDB storage, save them
      for (const step of pendingSteps) {
        if (step.meta?.screenshotIndexedDB && step.meta?.screenshotFull) {
          try {
            // Convert data URL to Blob using dataUrlToBlob utility
            const { dataUrlToBlob } = await import("~/utils/screenshot-capture")
            const blob = dataUrlToBlob(step.meta.screenshotFull)
            await sendMessage({
              type: "SAVE_SCREENSHOT",
              flowId: flow.id,
              stepId: step.id,
              screenshot: blob,
            } as SaveScreenshotMessage)
            // Clear the temporary full screenshot from meta
            delete step.meta.screenshotFull
          } catch (error) {
            logError(error, {
              context: "save-flow-screenshot",
              flowId: flow.id,
              stepId: step.id,
            })
          }
        }
      }

      await loadFlows()
      setShowSaveDialog(false)
      setFlowName("")
      setPendingSteps([])
      setState("idle")
      toast.success(`Flow "${trimmedName}" saved successfully!`)
    } catch (error) {
      logError(error)
      toast.error("Failed to save flow. Please try again.")
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

  const handleViewFlowDetails = (flow: Flow) => {
    setSelectedFlow(flow)
    setShowFlowDetails(true)
  }

  const handleDeleteFlow = async (flowId: string, flowName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${flowName}"?\n\nThis action cannot be undone.`
    )
    if (!confirmed) return

    setIsLoading(true)
    try {
      const response = await sendMessage({
        type: "DELETE_FLOW",
        flowId,
      })

      if (response.success) {
        await loadFlows()
        // Close details dialog if viewing the deleted flow
        if (selectedFlow?.id === flowId) {
          setShowFlowDetails(false)
          setSelectedFlow(null)
        }
        toast.success(`Flow "${flowName}" deleted successfully`)
      } else {
        toast.error(response.error || "Failed to delete flow")
      }
    } catch (error) {
      logError(error)
      toast.error("Failed to delete flow. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 w-[400px]">
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
                    <CardContent className="pt-0 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {flow.steps.length} step
                        {flow.steps.length !== 1 ? "s" : ""}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleViewFlowDetails(flow)}
                          disabled={isLoading}
                          size="sm"
                          variant="outline"
                          className="flex-1">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        <Button
                          onClick={() => handleDeleteFlow(flow.id, flow.name)}
                          disabled={isLoading}
                          size="sm"
                          variant="outline"
                          className="px-3 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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

      {/* Flow Details Dialog */}
      <Dialog open={showFlowDetails} onOpenChange={setShowFlowDetails}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedFlow?.name || "Flow Details"}</DialogTitle>
            <DialogDescription>View step details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedFlow && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Total Steps: {selectedFlow.steps.length}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Created:{" "}
                      {new Date(selectedFlow.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Steps:</h4>
                  {selectedFlow.steps
                    .sort((a, b) => a.order - b.order)
                    .map((step, index) => (
                      <div
                        key={step.id}
                        className="border rounded-md p-3 space-y-2 bg-muted/30">
                        {step.meta?.screenshotThumb && (
                          <img
                            src={step.meta.screenshotThumb}
                            alt={`Step ${index + 1}`}
                            className="w-full rounded border mb-2"
                            style={{ maxHeight: "120px", objectFit: "contain" }}
                          />
                        )}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-primary">
                                Step {index + 1}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded bg-background border text-muted-foreground">
                                {step.type}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-foreground">
                              {step.explanation}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1.5 pt-2 border-t">
                          <div>
                            <span className="text-xs font-medium text-muted-foreground">
                              URL:
                            </span>
                            <p className="text-xs text-muted-foreground mt-1 break-all">
                              {step.url}
                            </p>
                          </div>
                          {step.meta?.elementText && (
                            <div>
                              <span className="text-xs font-medium text-muted-foreground">
                                Element Text:
                              </span>
                              <p className="text-xs text-muted-foreground mt-1">
                                {step.meta.elementText}
                              </p>
                            </div>
                          )}
                          {step.meta?.nodeType && (
                            <div>
                              <span className="text-xs font-medium text-muted-foreground">
                                Node Type:
                              </span>
                              <p className="text-xs text-muted-foreground mt-1">
                                {step.meta.nodeType}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            {selectedFlow && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  handleDeleteFlow(selectedFlow.id, selectedFlow.name)
                }}
                disabled={isLoading}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Flow
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowFlowDetails(false)
                setSelectedFlow(null)
              }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Popup
