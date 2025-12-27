/**
 * Messaging utilities for Chrome extension communication
 * Handles communication between popup, background, and content scripts
 */

import { RECORDING_CONFIG } from "~/constants"
import type { Message, MessageResponse } from "~/types/messages"

import { logError } from "./errors"

/**
 * Send a message and wait for response
 */
export async function sendMessage<T = unknown>(
  message: Message,
  tabId?: number
): Promise<MessageResponse<T>> {
  try {
    if (tabId !== undefined) {
      // Send to specific tab's content script
      const response = await chrome.tabs.sendMessage(tabId, message)
      return response as MessageResponse<T>
    } else {
      // Send to background script
      const response = await chrome.runtime.sendMessage(message)
      return response as MessageResponse<T>
    }
  } catch (error) {
    logError(error, { context: "send-message", message: message.type })
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Set up a message listener
 */
export function onMessage(
  handler: (
    message: Message,
    sender: chrome.runtime.MessageSender
  ) => Promise<MessageResponse> | MessageResponse
): void {
  chrome.runtime.onMessage.addListener(
    (message: Message, sender, sendResponse) => {
      // Handle async responses
      const result = handler(message, sender)
      if (result instanceof Promise) {
        result.then(sendResponse).catch((error) => {
          logError(error, { context: "message-handler", message: message.type })
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          })
        })
        return true // Indicates we will send a response asynchronously
      } else {
        sendResponse(result)
        return false
      }
    }
  )
}

/**
 * Check if content script is ready by checking for readiness marker
 */
export async function isContentScriptReady(tabId: number): Promise<boolean> {
  try {
    // First check for the readiness marker in the page
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        return (
          typeof window !== "undefined" &&
          window.__NAVIO_CONTENT_SCRIPT_READY__ === true
        )
      },
    })

    if (results && results[0]?.result === true) {
      return true
    }

    // Fallback: Try sending a message to verify script is loaded
    const response = await chrome.tabs.sendMessage(tabId, {
      type: "GET_RECORDING_STATE",
    } as Message)
    return response !== undefined
  } catch (error) {
    // Check if it's a connection error
    const errorMsg = error instanceof Error ? error.message : String(error)
    if (
      errorMsg.includes("Receiving end does not exist") ||
      errorMsg.includes("Could not establish connection")
    ) {
      return false
    }
    // Other errors might mean script is loaded but returned error
    return false
  }
}

/**
 * Get content script file path from manifest
 */
async function getContentScriptPath(): Promise<string | null> {
  try {
    const manifest = chrome.runtime.getManifest()
    const contentScripts = manifest.content_scripts
    if (
      contentScripts &&
      contentScripts.length > 0 &&
      contentScripts[0].js &&
      contentScripts[0].js.length > 0
    ) {
      return contentScripts[0].js[0]
    }
    return null
  } catch (error) {
    logError(error, { context: "get-content-script-path" })
    return null
  }
}

/**
 * Ensure content script is loaded, inject if needed
 * Uses retry logic with exponential backoff
 */
export async function ensureContentScriptReady(
  tabId: number
): Promise<boolean> {
  // First check if it's already loaded
  if (await isContentScriptReady(tabId)) {
    return true
  }

  // Check if scripting API is available
  if (typeof chrome === "undefined" || !chrome.scripting) {
    return false
  }

  try {
    const tab = await chrome.tabs.get(tabId)
    if (
      !tab.url ||
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("chrome-extension://") ||
      tab.url.startsWith("edge://")
    ) {
      return false // Can't inject on these pages
    }

    // Get content script path from manifest
    const scriptPath = await getContentScriptPath()
    if (!scriptPath) {
      // If we can't get the path, try waiting for auto-injection with retries
      return await retryContentScriptCheck(tabId, 3)
    }

    // Try to inject the content script
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [scriptPath],
      })

      // Wait a bit for script to initialize
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Check if it's ready now with retries
      return await retryContentScriptCheck(tabId, 3)
    } catch {
      // Injection might fail if script is already injected or page doesn't allow it
      // Try checking with retries anyway
      return await retryContentScriptCheck(tabId, 3)
    }
  } catch (error) {
    logError(error, { context: "ensure-content-script" })
    return false
  }
}

/**
 * Retry content script readiness check with exponential backoff
 */
async function retryContentScriptCheck(
  tabId: number,
  maxRetries: number = RECORDING_CONFIG.MAX_RETRIES
): Promise<boolean> {
  const delays = RECORDING_CONFIG.CONTENT_SCRIPT_RETRY_DELAYS

  for (let i = 0; i < maxRetries; i++) {
    if (await isContentScriptReady(tabId)) {
      return true
    }

    // Wait before next retry (except on last iteration)
    if (i < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delays[i] || 1000))
    }
  }

  return false
}
