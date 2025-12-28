/**
 * Flow Type Mapping Utilities
 * Converts between local Flow types (lowercase) and API types (uppercase)
 */

import type {
  CreateFlowRequest,
  CreateFlowResponse,
  FlowMetaAPI,
  FlowStepAPIRequest,
  FlowStepAPIResponse,
  FlowStepMetaAPI,
  FlowStepTypeAPI,
} from "~/types/api"
import type { Flow, FlowStep, StepType } from "~/types/flows"

/**
 * Map local step type (lowercase) to API step type (uppercase)
 */
export function mapStepTypeToAPI(localType: StepType): FlowStepTypeAPI {
  const mapping: Record<StepType, FlowStepTypeAPI> = {
    click: "CLICK",
    navigation: "NAVIGATION",
    input: "INPUT",
    visibility: "VISIBILITY",
    manual: "MANUAL",
  }
  return mapping[localType]
}

/**
 * Map API step type (uppercase) to local step type (lowercase)
 */
export function mapStepTypeFromAPI(apiType: FlowStepTypeAPI): StepType {
  const mapping: Record<FlowStepTypeAPI, StepType> = {
    CLICK: "click",
    NAVIGATION: "navigation",
    INPUT: "input",
    VISIBILITY: "visibility",
    MANUAL: "manual",
  }
  return mapping[apiType]
}

/**
 * Map local FlowStep metadata to API FlowStep metadata
 * Note: Screenshots should already be converted to base64 before calling this
 */
function mapFlowStepMetaToAPI(
  localMeta: FlowStep["meta"]
): FlowStepMetaAPI | undefined {
  if (!localMeta) return undefined

  const apiMeta: FlowStepMetaAPI = {}

  if (localMeta.elementText) {
    apiMeta.elementText = localMeta.elementText
  }
  if (localMeta.nodeType) {
    apiMeta.nodeType = localMeta.nodeType
  }
  if (localMeta.timestamp) {
    apiMeta.timestamp = localMeta.timestamp
  }
  if (localMeta.screenshotThumb) {
    // Screenshot should already be base64 data URL at this point
    apiMeta.screenshotThumb = localMeta.screenshotThumb
  }
  if (localMeta.screenshotFull) {
    // Screenshot should already be base64 data URL at this point
    apiMeta.screenshotFull = localMeta.screenshotFull
  }

  // Map click coordinates if available (stored in meta, need to check if we have this field)
  // Note: We might need to extract this from other meta fields if it exists

  return Object.keys(apiMeta).length > 0 ? apiMeta : undefined
}

/**
 * Map local FlowStep to API FlowStep request
 * Note: Screenshots should be prepared as base64 before calling this
 * (use prepareScreenshotForAPI from screenshot-api.ts)
 */
export function mapFlowStepToAPI(step: FlowStep): FlowStepAPIRequest {
  return {
    type: mapStepTypeToAPI(step.type),
    url: step.url,
    explanation: step.explanation,
    order: step.order,
    meta: mapFlowStepMetaToAPI(step.meta),
  }
}

/**
 * Map local Flow metadata to API Flow metadata
 */
function mapFlowMetaToAPI(flow: Flow): FlowMetaAPI | undefined {
  if (!flow.meta) return undefined

  const apiMeta: FlowMetaAPI = {}

  if (flow.meta.description) {
    apiMeta.description = flow.meta.description
  }
  if (flow.meta.tags && flow.meta.tags.length > 0) {
    apiMeta.tags = flow.meta.tags
  }

  return Object.keys(apiMeta).length > 0 ? apiMeta : undefined
}

/**
 * Map local Flow to API CreateFlowRequest
 * Note: Screenshots in steps should be prepared as base64 before calling this
 */
export function mapFlowToAPIRequest(flow: Flow): CreateFlowRequest {
  return {
    name: flow.name,
    steps: flow.steps.map(mapFlowStepToAPI),
    meta: mapFlowMetaToAPI(flow),
  }
}

/**
 * Map API FlowStep response metadata to local FlowStep metadata
 */
function mapFlowStepMetaFromAPI(
  apiMeta: FlowStepAPIResponse["meta"]
): FlowStep["meta"] | undefined {
  if (!apiMeta) return undefined

  const localMeta: FlowStep["meta"] = {}

  if (apiMeta.elementText) {
    localMeta.elementText = apiMeta.elementText
  }
  if (apiMeta.nodeType) {
    localMeta.nodeType = apiMeta.nodeType
  }
  if (apiMeta.timestamp) {
    localMeta.timestamp = apiMeta.timestamp
  }

  // Note: Screenshot URLs are not stored in local meta (we only keep base64 or IndexedDB references)

  return Object.keys(localMeta).length > 0 ? localMeta : undefined
}

/**
 * Map API FlowStep response to local FlowStep
 * Note: This is mainly for reference - we don't store API responses as local flows
 */
export function mapFlowStepFromAPI(apiStep: FlowStepAPIResponse): FlowStep {
  return {
    id: apiStep.id,
    type: mapStepTypeFromAPI(apiStep.type),
    url: apiStep.url,
    explanation: apiStep.explanation,
    order: apiStep.order,
    meta: mapFlowStepMetaFromAPI(apiStep.meta),
  }
}

/**
 * Map API CreateFlowResponse to local Flow
 * Note: This is mainly for reference - we don't store API responses as local flows
 */
export function mapFlowFromAPIResponse(apiFlow: CreateFlowResponse): Flow {
  return {
    id: apiFlow.id,
    name: apiFlow.name,
    createdAt: apiFlow.createdAt,
    updatedAt: apiFlow.updatedAt,
    steps: apiFlow.steps.map(mapFlowStepFromAPI),
    meta: apiFlow.meta
      ? {
          description: apiFlow.meta.description,
          tags: apiFlow.meta.tags,
        }
      : undefined,
  }
}
