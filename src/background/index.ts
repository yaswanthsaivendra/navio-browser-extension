// Background service worker
import { logError } from "~/utils/errors"

console.warn("Navio extension background script loaded")

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.warn("Navio extension installed")
    // Initialize default storage, request permissions, etc.
  } else if (details.reason === "update") {
    console.warn("Navio extension updated", details.previousVersion)
  }
})

// Handle errors
chrome.runtime.onStartup.addListener(() => {
  console.warn("Navio extension started")
})

// Error handling for unhandled errors
self.addEventListener("error", (event) => {
  logError(event.error || new Error(String(event.message)), {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  })
})

self.addEventListener("unhandledrejection", (event) => {
  logError(event.reason, { type: "unhandledrejection" })
})
