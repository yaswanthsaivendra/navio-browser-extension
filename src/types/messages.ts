/**
 * Message types for communication between popup, background, and content scripts
 */

import type { Flow } from "./flows"

export type MessageType =
  | "START_RECORDING"
  | "STOP_RECORDING"
  | "PAUSE_RECORDING"
  | "RESUME_RECORDING"
  | "CAPTURE_CLICK"
  | "ADD_STEP"
  | "ADD_MANUAL_STEP"
  | "UNDO_LAST_STEP"
  | "GET_RECORDING_STATE"
  | "SAVE_FLOW"
  | "EXPORT_FLOW"
  | "IMPORT_FLOW"
  | "SAVE_SCREENSHOT"
  | "DELETE_SCREENSHOTS"
  | "CAPTURE_SCREENSHOT"

export interface BaseMessage {
  type: MessageType
  timestamp?: number
}

// Recording Messages
export interface StartRecordingMessage extends BaseMessage {
  type: "START_RECORDING"
  tabId?: number // Optional tabId passed from background to content script
}

export interface StopRecordingMessage extends BaseMessage {
  type: "STOP_RECORDING"
  flowName?: string
}

export interface PauseRecordingMessage extends BaseMessage {
  type: "PAUSE_RECORDING"
}

export interface ResumeRecordingMessage extends BaseMessage {
  type: "RESUME_RECORDING"
}

export interface CaptureClickMessage extends BaseMessage {
  type: "CAPTURE_CLICK"
  element: {
    url: string
    text?: string
    nodeType?: string
  }
}

export interface AddStepMessage extends BaseMessage {
  type: "ADD_STEP"
  step: import("./flows").FlowStep
}

export interface AddManualStepMessage extends BaseMessage {
  type: "ADD_MANUAL_STEP"
  step: {
    explanation: string
  }
}

export interface UndoLastStepMessage extends BaseMessage {
  type: "UNDO_LAST_STEP"
}

// State Messages
export interface GetRecordingStateMessage extends BaseMessage {
  type: "GET_RECORDING_STATE"
}

export interface SaveFlowMessage extends BaseMessage {
  type: "SAVE_FLOW"
  flow: Flow
}

export interface ExportFlowMessage extends BaseMessage {
  type: "EXPORT_FLOW"
  flowId: string
}

export interface ImportFlowMessage extends BaseMessage {
  type: "IMPORT_FLOW"
  flow: string // JSON string representation of Flow
}

// Screenshot Messages
export interface SaveScreenshotMessage extends BaseMessage {
  type: "SAVE_SCREENSHOT"
  flowId: string
  stepId: string
  screenshot: Blob
}

export interface DeleteScreenshotsMessage extends BaseMessage {
  type: "DELETE_SCREENSHOTS"
  flowId: string
}

export interface CaptureScreenshotMessage extends BaseMessage {
  type: "CAPTURE_SCREENSHOT"
  tabId: number
}

// Union type for all messages
export type Message =
  | StartRecordingMessage
  | StopRecordingMessage
  | PauseRecordingMessage
  | ResumeRecordingMessage
  | CaptureClickMessage
  | AddStepMessage
  | AddManualStepMessage
  | UndoLastStepMessage
  | GetRecordingStateMessage
  | SaveFlowMessage
  | ExportFlowMessage
  | ImportFlowMessage
  | SaveScreenshotMessage
  | DeleteScreenshotsMessage
  | CaptureScreenshotMessage

// Response types
export interface MessageResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
