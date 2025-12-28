/**
 * Screenshot API Utilities
 * Converts screenshots to base64 format for API requests
 */

import type { FlowStep } from "~/types/flows"
import { logError } from "~/utils/errors"
import { getScreenshot } from "~/utils/indexeddb"
import { logger } from "~/utils/logger"

/**
 * Convert Blob to base64 data URL
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new globalThis.FileReader()
    reader.onloadend = () => {
      const result = reader.result
      if (typeof result === "string") {
        resolve(result)
      } else {
        reject(new Error("Failed to convert Blob to base64"))
      }
    }
    reader.onerror = () => {
      reject(new Error("Failed to read Blob"))
    }
    reader.readAsDataURL(blob)
  })
}

/**
 * Prepare screenshot for API request
 * Handles screenshots stored in both local storage (base64) and IndexedDB (Blob)
 * Returns the step with screenshots ready for API (base64 data URLs)
 */
export async function prepareScreenshotForAPI(
  step: FlowStep,
  flowId: string
): Promise<{
  screenshotThumb?: string
  screenshotFull?: string
}> {
  const result: {
    screenshotThumb?: string
    screenshotFull?: string
  } = {}

  try {
    // Handle thumbnail (should always be in meta as base64)
    if (step.meta?.screenshotThumb) {
      result.screenshotThumb = step.meta.screenshotThumb
    }

    // Handle full screenshot
    if (step.meta?.screenshotIndexedDB) {
      // Screenshot is in IndexedDB - fetch and convert to base64
      try {
        const blob = await getScreenshot(flowId, step.id)
        if (blob) {
          result.screenshotFull = await blobToBase64(blob)
          logger.debug("Converted IndexedDB screenshot to base64", {
            stepId: step.id,
            size: blob.size,
          })
        } else {
          logger.warn("Screenshot marked for IndexedDB but not found", {
            flowId,
            stepId: step.id,
          })
        }
      } catch (error) {
        logError(error, {
          context: "prepare-screenshot-api-indexeddb",
          flowId,
          stepId: step.id,
        })
        // Continue without full screenshot if IndexedDB fetch fails
      }
    } else if (step.meta?.screenshotFull) {
      // Screenshot is already base64 - use directly
      result.screenshotFull = step.meta.screenshotFull
    }

    return result
  } catch (error) {
    logError(error, {
      context: "prepare-screenshot-api",
      flowId,
      stepId: step.id,
    })
    // Return whatever we have (partial result)
    return result
  }
}
