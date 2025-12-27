// Content script - runs on web pages
// This will be used for recording and overlay functionality

import type {
  Message,
  MessageResponse,
  StartRecordingMessage,
} from "~/types/messages"
import { logError } from "~/utils/errors"
import { onMessage, sendMessage } from "~/utils/messaging"

import { Recorder } from "./recorder"

import "./components/styles.css"

// Readiness marker - indicates content script is fully loaded and ready
declare global {
  interface Window {
    __NAVIO_CONTENT_SCRIPT_READY__?: boolean
  }
}

// Mark content script as ready
window.__NAVIO_CONTENT_SCRIPT_READY__ = false

// Initialize recorder
let recorder: Recorder | null = null

// Initialize content script
try {
  // Create recorder instance
  recorder = new Recorder({
    onStepCaptured: async (step) => {
      // Send step immediately to background script for persistence
      sendMessage({
        type: "ADD_STEP",
        step,
      }).catch((error) => {
        logError(error, {
          context: "add-step-to-background",
          stepId: step.id,
        })
      })

      // Also notify about click (for backwards compatibility)
      sendMessage({
        type: "CAPTURE_CLICK",
        element: {
          url: step.url,
          text: step.meta?.elementText,
          nodeType: step.meta?.nodeType,
        },
      }).catch((error) => {
        logError(error, { context: "notify-step-captured" })
      })
    },
  })

  // Check if recording is active and auto-resume
  async function checkAndResumeRecording() {
    try {
      const response = await sendMessage({
        type: "GET_RECORDING_STATE",
      })
      if (response.success && response.data) {
        const data = response.data as {
          isRecording: boolean
          state: string
          stepCount?: number
          tabId?: number
        }
        if (data.isRecording && data.state === "recording" && recorder) {
          // Auto-resume recording on this page with tabId from session
          recorder.start(data.tabId)
        }
      }
    } catch (error) {
      logError(error, { context: "check-and-resume-recording" })
    }
  }

  // Check on load
  checkAndResumeRecording()

  // Set up message listener
  onMessage(async (message: Message): Promise<MessageResponse> => {
    if (!recorder) {
      return { success: false, error: "Recorder not initialized" }
    }

    try {
      switch (message.type) {
        case "START_RECORDING": {
          const startMessage = message as StartRecordingMessage
          await recorder.start(startMessage.tabId)
          return { success: true, data: { state: "recording" } }
        }

        case "STOP_RECORDING": {
          const steps = recorder.stop()
          return { success: true, data: { steps } }
        }

        case "PAUSE_RECORDING":
          recorder.pause()
          return { success: true, data: { state: "paused" } }

        case "RESUME_RECORDING":
          recorder.resume()
          return { success: true, data: { state: "recording" } }

        case "ADD_MANUAL_STEP": {
          recorder.addManualStep(message.step.explanation || "")
          return { success: true }
        }

        case "UNDO_LAST_STEP": {
          // Undo is now handled by background script
          return { success: true }
        }

        case "GET_RECORDING_STATE":
          return {
            success: true,
            data: {
              isRecording: recorder ? true : false,
              stepCount: 0, // Background manages step count now
            },
          }

        default:
          return { success: false, error: "Unknown message type" }
      }
    } catch (error) {
      logError(error, { context: "message-handler", message: message.type })
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  })

  // Mark as ready after successful initialization
  window.__NAVIO_CONTENT_SCRIPT_READY__ = true
} catch (error) {
  logError(error, { context: "content-script-init" })
  // Don't mark as ready if initialization failed
}

export {}
