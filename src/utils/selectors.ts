/**
 * Element metadata utilities
 * Used for extracting text and type information from elements during recording
 * Note: Selector generation has been removed - we use screenshot-based recording only
 */

/**
 * Get element text content (safe)
 */
export function getElementText(element: Element): string {
  return element.textContent?.trim() || ""
}

/**
 * Get element node type
 */
export function getElementNodeType(element: Element): string {
  return element.tagName.toLowerCase()
}
