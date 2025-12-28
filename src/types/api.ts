/**
 * API type definitions
 * TypeScript interfaces for API requests and responses
 */

/**
 * Token response from /api/extension/token
 */
export interface TokenResponse {
  token: string
  expiresAt: string // ISO 8601 datetime string
  tenantId: string
  tenantName: string
}

/**
 * Stored token data in chrome.storage.local
 */
export interface StoredToken {
  token: string
  expiresAt: string
  tenantId: string
  tenantName: string
}

/**
 * API error response structure
 */
export interface ApiErrorResponse {
  error: {
    code: string
    message: string
    statusCode: number
    details?: Array<{
      path: (string | number)[]
      message: string
    }>
  }
}

// ============================================================================
// Flow Creation API Types
// ============================================================================

/**
 * API step type (uppercase, used in API requests/responses)
 */
export type FlowStepTypeAPI =
  | "CLICK"
  | "NAVIGATION"
  | "INPUT"
  | "VISIBILITY"
  | "MANUAL"

/**
 * API flow step metadata (for requests)
 */
export interface FlowStepMetaAPI {
  elementText?: string
  nodeType?: string
  timestamp?: string // ISO 8601 datetime
  clickCoordinates?: {
    x: number
    y: number
  }
  screenshotThumb?: string // Base64 data URL (data:image/png;base64,...)
  screenshotFull?: string // Base64 data URL (data:image/png;base64,...)
}

/**
 * API flow step request (used when creating a flow)
 */
export interface FlowStepAPIRequest {
  type: FlowStepTypeAPI
  url: string
  explanation: string
  order: number
  meta?: FlowStepMetaAPI
}

/**
 * API flow metadata (for requests)
 */
export interface FlowMetaAPI {
  description?: string // Max 500 chars
  tags?: string[] // Max 10 tags
}

/**
 * API create flow request
 */
export interface CreateFlowRequest {
  name: string // 1-100 chars
  steps: FlowStepAPIRequest[] // Min 1 step
  meta?: FlowMetaAPI
}

/**
 * API flow step response (returned from API)
 */
export interface FlowStepAPIResponse {
  id: string
  flowId: string
  type: FlowStepTypeAPI
  url: string
  explanation: string
  order: number
  screenshotThumbUrl: string | null
  screenshotFullUrl: string | null
  meta?: Omit<FlowStepMetaAPI, "screenshotThumb" | "screenshotFull"> // Meta without screenshots (URLs are separate)
  createdAt: string
  updatedAt: string
}

/**
 * API create flow response
 */
export interface CreateFlowResponse {
  id: string
  name: string
  tenantId: string
  createdBy: string
  meta?: FlowMetaAPI
  createdAt: string
  updatedAt: string
  steps: FlowStepAPIResponse[]
}
