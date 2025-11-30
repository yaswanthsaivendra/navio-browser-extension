/**
 * Storage utilities for managing flows in chrome.storage.local
 */

import { v4 as uuidv4 } from "uuid"

import type { Flow, FlowStep, StorageData } from "~/types/flows"

import { logError, safeAsync } from "./errors"
import { validateAndSanitizeFlow } from "./validation"

const STORAGE_KEY = "navio_flows"

/**
 * Check if chrome.storage is available
 */
function isStorageAvailable(): boolean {
  try {
    if (typeof chrome === "undefined" || chrome === null) {
      return false
    }
    if (!chrome.storage || !chrome.storage.local) {
      return false
    }
    // Try to access it to ensure it's actually available
    return typeof chrome.storage.local.get === "function"
  } catch {
    return false
  }
}

/**
 * Get all flows from storage
 */
export async function getAllFlows(): Promise<Flow[]> {
  if (!isStorageAvailable()) {
    // Don't log warning - storage might not be ready yet or extension needs reload
    // This is expected behavior when extension is first loaded
    return []
  }
  return safeAsync(async () => {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const data = result[STORAGE_KEY] as StorageData | undefined
    return data?.flows || []
  }, []) as Promise<Flow[]>
}

/**
 * Get a single flow by ID
 */
export async function getFlowById(flowId: string): Promise<Flow | null> {
  return safeAsync(async () => {
    const flows = await getAllFlows()
    return flows.find((flow) => flow.id === flowId) || null
  }, null) as Promise<Flow | null>
}

/**
 * Save a flow to storage
 */
export async function saveFlow(flow: Flow): Promise<boolean> {
  if (!isStorageAvailable()) {
    // Storage not available - extension may need reload
    return false
  }
  return safeAsync(async () => {
    // Validate and sanitize the flow before saving
    const validatedFlow = validateAndSanitizeFlow(flow)

    const flows = await getAllFlows()
    const existingIndex = flows.findIndex((f) => f.id === validatedFlow.id)

    const updatedFlow: Flow = {
      ...validatedFlow,
      updatedAt: new Date().toISOString(),
    }

    if (existingIndex >= 0) {
      // Update existing flow
      flows[existingIndex] = updatedFlow
    } else {
      // Add new flow
      flows.push(updatedFlow)
    }

    const data: StorageData = {
      flows,
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: data })
    return true
  }, false) as Promise<boolean>
}

/**
 * Delete a flow by ID
 */
export async function deleteFlow(flowId: string): Promise<boolean> {
  if (!isStorageAvailable()) {
    return false
  }
  return safeAsync(async () => {
    const flows = await getAllFlows()
    const filtered = flows.filter((f) => f.id !== flowId)

    const data: StorageData = {
      flows: filtered,
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: data })
    return true
  }, false) as Promise<boolean>
}

/**
 * Create a new flow with initial step
 */
export async function createFlow(
  name: string,
  steps: FlowStep[] = []
): Promise<Flow> {
  const flow: Flow = {
    id: uuidv4(),
    name,
    createdAt: new Date().toISOString(),
    steps: steps.map((step, index) => ({
      ...step,
      order: step.order ?? index,
    })),
  }

  await saveFlow(flow)
  return flow
}

/**
 * Create a new flow step
 */
export function createFlowStep(
  type: FlowStep["type"],
  selector: string,
  url: string,
  explanation: string,
  order: number = 0,
  meta?: FlowStep["meta"]
): FlowStep {
  return {
    id: uuidv4(),
    type,
    selector,
    url,
    explanation,
    order,
    meta: {
      ...meta,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  }
}

/**
 * Export flow as JSON string
 */
export function exportFlowToJSON(flow: Flow): string {
  return JSON.stringify(flow, null, 2)
}

/**
 * Import flow from JSON string
 */
export function importFlowFromJSON(json: string): Flow | null {
  try {
    const data = JSON.parse(json)

    // Validate and sanitize the imported flow
    const flow = validateAndSanitizeFlow(data)

    // Generate new ID and timestamp to avoid conflicts
    flow.id = uuidv4()
    flow.createdAt = new Date().toISOString()

    return flow
  } catch (error) {
    logError(error, { context: "import-flow" })
    return null
  }
}

/**
 * Clear all flows (use with caution)
 */
export async function clearAllFlows(): Promise<boolean> {
  if (!isStorageAvailable()) {
    return false
  }
  return safeAsync(async () => {
    await chrome.storage.local.remove(STORAGE_KEY)
    return true
  }, false) as Promise<boolean>
}
