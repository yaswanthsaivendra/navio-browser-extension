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
  | "START_PLAYBACK"
  | "STOP_PLAYBACK"
  | "NEXT_STEP"
  | "PREVIOUS_STEP"
  | "JUMP_TO_STEP"
  | "GET_RECORDING_STATE"
  | "GET_PLAYBACK_STATE"
  | "GET_FLOWS"
  | "SAVE_FLOW"
  | "DELETE_FLOW"
  | "EXPORT_FLOW"
  | "IMPORT_FLOW"

export interface BaseMessage {
  type: MessageType
  timestamp?: number
}

// Recording Messages
export interface StartRecordingMessage extends BaseMessage {
  type: "START_RECORDING"
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
    selector: string
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

// Playback Messages
export interface StartPlaybackMessage extends BaseMessage {
  type: "START_PLAYBACK"
  flowId: string
}

export interface StopPlaybackMessage extends BaseMessage {
  type: "STOP_PLAYBACK"
}

export interface NextStepMessage extends BaseMessage {
  type: "NEXT_STEP"
}

export interface PreviousStepMessage extends BaseMessage {
  type: "PREVIOUS_STEP"
}

export interface JumpToStepMessage extends BaseMessage {
  type: "JUMP_TO_STEP"
  stepIndex: number
}

// State Messages
export interface GetRecordingStateMessage extends BaseMessage {
  type: "GET_RECORDING_STATE"
}

export interface GetPlaybackStateMessage extends BaseMessage {
  type: "GET_PLAYBACK_STATE"
}

export interface GetFlowsMessage extends BaseMessage {
  type: "GET_FLOWS"
}

export interface SaveFlowMessage extends BaseMessage {
  type: "SAVE_FLOW"
  flow: Flow
}

export interface DeleteFlowMessage extends BaseMessage {
  type: "DELETE_FLOW"
  flowId: string
}

export interface ExportFlowMessage extends BaseMessage {
  type: "EXPORT_FLOW"
  flowId: string
}

export interface ImportFlowMessage extends BaseMessage {
  type: "IMPORT_FLOW"
  flow: Flow
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
  | StartPlaybackMessage
  | StopPlaybackMessage
  | NextStepMessage
  | PreviousStepMessage
  | JumpToStepMessage
  | GetRecordingStateMessage
  | GetPlaybackStateMessage
  | GetFlowsMessage
  | SaveFlowMessage
  | DeleteFlowMessage
  | ExportFlowMessage
  | ImportFlowMessage

// Response types
export interface MessageResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
