/**
 * Recording functionality for content script
 * Handles click event capture and step recording
 */

import type { FlowStep } from "~/types/flows"
import { logError } from "~/utils/errors"
import {
  generateSelector,
  getElementNodeType,
  getElementText,
} from "~/utils/selectors"
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

  constructor(config: RecorderConfig = {}) {
    this.config = config
  }

  /**
   * Start recording
   */
  start(): void {
    if (this.isRecording) {
      return
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
      "", // No selector for manual steps
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
    const selectorResult = generateSelector(element)
    const elementText = getElementText(element)
    const nodeType = getElementNodeType(element)
    const url = window.location.href

    // Auto-generate explanation from element (max 100 characters)
    const explanation = this.generateStepExplanation(element, elementText)

    const step = createFlowStep(
      "click",
      selectorResult.selector,
      url,
      explanation,
      0, // Order will be set by background script
      {
        elementText,
        nodeType,
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
    // Try to use input label
    else if (element instanceof HTMLInputElement) {
      const label = this.findLabelForInput(element)
      if (label) {
        explanation = `Click ${label}`
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

    // Limit to 100 characters
    if (explanation.length > 100) {
      explanation = explanation.substring(0, 97) + "..."
    }

    return explanation
  }

  /**
   * Find label for an input element
   */
  private findLabelForInput(input: HTMLInputElement): string | null {
    // Try id -> label[for]
    if (input.id) {
      const label = document.querySelector(`label[for="${input.id}"]`)
      if (label) {
        return label.textContent?.trim() || null
      }
    }

    // Try parent label
    const parentLabel = input.closest("label")
    if (parentLabel) {
      return parentLabel.textContent?.trim() || null
    }

    // Try aria-label
    if (input.getAttribute("aria-label")) {
      return input.getAttribute("aria-label")
    }

    // Try placeholder
    if (input.placeholder) {
      return input.placeholder
    }

    return null
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stop()
  }
}
