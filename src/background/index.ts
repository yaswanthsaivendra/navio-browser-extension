// Background service worker
import type { FlowStep } from "~/types/flows"
import type { Message, MessageResponse } from "~/types/messages"
import type { RecordingSession } from "~/types/recording"
import { logError } from "~/utils/errors"
import { onMessage } from "~/utils/messaging"
import {
  deleteFlow,
  exportFlowToJSON,
  getAllFlows,
  getFlowById,
  importFlowFromJSON,
  saveFlow,
} from "~/utils/storage"

console.warn("[Navio Background] Background script loaded")

// Recording session state (persists across page navigations)
let recordingSession: RecordingSession | null = null

const RECORDING_SESSION_KEY = "navio_recording_session"

/**
 * Save recording session to storage
 */
async function saveRecordingSession(
  session: RecordingSession | null
): Promise<void> {
  try {
    if (session) {
      await chrome.storage.local.set({ [RECORDING_SESSION_KEY]: session })
      console.warn("[Navio Background] Saved recording session", {
        state: session.state,
        stepCount: session.steps.length,
        tabId: session.tabId,
      })
    } else {
      await chrome.storage.local.remove(RECORDING_SESSION_KEY)
      console.warn("[Navio Background] Cleared recording session")
    }
  } catch (error) {
    logError(error, { context: "save-recording-session" })
  }
}

/**
 * Load recording session from storage
 */
async function loadRecordingSession(): Promise<RecordingSession | null> {
  try {
    const result = await chrome.storage.local.get(RECORDING_SESSION_KEY)
    const session = result[RECORDING_SESSION_KEY] as
      | RecordingSession
      | undefined
    if (session) {
      console.warn("[Navio Background] Loaded recording session from storage", {
        state: session.state,
        stepCount: session.steps.length,
        tabId: session.tabId,
      })
      return session
    }
    return null
  } catch (error) {
    logError(error, { context: "load-recording-session" })
    return null
  }
}

// Restore recording session on startup
loadRecordingSession()
  .then((session) => {
    if (session) {
      recordingSession = session
      console.warn("[Navio Background] Restored recording session on startup")
    }
  })
  .catch((error) => {
    logError(error, { context: "restore-session-on-startup" })
  })

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.warn("Navio extension installed")
    // Initialize default storage, request permissions, etc.
  } else if (details.reason === "update") {
    console.warn("Navio extension updated", details.previousVersion)
  }
})

// Handle errors
chrome.runtime.onStartup.addListener(() => {
  console.warn("Navio extension started")
})

// Error handling for unhandled errors
self.addEventListener("error", (event) => {
  logError(event.error || new Error(String(event.message)), {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  })
})

self.addEventListener("unhandledrejection", (event) => {
  logError(event.reason, { type: "unhandledrejection" })
})

// Message handler for popup and content scripts
onMessage(async (message: Message, sender): Promise<MessageResponse> => {
  try {
    switch (message.type) {
      // Flow management
      case "GET_FLOWS": {
        const flows = await getAllFlows()
        return { success: true, data: flows }
      }

      case "SAVE_FLOW": {
        const saved = await saveFlow(message.flow)
        return { success: saved, data: message.flow }
      }

      case "DELETE_FLOW": {
        const deleted = await deleteFlow(message.flowId)
        return { success: deleted }
      }

      case "EXPORT_FLOW": {
        const flow = await getFlowById(message.flowId)
        if (!flow) {
          return { success: false, error: "Flow not found" }
        }
        const json = exportFlowToJSON(flow)
        return { success: true, data: json }
      }

      case "IMPORT_FLOW": {
        const flow = importFlowFromJSON(message.flow as unknown as string)
        if (!flow) {
          return { success: false, error: "Invalid flow format" }
        }
        const saved = await saveFlow(flow)
        return { success: saved, data: flow }
      }

      // Recording session management (handled in background)
      case "START_RECORDING": {
        // Initialize recording session in background
        // Get active tab ID (popup doesn't have sender.tab, so we need to query)
        let tabId = sender.tab?.id
        if (!tabId) {
          // If no tab from sender (e.g., from popup), get active tab
          const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          })
          tabId = tabs[0]?.id
        }

        if (!tabId) {
          return { success: false, error: "No active tab" }
        }

        recordingSession = {
          state: "recording",
          steps: [],
          currentStepIndex: 0,
          startTime: Date.now(),
          tabId,
        }

        console.warn("[Navio Background] START_RECORDING - Created session", {
          tabId,
          sessionState: recordingSession.state,
        })

        // Save session to storage
        await saveRecordingSession(recordingSession)

        // Forward to content script to start local recording
        try {
          console.warn(
            "[Navio Background] Forwarding START_RECORDING to content script",
            { tabId }
          )
          const response = await chrome.tabs.sendMessage(tabId, message)
          console.warn("[Navio Background] Content script response", {
            success: response.success,
          })
          return response as MessageResponse
        } catch (error) {
          logError(error, {
            context: "start-recording",
            message: message.type,
            tabId,
          })
          // Even if content script fails, keep the session (it will auto-resume on next page)
          console.warn(
            "[Navio Background] Content script not ready, but session saved",
            { tabId }
          )
          return {
            success: true, // Return success so popup doesn't show error
            data: { state: "recording" },
          }
        }
      }

      case "STOP_RECORDING": {
        // Get final steps from content script and return them
        const tabId = sender.tab?.id || recordingSession?.tabId
        if (!tabId) {
          return { success: false, error: "No active tab" }
        }

        try {
          const response = await chrome.tabs.sendMessage(tabId, message)
          if (response.success && response.data) {
            // Merge any final steps from content script with background steps
            const contentSteps = (response.data as { steps: FlowStep[] }).steps
            if (recordingSession) {
              // Combine steps (background has accumulated steps, content might have latest)
              const allSteps = [...recordingSession.steps, ...contentSteps]
              // Remove duplicates by ID
              const uniqueSteps = Array.from(
                new Map(allSteps.map((step) => [step.id, step])).values()
              )
              recordingSession = null // Clear session
              await saveRecordingSession(null) // Clear from storage
              console.warn(
                "[Navio Background] STOP_RECORDING - Returned steps",
                { stepCount: uniqueSteps.length }
              )
              return { success: true, data: { steps: uniqueSteps } }
            }
            recordingSession = null
            await saveRecordingSession(null)
            return response
          }
          // If content script failed, return background steps
          if (recordingSession) {
            const steps = [...recordingSession.steps]
            recordingSession = null
            await saveRecordingSession(null)
            console.warn(
              "[Navio Background] STOP_RECORDING - Content script failed, returned background steps",
              {
                stepCount: steps.length,
              }
            )
            return { success: true, data: { steps } }
          }
          return response
        } catch (error) {
          // If content script not available, return background steps
          if (recordingSession) {
            const steps = [...recordingSession.steps]
            recordingSession = null
            await saveRecordingSession(null)
            console.warn(
              "[Navio Background] STOP_RECORDING - Exception, returned background steps",
              {
                stepCount: steps.length,
              }
            )
            return { success: true, data: { steps } }
          }
          logError(error, { context: "stop-recording", message: message.type })
          return {
            success: false,
            error: "Failed to stop recording",
          }
        }
      }

      case "CAPTURE_CLICK": {
        // Store step in background session immediately
        if (recordingSession && recordingSession.state === "recording") {
          // The step will be created by content script, but we'll store it here
          // For now, just acknowledge - step will come via ADD_STEP message
          return { success: true }
        }
        return { success: false, error: "No active recording session" }
      }

      case "ADD_STEP": {
        // Add step to background recording session
        if (
          recordingSession &&
          recordingSession.state === "recording" &&
          message.step
        ) {
          const step = message.step as FlowStep
          step.order = recordingSession.steps.length
          recordingSession.steps.push(step)
          recordingSession.currentStepIndex = recordingSession.steps.length - 1
          console.warn("[Navio Background] ADD_STEP - Added step", {
            stepId: step.id,
            explanation: step.explanation.substring(0, 50),
            order: step.order,
            totalSteps: recordingSession.steps.length,
          })
          // Save session after adding step
          await saveRecordingSession(recordingSession)
          return { success: true }
        }
        console.warn("[Navio Background] ADD_STEP - No active session", {
          hasSession: !!recordingSession,
          sessionState: recordingSession?.state,
        })
        return { success: false, error: "No active recording session" }
      }

      case "GET_RECORDING_STATE": {
        // Return recording state from background session
        if (recordingSession) {
          const state = {
            isRecording: recordingSession.state === "recording",
            stepCount: recordingSession.steps.length,
            state: recordingSession.state,
          }
          console.warn(
            "[Navio Background] GET_RECORDING_STATE - Session exists",
            state
          )
          return {
            success: true,
            data: state,
          }
        }
        // Try to restore from storage if not in memory
        const restoredSession = await loadRecordingSession()
        if (restoredSession) {
          recordingSession = restoredSession
          console.warn(
            "[Navio Background] GET_RECORDING_STATE - Restored from storage",
            {
              isRecording: restoredSession.state === "recording",
              stepCount: restoredSession.steps.length,
              state: restoredSession.state,
            }
          )
          return {
            success: true,
            data: {
              isRecording: restoredSession.state === "recording",
              stepCount: restoredSession.steps.length,
              state: restoredSession.state,
            },
          }
        }
        // Fallback: check content script
        const tabId = sender.tab?.id
        console.warn(
          "[Navio Background] GET_RECORDING_STATE - No session, checking content script",
          { tabId }
        )
        if (tabId) {
          try {
            const response = await chrome.tabs.sendMessage(tabId, message)
            return response as MessageResponse
          } catch {
            console.warn(
              "[Navio Background] GET_RECORDING_STATE - Content script not available, returning idle"
            )
            return {
              success: true,
              data: {
                isRecording: false,
                stepCount: 0,
                state: "idle",
              },
            }
          }
        }
        console.warn(
          "[Navio Background] GET_RECORDING_STATE - No session, no tab, returning idle"
        )
        return {
          success: true,
          data: {
            isRecording: false,
            stepCount: 0,
            state: "idle",
          },
        }
      }

      case "PAUSE_RECORDING":
      case "RESUME_RECORDING": {
        // Update session state in background
        if (recordingSession) {
          recordingSession.state =
            message.type === "PAUSE_RECORDING" ? "paused" : "recording"
          await saveRecordingSession(recordingSession)
          console.warn("[Navio Background] Updated session state", {
            newState: recordingSession.state,
            stepCount: recordingSession.steps.length,
          })
        }
        // Forward to content script
        const tabId = sender.tab?.id || recordingSession?.tabId
        if (!tabId) {
          return { success: false, error: "No active tab" }
        }
        try {
          const response = await chrome.tabs.sendMessage(tabId, message)
          return response as MessageResponse
        } catch (error) {
          logError(error, {
            context: "pause-resume-recording",
            message: message.type,
          })
          return {
            success: false,
            error: "Content script not ready",
          }
        }
      }

      case "ADD_MANUAL_STEP":
      case "UNDO_LAST_STEP": {
        // Forward to content script, then update background session
        const tabId = sender.tab?.id || recordingSession?.tabId
        if (!tabId) {
          return { success: false, error: "No active tab" }
        }
        try {
          const response = await chrome.tabs.sendMessage(tabId, message)
          // If successful and it's undo, remove from background session
          if (
            response.success &&
            message.type === "UNDO_LAST_STEP" &&
            recordingSession
          ) {
            recordingSession.steps.pop()
            recordingSession.currentStepIndex = Math.max(
              0,
              recordingSession.steps.length - 1
            )
            await saveRecordingSession(recordingSession)
            console.warn("[Navio Background] UNDO_LAST_STEP - Removed step", {
              remainingSteps: recordingSession.steps.length,
            })
          }
          return response as MessageResponse
        } catch (error) {
          logError(error, { context: "manual-step", message: message.type })
          return {
            success: false,
            error: "Content script not ready",
          }
        }
      }

      // Playback - forward to content script
      case "START_PLAYBACK":
      case "STOP_PLAYBACK":
      case "NEXT_STEP":
      case "PREVIOUS_STEP":
      case "JUMP_TO_STEP":
      case "GET_PLAYBACK_STATE": {
        // Forward to active tab's content script
        if (!sender.tab?.id) {
          return { success: false, error: "No active tab" }
        }

        try {
          const response = await chrome.tabs.sendMessage(sender.tab.id, message)
          return response as MessageResponse
        } catch (error) {
          logError(error, { context: "forward-message", message: message.type })
          return {
            success: false,
            error: "Content script not ready. Please refresh the page.",
          }
        }
      }

      default:
        return { success: false, error: "Unknown message type" }
    }
  } catch (error) {
    logError(error, {
      context: "background-message-handler",
      message: message.type,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
})
