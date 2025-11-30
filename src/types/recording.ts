/**
 * Recording state types
 */

import type { FlowStep } from "./flows"

export type RecordingState = "idle" | "recording" | "paused"

export interface RecordingSession {
  state: RecordingState
  steps: FlowStep[]
  currentStepIndex: number
  startTime?: number
  pausedTime?: number
  tabId?: number // Track which tab is recording
}
