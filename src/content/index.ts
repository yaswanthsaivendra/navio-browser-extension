// Content script - runs on web pages
// This will be used for recording and overlay functionality

import type { Message, MessageResponse } from "~/types/messages"
import { logError } from "~/utils/errors"
import { onMessage, sendMessage } from "~/utils/messaging"

import { Recorder } from "./recorder"

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
      console.warn("[Navio Content] Step captured", {
        stepId: step.id,
        explanation: step.explanation.substring(0, 50),
        url: step.url,
        order: step.order,
      })
      // Send step immediately to background script for persistence
      sendMessage({
        type: "ADD_STEP",
        step,
      })
        .then(() => {
          console.warn("[Navio Content] Step sent to background successfully", {
            stepId: step.id,
          })
        })
        .catch((error) => {
          console.warn("[Navio Content] Failed to send step to background", {
            stepId: step.id,
            error,
          })
          logError(error, {
            context: "add-step-to-background",
            stepId: step.id,
          })
        })

      // Also notify about click (for backwards compatibility)
      sendMessage({
        type: "CAPTURE_CLICK",
        element: {
          selector: step.selector,
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
      console.warn(
        "[Navio Content] Checking if recording is active on page load",
        {
          url: window.location.href,
        }
      )
      const response = await sendMessage({
        type: "GET_RECORDING_STATE",
      })
      console.warn("[Navio Content] GET_RECORDING_STATE response", {
        success: response.success,
        data: response.data,
      })
      if (response.success && response.data) {
        const data = response.data as {
          isRecording: boolean
          state: string
          stepCount?: number
        }
        console.warn("[Navio Content] Recording state check result", {
          isRecording: data.isRecording,
          state: data.state,
          stepCount: data.stepCount,
        })
        if (data.isRecording && data.state === "recording" && recorder) {
          // Auto-resume recording on this page
          recorder.start()
          console.warn("[Navio Content] Auto-resumed recording on page load", {
            url: window.location.href,
          })
        } else {
          console.warn("[Navio Content] Not resuming - recording not active", {
            isRecording: data.isRecording,
            state: data.state,
            hasRecorder: !!recorder,
          })
        }
      } else {
        console.warn("[Navio Content] GET_RECORDING_STATE failed", {
          success: response.success,
          error: response.error,
        })
      }
    } catch (error) {
      console.warn("[Navio Content] Error checking recording state", error)
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
        case "START_RECORDING":
          console.warn("[Navio Content] START_RECORDING received", {
            url: window.location.href,
          })
          recorder.start()
          console.warn("[Navio Content] Recorder started", {
            stepCount: recorder.getSteps().length,
          })
          return { success: true, data: { state: "recording" } }

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
          // Get the last step and send to background
          const steps = recorder.getSteps()
          const lastStep = steps[steps.length - 1]
          if (lastStep) {
            sendMessage({
              type: "ADD_STEP",
              step: lastStep,
            }).catch((error) => {
              logError(error, { context: "add-manual-step-to-background" })
            })
          }
          return { success: true }
        }

        case "UNDO_LAST_STEP": {
          const removedStep = recorder.undoLastStep()
          return { success: true, data: { step: removedStep } }
        }

        case "GET_RECORDING_STATE":
          return {
            success: true,
            data: {
              isRecording: recorder.getSteps().length > 0,
              stepCount: recorder.getSteps().length,
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
  console.warn("Navio extension content script loaded")
} catch (error) {
  logError(error, { context: "content-script-init" })
  // Don't mark as ready if initialization failed
}

export {}
