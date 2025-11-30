/**
 * Selector generation utility
 * Priority: data-testid > ID > class combinations > XPath
 */

export interface SelectorOptions {
  dataAttributes?: string[] // e.g., ['data-testid', 'data-id']
  preferId?: boolean
  preferClass?: boolean
}

export interface SelectorResult {
  selector: string
  type: "data-attribute" | "id" | "class" | "xpath"
  score: number // Higher is better
  element?: Element
}

/**
 * Generate the best selector for an element
 */
export function generateSelector(
  element: Element,
  options: SelectorOptions = {}
): SelectorResult {
  const dataAttributes = options.dataAttributes || ["data-testid", "data-id"]
  const results: SelectorResult[] = []

  // 1. Try data attributes (highest priority)
  for (const attr of dataAttributes) {
    const value = element.getAttribute(attr)
    if (value) {
      const selector = `[${attr}="${escapeSelector(value)}"]`
      results.push({
        selector,
        type: "data-attribute",
        score: 100,
        element,
      })
      break // Use first match
    }
  }

  // 2. Try ID
  if (element.id) {
    const id = escapeSelector(element.id)
    if (isValidId(id)) {
      results.push({
        selector: `#${id}`,
        type: "id",
        score: 80,
        element,
      })
    }
  }

  // 3. Try class combinations
  if (element.classList.length > 0) {
    const classSelector = generateClassSelector(element)
    if (classSelector) {
      results.push({
        selector: classSelector,
        type: "class",
        score: 60,
        element,
      })
    }
  }

  // 4. XPath fallback (lowest priority)
  const xpath = generateXPath(element)
  results.push({
    selector: xpath,
    type: "xpath",
    score: 20,
    element,
  })

  // Return the highest scoring selector
  return results.sort((a, b) => b.score - a.score)[0]
}

/**
 * Generate class-based selector
 */
function generateClassSelector(element: Element): string | null {
  const classes = Array.from(element.classList)
    .filter((cls) => !cls.startsWith("_")) // Filter out internal classes
    .map((cls) => `.${escapeSelector(cls)}`)

  if (classes.length === 0) return null

  // Try single class first
  if (classes.length === 1) {
    const selector = `${element.tagName.toLowerCase()}${classes[0]}`
    if (document.querySelectorAll(selector).length === 1) {
      return selector
    }
  }

  // Try combination of classes
  for (let i = 1; i <= Math.min(classes.length, 3); i++) {
    const selector = `${element.tagName.toLowerCase()}${classes.slice(0, i).join("")}`
    if (document.querySelectorAll(selector).length === 1) {
      return selector
    }
  }

  // Add nth-child if needed
  const parent = element.parentElement
  if (parent) {
    const siblings = Array.from(parent.children).filter(
      (child) => child.tagName === element.tagName
    )
    if (siblings.length > 1) {
      const index = siblings.indexOf(element) + 1
      const baseSelector = `${element.tagName.toLowerCase()}${classes.join("")}`
      return `${baseSelector}:nth-of-type(${index})`
    }
  }

  return `${element.tagName.toLowerCase()}${classes.join("")}`
}

/**
 * Generate XPath for an element
 */
function generateXPath(element: Element): string {
  if (element.id) {
    return `//*[@id="${element.id}"]`
  }

  const parts: string[] = []
  let current: Element | null = element

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1
    const currentTag = current.tagName
    const siblings = current.parentElement
      ? Array.from(current.parentElement.children).filter(
          (child) => child.tagName === currentTag
        )
      : []

    if (siblings.length > 1) {
      index = siblings.indexOf(current) + 1
    }

    const tagName = current.tagName.toLowerCase()
    parts.unshift(`${tagName}[${index}]`)
    current = current.parentElement
  }

  return `/${parts.join("/")}`
}

/**
 * Test if a selector uniquely identifies the element
 */
export function testSelector(selector: string, element: Element): boolean {
  try {
    const matches = document.querySelectorAll(selector)
    return matches.length === 1 && matches[0] === element
  } catch {
    return false
  }
}

/**
 * Find element by selector (supports CSS and XPath)
 */
export function findElementBySelector(selector: string): Element | null {
  try {
    // Check if it's an XPath
    if (selector.startsWith("/") || selector.startsWith("//")) {
      return findElementByXPath(selector)
    }
    // CSS selector
    return document.querySelector(selector)
  } catch {
    return null
  }
}

/**
 * Find element by XPath
 */
function findElementByXPath(xpath: string): Element | null {
  try {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    )
    return result.singleNodeValue as Element | null
  } catch {
    return null
  }
}

/**
 * Escape CSS selector special characters
 */
function escapeSelector(selector: string): string {
  // Escape special characters in CSS selectors
  return selector.replace(/([!"#$%&'()*+,.:;<=>?@[\\\]^`{|}~])/g, "\\$1")
}

/**
 * Validate CSS ID
 */
function isValidId(id: string): boolean {
  // CSS ID must start with letter, underscore, or hyphen
  // and contain only letters, digits, hyphens, and underscores
  return /^[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(id)
}

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
