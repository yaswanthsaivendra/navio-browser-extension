/**
 * Playback functionality for content script
 * Handles flow playback with overlays and navigation
 */

import type { Flow, FlowStep } from "~/types/flows"
import { logError } from "~/utils/errors"

import { Highlight } from "./components/Highlight"
import { Tooltip } from "./components/Tooltip"

export interface PlaybackConfig {
  onStepChanged?: (stepIndex: number, step: FlowStep) => void
  onPlaybackStateChanged?: (isPlaying: boolean) => void
  onElementNotFound?: (step: FlowStep) => void
  onActionPerformed?: (step: FlowStep) => void
}

export class Playback {
  private isPlaying = false
  private currentStepIndex = 0
  private flow: Flow | null = null
  private highlight: Highlight | null = null
  private tooltip: Tooltip | null = null
  private mutationObserver: MutationObserver | null = null
  private keyboardHandler?: (event: KeyboardEvent) => void
  private config: PlaybackConfig

  constructor(config: PlaybackConfig = {}) {
    this.config = config
  }

  /**
   * Start playback with a flow
   */
  start(flow: Flow): void {
    if (this.isPlaying) {
      this.stop()
    }

    this.flow = flow
    this.isPlaying = true
    this.currentStepIndex = 0
    this.config.onPlaybackStateChanged?.(true)

    // Attach keyboard listeners
    this.attachKeyboardListeners()

    // Start with first step
    this.goToStep(0)
  }

  /**
   * Stop playback
   */
  stop(): void {
    this.isPlaying = false
    this.cleanup()
    this.config.onPlaybackStateChanged?.(false)
    this.flow = null
    this.currentStepIndex = 0
  }

  /**
   * Go to a specific step
   */
  goToStep(index: number): void {
    if (!this.flow || index < 0 || index >= this.flow.steps.length) {
      return
    }

    this.currentStepIndex = index
    const step = this.flow.steps[index]

    // Check URL match (warn if different, but continue)
    this.checkUrlMatch(step)

    // Find element
    const element = this.findElement(step.selector)

    if (element) {
      this.renderOverlays(element, step)
      this.config.onStepChanged?.(index, step)
    } else {
      // Element not found
      this.handleElementNotFound(step)
    }
  }

  /**
   * Go to next step
   * Performs the current step's action, then moves to the next step
   */
  async next(): Promise<void> {
    if (!this.flow) return
    if (this.currentStepIndex >= this.flow.steps.length) return

    const currentStep = this.flow.steps[this.currentStepIndex]

    // Perform the current step's action before moving to next
    if (currentStep) {
      await this.performStepAction(currentStep)
    }

    // Move to next step
    if (this.currentStepIndex < this.flow.steps.length - 1) {
      // Small delay to allow action to complete (e.g., page navigation, DOM updates)
      await new Promise((resolve) => setTimeout(resolve, 300))
      this.goToStep(this.currentStepIndex + 1)
    }
  }

  /**
   * Go to previous step
   */
  previous(): void {
    if (this.currentStepIndex > 0) {
      this.goToStep(this.currentStepIndex - 1)
    }
  }

  /**
   * Get current step index
   */
  getCurrentStepIndex(): number {
    return this.currentStepIndex
  }

  /**
   * Get current flow
   */
  getFlow(): Flow | null {
    return this.flow
  }

  /**
   * Check if playing
   */
  isActive(): boolean {
    return this.isPlaying
  }

  /**
   * Find element by selector
   */
  private findElement(selector: string): Element | null {
    if (!selector) return null

    try {
      // Try CSS selector first
      const element = document.querySelector(selector)
      if (element) {
        return element
      }

      // Try XPath if selector looks like XPath
      if (selector.startsWith("/") || selector.startsWith("//")) {
        const xpathResult = document.evaluate(
          selector,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        )
        return xpathResult.singleNodeValue as Element | null
      }
    } catch (error) {
      logError(error, { context: "find-element", selector })
    }

    return null
  }

  /**
   * Render highlight and tooltip overlays
   */
  private renderOverlays(element: Element, step: FlowStep): void {
    // Cleanup existing overlays
    this.cleanupOverlays()

    // Create new highlight
    this.highlight = new Highlight(element)

    // Create new tooltip
    this.tooltip = new Tooltip(element, step.explanation)

    // Auto-scroll to element
    this.scrollToElement(element)

    // Monitor for DOM changes
    this.observeElement(element)
  }

  /**
   * Scroll element into view
   */
  private scrollToElement(element: Element): void {
    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    })
  }

  /**
   * Observe element for DOM changes
   */
  private observeElement(_element: Element): void {
    // Cleanup existing observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect()
    }

    // Create new observer
    this.mutationObserver = new MutationObserver(() => {
      // Re-check if element still exists
      if (!this.flow) return

      const step = this.flow.steps[this.currentStepIndex]
      const foundElement = this.findElement(step.selector)

      if (foundElement) {
        // Update overlays if element found
        if (this.highlight) {
          this.highlight.updateElement(foundElement)
        }
        if (this.tooltip) {
          this.tooltip.updateElement(foundElement, step.explanation)
        }
      } else {
        // Element disappeared, show not found
        this.handleElementNotFound(step)
      }
    })

    // Observe document for changes
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: false,
    })
  }

  /**
   * Check if current URL matches step URL
   */
  private checkUrlMatch(step: FlowStep): void {
    const currentUrl = new URL(window.location.href)
    const stepUrl = new URL(step.url)

    // Compare pathname (ignore query params and hash for now)
    if (currentUrl.pathname !== stepUrl.pathname) {
      console.warn("[Navio Playback] URL mismatch", {
        current: currentUrl.pathname,
        expected: stepUrl.pathname,
      })
      // Continue anyway - user might have navigated manually
    }
  }

  /**
   * Handle element not found
   */
  private handleElementNotFound(step: FlowStep): void {
    // Cleanup overlays
    this.cleanupOverlays()

    // Notify callback
    this.config.onElementNotFound?.(step)

    // Show fallback message (could be a modal, but for now just log)
    console.warn("[Navio Playback] Element not found", {
      selector: step.selector,
      url: step.url,
      explanation: step.explanation,
    })
  }

  /**
   * Attach keyboard listeners
   */
  private attachKeyboardListeners(): void {
    this.keyboardHandler = (event: KeyboardEvent) => {
      if (!this.isPlaying) return

      // Only handle if not typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement)?.isContentEditable
      ) {
        return
      }

      switch (event.key) {
        case "ArrowRight":
          event.preventDefault()
          this.next().catch((error) => {
            logError(error, { context: "keyboard-next" })
          })
          break
        case "ArrowLeft":
          event.preventDefault()
          this.previous()
          break
        case "Escape":
          event.preventDefault()
          this.stop()
          break
      }
    }

    document.addEventListener("keydown", this.keyboardHandler)
  }

  /**
   * Cleanup overlays
   */
  private cleanupOverlays(): void {
    if (this.highlight) {
      this.highlight.destroy()
      this.highlight = null
    }
    if (this.tooltip) {
      this.tooltip.destroy()
      this.tooltip = null
    }
    if (this.mutationObserver) {
      this.mutationObserver.disconnect()
      this.mutationObserver = null
    }
  }

  /**
   * Perform the action for a step
   */
  private async performStepAction(step: FlowStep): Promise<void> {
    try {
      switch (step.type) {
        case "click": {
          const element = this.findElement(step.selector)
          if (element) {
            // Check if it's a dangerous action (skip if so)
            if (this.isDangerousAction(element)) {
              console.warn("[Navio Playback] Skipping dangerous action", {
                selector: step.selector,
                explanation: step.explanation,
              })
              return
            }

            // Click the element
            if (element instanceof HTMLElement) {
              element.click()
              console.warn("[Navio Playback] Clicked element", {
                selector: step.selector,
                explanation: step.explanation,
              })
              this.config.onActionPerformed?.(step)
            }
          } else {
            console.warn(
              "[Navio Playback] Element not found for click action",
              {
                selector: step.selector,
              }
            )
          }
          break
        }

        case "navigation": {
          // Navigate to the URL
          if (step.url && step.url !== window.location.href) {
            window.location.href = step.url
            console.warn("[Navio Playback] Navigating to URL", {
              url: step.url,
            })
            this.config.onActionPerformed?.(step)
          }
          break
        }

        case "input": {
          // Future: Fill input fields
          console.warn("[Navio Playback] Input action not yet implemented", {
            selector: step.selector,
          })
          break
        }

        case "visibility":
        case "manual": {
          // No action needed for these types
          break
        }

        default:
          console.warn("[Navio Playback] Unknown step type", {
            type: step.type,
          })
      }
    } catch (error) {
      logError(error, {
        context: "perform-step-action",
        stepId: step.id,
        stepType: step.type,
      })
    }
  }

  /**
   * Check if an action is dangerous (should be skipped)
   */
  private isDangerousAction(element: Element): boolean {
    if (!(element instanceof HTMLElement)) return false

    const text = element.textContent?.toLowerCase() || ""
    const dangerousKeywords = [
      "delete",
      "remove",
      "destroy",
      "clear",
      "reset",
      "cancel",
      "close",
      "logout",
      "sign out",
    ]

    // Check button text
    if (dangerousKeywords.some((keyword) => text.includes(keyword))) {
      return true
    }

    // Check aria-label
    const ariaLabel = element.getAttribute("aria-label")?.toLowerCase() || ""
    if (dangerousKeywords.some((keyword) => ariaLabel.includes(keyword))) {
      return true
    }

    // Check if it's a form submit button (be cautious)
    if (element instanceof HTMLButtonElement && element.type === "submit") {
      // Only skip if form contains dangerous keywords
      const form = element.closest("form")
      if (form) {
        const formText = form.textContent?.toLowerCase() || ""
        if (dangerousKeywords.some((keyword) => formText.includes(keyword))) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Full cleanup
   */
  private cleanup(): void {
    this.cleanupOverlays()

    // Remove keyboard listeners
    if (this.keyboardHandler) {
      document.removeEventListener("keydown", this.keyboardHandler)
      this.keyboardHandler = undefined
    }
  }
}
