// Content script - runs on web pages
// This will be used for recording and overlay functionality

import { logError } from "~/utils/errors"

// Initialize content script
try {
  // Content script initialization will go here
  // For now, just ensure it loads without errors
} catch (error) {
  logError(error, { context: "content-script-init" })
}

export {}
