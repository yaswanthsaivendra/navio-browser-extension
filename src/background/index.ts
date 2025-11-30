// Background service worker
import type { FlowStep } from "~/types/flows"
import type { Message, MessageResponse } from "~/types/messages"
import type { RecordingSession } from "~/types/recording"
import { logError } from "~/utils/errors"
import { logger } from "~/utils/logger"
import { onMessage } from "~/utils/messaging"
import {
  deleteFlow,
  exportFlowToJSON,
  getAllFlows,
  getFlowById,
  importFlowFromJSON,
  saveFlow,
} from "~/utils/storage"

logger.info("Background script loaded")

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
      logger.debug("Saved recording session", {
        state: session.state,
        stepCount: session.steps.length,
        tabId: session.tabId,
      })
    } else {
      await chrome.storage.local.remove(RECORDING_SESSION_KEY)
      logger.debug("Cleared recording session")
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
      logger.debug("Loaded recording session from storage", {
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
      logger.debug("Restored recording session on startup")
    }
  })
  .catch((error) => {
    logError(error, { context: "restore-session-on-startup" })
  })

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    logger.info("Extension installed")
    // Initialize default storage, request permissions, etc.
  } else if (details.reason === "update") {
    logger.info("Extension updated", {
      previousVersion: details.previousVersion,
    })
  }
})

// Handle errors
chrome.runtime.onStartup.addListener(() => {
  logger.info("Extension started")
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

        logger.debug("START_RECORDING - Created session", {
          tabId,
          sessionState: recordingSession.state,
        })

        // Save session to storage
        await saveRecordingSession(recordingSession)

        // Forward to content script to start local recording
        try {
          logger.debug("Forwarding START_RECORDING to content script", {
            tabId,
          })
          const response = await chrome.tabs.sendMessage(tabId, message)
          logger.debug("Content script response", {
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
          logger.debug("Content script not ready, but session saved", { tabId })
          return {
            success: true, // Return success so popup doesn't show error
            data: { state: "recording" },
          }
        }
      }

      case "STOP_RECORDING": {
        // Get tab ID
        const tabId = sender.tab?.id || recordingSession?.tabId
        if (!tabId) {
          return { success: false, error: "No active tab" }
        }

        // Check if we have a recording session
        if (!recordingSession) {
          return { success: false, error: "No active recording session" }
        }

        // Tell content script to stop (best effort, don't wait for response)
        try {
          await chrome.tabs.sendMessage(tabId, message)
        } catch {
          // Content script might not be available, that's ok
          logger.debug("Content script not available during STOP_RECORDING")
        }

        // Return steps from background (single source of truth)
        const steps = [...recordingSession.steps]
        recordingSession = null
        await saveRecordingSession(null)

        logger.debug("STOP_RECORDING - Returned steps", {
          stepCount: steps.length,
        })

        return { success: true, data: { steps } }
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
          logger.debug("ADD_STEP - Added step", {
            stepId: step.id,
            explanation: step.explanation.substring(0, 50),
            order: step.order,
            totalSteps: recordingSession.steps.length,
          })
          // Save session after adding step
          await saveRecordingSession(recordingSession)
          return { success: true }
        }
        logger.debug("ADD_STEP - No active session", {
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
          logger.debug("GET_RECORDING_STATE - Session exists", state)
          return {
            success: true,
            data: state,
          }
        }
        // Try to restore from storage if not in memory
        const restoredSession = await loadRecordingSession()
        if (restoredSession) {
          recordingSession = restoredSession
          logger.debug("GET_RECORDING_STATE - Restored from storage", {
            isRecording: restoredSession.state === "recording",
            stepCount: restoredSession.steps.length,
            state: restoredSession.state,
          })
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
        logger.debug(
          "GET_RECORDING_STATE - No session, checking content script",
          {
            tabId,
          }
        )
        if (tabId) {
          try {
            const response = await chrome.tabs.sendMessage(tabId, message)
            return response as MessageResponse
          } catch {
            logger.debug(
              "GET_RECORDING_STATE - Content script not available, returning idle"
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
        logger.debug("GET_RECORDING_STATE - No session, no tab, returning idle")
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
          logger.debug("Updated session state", {
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
            logger.debug("UNDO_LAST_STEP - Removed step", {
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
      case "START_PLAYBACK": {
        // Get active tab (popup doesn't have sender.tab)
        let tabId = sender.tab?.id
        if (!tabId) {
          const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          })
          if (!tabs[0]?.id) {
            // Fallback: try to get any tab in current window
            const allTabs = await chrome.tabs.query({ currentWindow: true })
            const validTab = allTabs.find(
              (t) =>
                t.id &&
                t.url &&
                !t.url.startsWith("chrome://") &&
                !t.url.startsWith("chrome-extension://")
            )
            tabId = validTab?.id
          } else {
            tabId = tabs[0].id
          }
        }

        if (!tabId) {
          logger.error("No active tab found for START_PLAYBACK")
          return {
            success: false,
            error: "No active tab found. Please open a webpage first.",
          }
        }

        try {
          const response = await chrome.tabs.sendMessage(tabId, message)
          return response as MessageResponse
        } catch (error) {
          logError(error, {
            context: "start-playback",
            message: message.type,
            tabId,
          })
          return {
            success: false,
            error: "Content script not ready. Please refresh the page.",
          }
        }
      }

      case "STOP_PLAYBACK":
      case "NEXT_STEP":
      case "PREVIOUS_STEP":
      case "JUMP_TO_STEP":
      case "GET_PLAYBACK_STATE": {
        // Get active tab (popup doesn't have sender.tab)
        let tabId = sender.tab?.id
        if (!tabId) {
          const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          })
          if (!tabs[0]?.id) {
            // Fallback: try to get any tab in current window
            const allTabs = await chrome.tabs.query({ currentWindow: true })
            const validTab = allTabs.find(
              (t) =>
                t.id &&
                t.url &&
                !t.url.startsWith("chrome://") &&
                !t.url.startsWith("chrome-extension://")
            )
            tabId = validTab?.id
          } else {
            tabId = tabs[0].id
          }
        }

        if (!tabId) {
          return { success: false, error: "No active tab" }
        }

        try {
          const response = await chrome.tabs.sendMessage(tabId, message)
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
