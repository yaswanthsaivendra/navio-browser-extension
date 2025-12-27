import { INDEXEDDB_CONFIG } from "~/constants"

import { logError } from "./errors"
import { logger } from "./logger"

/**
 * IndexedDB utilities for storing screenshots
 * Provides unlimited storage for full-resolution screenshots
 */

// Type declarations for browser globals
declare const indexedDB: IDBFactory
declare const IDBKeyRange: {
  only: (value: string) => IDBKeyRange
}

const DB_NAME = INDEXEDDB_CONFIG.DB_NAME
const DB_VERSION = INDEXEDDB_CONFIG.DB_VERSION
const STORE_NAME = INDEXEDDB_CONFIG.STORE_NAME

/**
 * IndexedDB database instance
 */
let dbInstance: IDBDatabase | null = null

/**
 * Screenshot data structure stored in IndexedDB
 */
interface ScreenshotData {
  key: string
  flowId: string
  stepId: string
  screenshot: Blob
  timestamp: string
}

/**
 * Initialize IndexedDB
 */
export async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      const error = new Error("Failed to open IndexedDB")
      logError(error, { context: "init-indexeddb" })
      reject(error)
    }

    request.onsuccess = () => {
      dbInstance = request.result
      logger.debug("IndexedDB initialized", { dbName: DB_NAME })
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db) {
        reject(new Error("Failed to get database from upgrade event"))
        return
      }

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "key" })
        store.createIndex("flowId", "flowId", { unique: false })
        store.createIndex("stepId", "stepId", { unique: false })
        logger.debug("Created IndexedDB store", { storeName: STORE_NAME })
      }
    }
  })
}

/**
 * Generate key for screenshot storage
 */
function generateKey(flowId: string, stepId: string): string {
  return `${flowId}_${stepId}`
}

/**
 * Save screenshot to IndexedDB
 */
export async function saveScreenshot(
  flowId: string,
  stepId: string,
  screenshot: Blob
): Promise<void> {
  try {
    const db = await initDB()
    const key = generateKey(flowId, stepId)

    const data: ScreenshotData = {
      key,
      flowId,
      stepId,
      screenshot,
      timestamp: new Date().toISOString(),
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(data)

      request.onsuccess = () => {
        logger.debug("Screenshot saved to IndexedDB", {
          flowId,
          stepId,
          size: screenshot.size,
        })
        resolve()
      }

      request.onerror = () => {
        const error = new Error("Failed to save screenshot to IndexedDB")
        logError(error, { context: "save-screenshot", flowId, stepId })
        reject(error)
      }
    })
  } catch (error) {
    logError(error, { context: "save-screenshot", flowId, stepId })
    throw error
  }
}

/**
 * Get screenshot from IndexedDB
 * Returns Blob | null
 */
export async function getScreenshot(
  flowId: string,
  stepId: string
): Promise<Blob | null> {
  try {
    const db = await initDB()
    const key = generateKey(flowId, stepId)

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(key)

      request.onsuccess = () => {
        const result = request.result as ScreenshotData | undefined
        if (result && result.screenshot instanceof Blob) {
          logger.debug("Screenshot retrieved from IndexedDB", {
            flowId,
            stepId,
            size: result.screenshot.size,
          })
          resolve(result.screenshot)
        } else {
          logger.debug("Screenshot not found in IndexedDB", { flowId, stepId })
          resolve(null)
        }
      }

      request.onerror = () => {
        const error = new Error("Failed to get screenshot from IndexedDB")
        logError(error, { context: "get-screenshot", flowId, stepId })
        reject(error)
      }
    })
  } catch (error) {
    logError(error, { context: "get-screenshot", flowId, stepId })
    return null
  }
}

/**
 * Delete all screenshots for a flow
 */
export async function deleteScreenshots(flowId: string): Promise<void> {
  try {
    const db = await initDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite")
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index("flowId")
      const request = index.openCursor(IDBKeyRange.only(flowId))

      let deleteCount = 0

      request.onsuccess = () => {
        const cursor = request.result as IDBCursorWithValue | null
        if (cursor) {
          cursor.delete()
          deleteCount++
          cursor.continue()
        } else {
          logger.debug("Deleted screenshots from IndexedDB", {
            flowId,
            count: deleteCount,
          })
          resolve()
        }
      }

      request.onerror = () => {
        const error = new Error("Failed to delete screenshots from IndexedDB")
        logError(error, { context: "delete-screenshots", flowId })
        reject(error)
      }
    })
  } catch (error) {
    logError(error, { context: "delete-screenshots", flowId })
    throw error
  }
}
