/**
 * Highlight overlay component
 * Renders a pulsing border around the target element
 */

export class Highlight {
  private container: HTMLDivElement | null = null
  private shadowRoot: ShadowRoot | null = null
  private resizeObserver: ResizeObserver | null = null
  private mutationObserver: MutationObserver | null = null
  private updateFrame: number | null = null

  constructor(private element: Element) {
    this.createHighlight()
    this.attachObservers()
  }

  private createHighlight(): void {
    // Create container
    this.container = document.createElement("div")
    this.container.setAttribute("data-navio-highlight", "true")
    this.container.style.cssText = `
            position: absolute;
            pointer-events: none;
            z-index: 9998;
            border: 2px solid var(--highlight, oklch(55% 0.18 220));
            border-radius: var(--radius-md, 8px);
            box-shadow: 0 0 0 4px oklch(55% 0.18 220 / 0.1);
            animation: navio-pulse 1.5s ease-in-out infinite;
            transition: all 0.15s ease-out;
        `

    // Create shadow root for style isolation
    this.shadowRoot = this.container.attachShadow({ mode: "closed" })

    // Add styles
    const style = document.createElement("style")
    style.textContent = `
            @keyframes navio-pulse {
                0%, 100% {
                    box-shadow: 0 0 0 4px oklch(55% 0.18 220 / 0.1);
                }
                50% {
                    box-shadow: 0 0 0 8px oklch(55% 0.18 220 / 0.05);
                }
            }
        `
    this.shadowRoot.appendChild(style)

    // Append to body
    document.body.appendChild(this.container)

    // Initial position update
    this.updatePosition()
  }

  private updatePosition(): void {
    if (!this.container || !this.element) return

    const rect = this.element.getBoundingClientRect()
    const scrollX = window.scrollX || window.pageXOffset
    const scrollY = window.scrollY || window.pageYOffset

    this.container.style.left = `${rect.left + scrollX}px`
    this.container.style.top = `${rect.top + scrollY}px`
    this.container.style.width = `${rect.width}px`
    this.container.style.height = `${rect.height}px`
  }

  private attachObservers(): void {
    // ResizeObserver for element size changes
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => {
        this.scheduleUpdate()
      })
      this.resizeObserver.observe(this.element)
    }

    // MutationObserver for DOM changes
    this.mutationObserver = new MutationObserver(() => {
      this.scheduleUpdate()
    })
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    })

    // Scroll and resize listeners
    window.addEventListener("scroll", this.handleScroll, true)
    window.addEventListener("resize", this.handleResize)
  }

  private scheduleUpdate(): void {
    if (this.updateFrame) {
      cancelAnimationFrame(this.updateFrame)
    }
    this.updateFrame = requestAnimationFrame(() => {
      this.updatePosition()
      this.updateFrame = null
    })
  }

  private handleScroll = (): void => {
    this.scheduleUpdate()
  }

  private handleResize = (): void => {
    this.scheduleUpdate()
  }

  public updateElement(newElement: Element): void {
    // Remove old observers
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }
    if (this.mutationObserver) {
      this.mutationObserver.disconnect()
    }

    // Update element
    this.element = newElement

    // Reattach observers
    if (this.resizeObserver) {
      this.resizeObserver.observe(this.element)
    }
    if (this.mutationObserver) {
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
      })
    }

    this.updatePosition()
  }

  public destroy(): void {
    // Remove observers
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
    if (this.mutationObserver) {
      this.mutationObserver.disconnect()
      this.mutationObserver = null
    }

    // Remove event listeners
    window.removeEventListener("scroll", this.handleScroll, true)
    window.removeEventListener("resize", this.handleResize)

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
