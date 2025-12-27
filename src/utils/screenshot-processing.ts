import { SCREENSHOT_CONFIG } from "~/constants"

import { logError } from "./errors"
import { logger } from "./logger"
import { dataUrlToBlob } from "./screenshot-capture"

/**
 * Screenshot processing utilities for content scripts
 * Handles compression and thumbnail generation using DOM APIs (Canvas, Image)
 *
 * Note: This file is for content script context only (has DOM APIs).
 * For service worker utilities, see screenshot-capture.ts
 */

// Type declarations for browser globals (content script context)
declare const Image: {
  new (): HTMLImageElement
}

export interface ScreenshotResult {
  thumbnail: string // Base64 thumbnail (50-100KB)
  full?: string // Base64 full screenshot (if small enough)
  indexedDB?: boolean // Flag if full screenshot should be stored in IndexedDB
}

/**
 * Compress image using Canvas API
 * NOTE: This function requires DOM APIs (Image, Canvas) and must be called from content script context
 */
export async function compressImage(
  dataUrl: string,
  quality: number = 0.75,
  maxWidth?: number
): Promise<string> {
  // Ensure we're in a context with DOM APIs
  if (typeof document === "undefined" || typeof Image === "undefined") {
    throw new Error(
      "compressImage requires DOM APIs and must be called from content script context"
    )
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        let width = img.width
        let height = img.height

        // Resize if maxWidth specified
        if (maxWidth && width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Failed to get canvas context"))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Convert to JPEG for better compression
        const compressed = canvas.toDataURL("image/jpeg", quality)
        resolve(compressed)
      } catch (error) {
        logError(error, { context: "compress-image" })
        reject(error)
      }
    }

    img.onerror = () => {
      const error = new Error("Failed to load image for compression")
      logError(error, { context: "compress-image" })
      reject(error)
    }

    img.src = dataUrl
  })
}

/**
 * Generate thumbnail from screenshot
 */
export async function generateThumbnail(
  dataUrl: string,
  maxWidth: number = SCREENSHOT_CONFIG.THUMBNAIL_MAX_WIDTH
): Promise<string> {
  return compressImage(dataUrl, SCREENSHOT_CONFIG.THUMBNAIL_QUALITY, maxWidth)
}

/**
 * Process screenshot (compression, thumbnail generation)
 * This must be called from content script context (has DOM access)
 * @param rawDataUrl - Raw screenshot data URL from chrome.tabs.captureVisibleTab
 */
export async function captureAndProcessScreenshot(
  rawDataUrl: string
): Promise<ScreenshotResult> {
  // Ensure we're in a context with DOM APIs (content script, not service worker)
  if (typeof document === "undefined" || typeof Image === "undefined") {
    const error = new Error(
      "captureAndProcessScreenshot requires DOM APIs and must be called from content script context"
    )
    logError(error, { context: "capture-and-process-screenshot" })
    throw error
  }

  try {
    // Generate thumbnail (always store in meta)
    const thumbnail = await generateThumbnail(
      rawDataUrl,
      SCREENSHOT_CONFIG.THUMBNAIL_MAX_WIDTH
    )

    // Check size of full screenshot
    const fullBlob = dataUrlToBlob(rawDataUrl)
    const fullSizeKB = fullBlob.size / 1024

    logger.debug("Screenshot processed", {
      thumbnailSizeKB: (dataUrlToBlob(thumbnail).size / 1024).toFixed(2),
      fullSizeKB: fullSizeKB.toFixed(2),
    })

    // If full screenshot is small enough, store in meta
    // Otherwise, flag for IndexedDB storage
    if (fullSizeKB < SCREENSHOT_CONFIG.FULL_SIZE_THRESHOLD_KB) {
      // Compress full screenshot slightly
      const compressed = await compressImage(
        rawDataUrl,
        SCREENSHOT_CONFIG.FULL_COMPRESSION_QUALITY
      )
      return {
        thumbnail,
        full: compressed,
        indexedDB: false,
      }
    } else {
      // Store full screenshot in IndexedDB
      // Keep raw data URL for now, will be moved to IndexedDB when flow is saved
      return {
        thumbnail,
        full: rawDataUrl, // Store raw for IndexedDB (will be converted to Blob when saving)
        indexedDB: true,
      }
    }
  } catch (error) {
    logError(error, { context: "capture-and-process-screenshot" })
    throw error
  }
}
