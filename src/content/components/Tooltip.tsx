/**
 * Tooltip overlay component
 * Shows step explanation next to the target element
 */

export class Tooltip {
  private container: HTMLDivElement | null = null
  private shadowRoot: ShadowRoot | null = null
  private updateFrame: number | null = null

  constructor(
    private element: Element,
    private explanation: string
  ) {
    this.createTooltip()
  }

  private createTooltip(): void {
    // Create container
    this.container = document.createElement("div")
    this.container.setAttribute("data-navio-tooltip", "true")
    this.container.style.cssText = `
            position: absolute;
            pointer-events: none;
            z-index: 9999;
            max-width: 320px;
            opacity: 0;
            transition: opacity 0.15s ease-out;
        `

    // Create shadow root for style isolation
    this.shadowRoot = this.container.attachShadow({ mode: "closed" })

    // Add styles
    const style = document.createElement("style")
    style.textContent = `
            :host {
                display: block;
            }
            .tooltip {
                background: var(--background, oklch(98% 0.02 95));
                border: 1px solid var(--border, oklch(90% 0.02 95));
                border-radius: var(--radius-lg, 10px);
                padding: 12px 16px;
                box-shadow: 0 4px 12px oklch(0 0 0 / 0.1);
                font-family: var(--font-geist-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
            }
            .tooltip-content {
                font-size: 13px;
                line-height: 1.5;
                color: var(--foreground, oklch(25% 0.02 95));
            }
        `
    this.shadowRoot.appendChild(style)

    // Create tooltip content
    const tooltipDiv = document.createElement("div")
    tooltipDiv.className = "tooltip"
    const contentDiv = document.createElement("div")
    contentDiv.className = "tooltip-content"
    contentDiv.textContent = this.explanation
    tooltipDiv.appendChild(contentDiv)
    this.shadowRoot.appendChild(tooltipDiv)

    // Append to body
    document.body.appendChild(this.container)

    // Position and show
    this.updatePosition()
    requestAnimationFrame(() => {
      if (this.container) {
        this.container.style.opacity = "1"
      }
    })
  }

  private updatePosition(): void {
    if (!this.container || !this.element) return

    const rect = this.element.getBoundingClientRect()
    const scrollX = window.scrollX || window.pageXOffset
    const scrollY = window.scrollY || window.pageYOffset

    // Try to position to the right first
    const rightSpace = window.innerWidth - rect.right
    const leftSpace = rect.left
    const bottomSpace = window.innerHeight - rect.bottom

    const offset = 12 // 12px offset from element

    if (rightSpace >= 340) {
      // Position to the right
      this.container.style.left = `${rect.right + scrollX + offset}px`
      this.container.style.top = `${rect.top + scrollY}px`
      this.container.style.transform = "translateY(0)"
    } else if (leftSpace >= 340) {
      // Position to the left
      this.container.style.left = `${rect.left + scrollX - offset}px`
      this.container.style.top = `${rect.top + scrollY}px`
      this.container.style.transform = "translateX(-100%)"
    } else if (bottomSpace >= 100) {
      // Position below
      this.container.style.left = `${rect.left + scrollX}px`
      this.container.style.top = `${rect.bottom + scrollY + offset}px`
      this.container.style.transform = "translateX(0)"
    } else {
      // Position above
      this.container.style.left = `${rect.left + scrollX}px`
      this.container.style.top = `${rect.top + scrollY - offset}px`
      this.container.style.transform = "translateY(-100%)"
    }
  }

  public updateElement(newElement: Element, newExplanation: string): void {
    this.element = newElement
    this.explanation = newExplanation

    // Update content
    if (this.shadowRoot) {
      const contentDiv = this.shadowRoot.querySelector(".tooltip-content")
      if (contentDiv) {
        contentDiv.textContent = newExplanation
      }
    }

    this.updatePosition()
  }

  public scheduleUpdate(): void {
    if (this.updateFrame) {
      cancelAnimationFrame(this.updateFrame)
    }
    this.updateFrame = requestAnimationFrame(() => {
      this.updatePosition()
      this.updateFrame = null
    })
  }

  public destroy(): void {
    // Cancel pending updates
    if (this.updateFrame) {
      cancelAnimationFrame(this.updateFrame)
      this.updateFrame = null
    }

    // Remove DOM element
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }

    this.container = null
    this.shadowRoot = null
  }
}
