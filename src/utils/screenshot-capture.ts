/**
 * Screenshot capture utilities for background script
 * Only contains functions that work in service worker context (no DOM APIs)
 */

import { logError } from "./errors"
import { logger } from "./logger"

/**
 * Capture visible tab as screenshot
 * This works in service worker context
 */
export async function captureVisibleTab(tabId?: number): Promise<string> {
  try {
    // chrome.tabs.captureVisibleTab doesn't need tabId, it captures the active tab
    const dataUrl = await chrome.tabs.captureVisibleTab({
      format: "png",
      quality: 100,
    })

    logger.debug("Captured visible tab", {
      tabId,
      dataUrlLength: dataUrl.length,
    })
    return dataUrl
  } catch (error) {
    logError(error, { context: "capture-visible-tab", tabId })
    throw new Error("Failed to capture screenshot")
  }
}

/**
 * Convert data URL to Blob
 * Works in service worker context (uses atob and Blob constructor)
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(",")
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png"
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }

  return new Blob([u8arr], { type: mime })
}
