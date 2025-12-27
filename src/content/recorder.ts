/**
 * Recording functionality for content script
 * Handles click event capture and step recording
 */

import type { FlowStep } from "~/types/flows"
import type { CaptureScreenshotMessage } from "~/types/messages"
import { logError } from "~/utils/errors"
import { logger } from "~/utils/logger"
import { sendMessage } from "~/utils/messaging"
import { captureAndProcessScreenshot } from "~/utils/screenshot-processing"
import { getElementNodeType, getElementText } from "~/utils/selectors"
import { createFlowStep } from "~/utils/storage"

export interface RecorderConfig {
  onStepCaptured?: (step: FlowStep) => Promise<void> | void
  onRecordingStateChanged?: (isRecording: boolean) => void
}

export class Recorder {
  private isRecording = false
  private isPaused = false
  private clickHandler?: (event: MouseEvent) => void
  private config: RecorderConfig
  private currentTabId?: number
  private beforeUnloadHandler?: () => void

  constructor(config: RecorderConfig = {}) {
    this.config = config
    // Set up cleanup on page unload
    if (typeof window !== "undefined") {
      this.beforeUnloadHandler = this.handleBeforeUnload.bind(this)
      window.addEventListener("beforeunload", this.beforeUnloadHandler)
    }
  }

  /**
   * Start recording
   * @param tabId - Optional tab ID passed from background script
   */
  async start(tabId?: number): Promise<void> {
    if (this.isRecording) {
      return
    }

    // Store tab ID if provided (content scripts can't use chrome.tabs API)
    if (tabId) {
      this.currentTabId = tabId
    } else {
      logger.warn("No tab ID provided - screenshots may not work")
    }

    this.isRecording = true
    this.isPaused = false
    this.attachClickListener()
    this.config.onRecordingStateChanged?.(true)
  }

  /**
   * Stop recording
   */
  stop(): void {
    this.isRecording = false
    this.isPaused = false
    this.detachClickListener()
    this.config.onRecordingStateChanged?.(false)
  }

  /**
   * Pause recording
   */
  pause(): void {
    if (!this.isRecording) return
    this.isPaused = true
    this.detachClickListener()
  }

  /**
   * Resume recording
   */
  resume(): void {
    if (!this.isRecording) return
    this.isPaused = false
    this.attachClickListener()
  }

  /**
   * Add a manual step
   * Note: Order is managed by background script
   */
  addManualStep(explanation: string): void {
    if (!this.isRecording) return

    const step = createFlowStep(
      "manual",
      window.location.href,
      explanation,
      0 // Order will be set by background
    )

    this.config.onStepCaptured?.(step)
  }

  /**
   * Attach click event listener
   */
  private attachClickListener(): void {
    if (this.clickHandler) {
      return // Already attached
    }

    this.clickHandler = async (event: MouseEvent) => {
      if (!this.isRecording || this.isPaused) return

      const target = event.target as Element
      if (!target) return

      // Ignore clicks on extension UI elements
      if (target.closest("[data-navio-extension]")) {
        return
      }

      // Ignore password fields
      if (target instanceof HTMLInputElement && target.type === "password") {
        return
      }

      try {
        await this.captureClick(target, event)
      } catch (error) {
        logError(error, { context: "capture-click" })
      }
    }

    document.addEventListener("click", this.clickHandler, true) // Use capture phase
  }

  /**
   * Detach click event listener
   */
  private detachClickListener(): void {
    if (this.clickHandler) {
      document.removeEventListener("click", this.clickHandler, true)
      this.clickHandler = undefined
    }
  }

  /**
   * Capture a click event and create a step
   */
  private async captureClick(
    element: Element,
    _event: MouseEvent
  ): Promise<void> {
    const elementText = getElementText(element)
    const nodeType = getElementNodeType(element)
    const url = window.location.href

    // Auto-generate explanation from element (max 100 characters)
    const explanation = this.generateStepExplanation(element, elementText)

    // Always capture screenshot (screenshot-based recording is the only mode)
    let screenshotData:
      | {
          screenshotThumb?: string
          screenshotFull?: string
          screenshotIndexedDB?: boolean
        }
      | undefined

    // Use stored tab ID (content scripts can't use chrome.tabs API)
    const tabId = this.currentTabId

    if (tabId) {
      try {
        // Request raw screenshot from background script (content scripts can't use chrome.tabs API)
        const response = await sendMessage({
          type: "CAPTURE_SCREENSHOT",
          tabId,
        } as CaptureScreenshotMessage)

        if (response.success && response.data) {
          const data = response.data as { rawDataUrl: string }
          // Process screenshot in content script (has DOM access for Image/Canvas)
          const screenshot = await captureAndProcessScreenshot(data.rawDataUrl)
          screenshotData = {
            screenshotThumb: screenshot.thumbnail,
            screenshotFull: screenshot.full,
            screenshotIndexedDB: screenshot.indexedDB,
          }

          // Note: If screenshot.indexedDB is true, the full screenshot will be stored
          // in IndexedDB when the flow is saved. For now, we store the full data URL
          // temporarily in meta if it's available (for screenshots <200KB, full is included)
        } else {
          logger.warn("Screenshot capture failed", {
            error: response.error,
            tabId,
            url,
          })
        }
      } catch (error) {
        logError(error, { context: "capture-click-screenshot", tabId })
        logger.warn("Failed to capture screenshot", { error, tabId, url })
        // Continue without screenshot if capture fails
      }
    } else {
      logger.warn("No tab ID available for screenshot capture", { url })
    }

    const step = createFlowStep(
      "click",
      url,
      explanation,
      0, // Order will be set by background script
      {
        elementText,
        nodeType,
        ...screenshotData,
      }
    )

    // Forward to background immediately (no local storage)
    const result = this.config.onStepCaptured?.(step)
    if (result instanceof Promise) {
      await result
    }
  }

  /**
   * Generate explanation for a step (max 100 characters)
   */
  private generateStepExplanation(element: Element, text: string): string {
    let explanation = ""

    // Try to use button text
    if (element instanceof HTMLButtonElement || element.tagName === "BUTTON") {
      explanation = text ? `Click ${text}` : "Click button"
    }
    // Try to use link text
    else if (element instanceof HTMLAnchorElement || element.tagName === "A") {
      explanation = text ? `Click ${text}` : "Click link"
    }
    // Try to use input placeholder or type
    else if (element instanceof HTMLInputElement) {
      if (element.placeholder) {
        explanation = `Click ${element.placeholder}`
      } else if (element.type) {
        explanation = `Click ${element.type} input`
      } else {
        explanation = "Click input"
      }
    }
    // Use element text if available
    else if (text) {
      explanation = `Click ${text}`
    }
    // Fallback to element type
    else {
      explanation = `Click ${element.tagName.toLowerCase()}`
    }

    // Limit to 200 characters (per UI_CONFIG.MAX_EXPLANATION_LENGTH)
    const MAX_LENGTH = 200
    if (explanation.length > MAX_LENGTH) {
      explanation = explanation.substring(0, MAX_LENGTH - 3) + "..."
    }

    return explanation
  }

  /**
   * Handle page unload - cleanup resources
   */
  private handleBeforeUnload(): void {
    this.destroy()
  }

  /**
   * Cleanup all resources
   */
  destroy(): void {
    this.stop()

    // Remove beforeunload listener
    if (typeof window !== "undefined" && this.beforeUnloadHandler) {
      window.removeEventListener("beforeunload", this.beforeUnloadHandler)
      this.beforeUnloadHandler = undefined
    }
  }
}
