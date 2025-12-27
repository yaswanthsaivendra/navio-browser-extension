/**
 * Flow and FlowStep type definitions
 * Based on Phase 1 MVP requirements
 */

export type StepType =
  | "click"
  | "navigation"
  | "input"
  | "visibility"
  | "manual"

export interface FlowStep {
  id: string
  type: StepType
  url: string
  explanation: string // Single explanation field (60-100 characters)
  order: number
  meta?: {
    elementText?: string
    nodeType?: string
    timestamp?: string
    screenshotThumb?: string // Base64 thumbnail (required)
    screenshotFull?: string // Base64 full (if small enough)
    screenshotIndexedDB?: boolean // Flag if stored in IndexedDB
    createdAt?: string
  }
}

export interface Flow {
  id: string
  name: string
  createdAt: string
  updatedAt?: string
  steps: FlowStep[]
  meta?: {
    description?: string
    tags?: string[]
  }
}

/**
 * Storage structure for chrome.storage.local
 */
export interface StorageData {
  flows: Flow[]
  settings?: {
    autoAnnotate?: boolean
    showToolbar?: boolean
  }
}
