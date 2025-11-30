/**
 * Presenter Panel component
 * Fixed sidebar showing flow steps, current step details, and navigation
 */

import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { useEffect, useRef } from "react"

import type { Flow, FlowStep } from "~/types/flows"

interface PresenterPanelProps {
  flow: Flow
  currentStepIndex: number
  onClose: () => void
  onNext: () => void
  onPrevious: () => void
  onJumpToStep: (index: number) => void
}

export function PresenterPanel({
  flow,
  currentStepIndex,
  onClose,
  onNext,
  onPrevious,
  onJumpToStep,
}: PresenterPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const currentStepRef = useRef<HTMLDivElement>(null)

  // Scroll current step into view
  useEffect(() => {
    if (currentStepRef.current) {
      currentStepRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      })
    }
  }, [currentStepIndex])

  const currentStep = flow.steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === flow.steps.length - 1

  return (
    <div
      ref={containerRef}
      data-navio-extension="presenter-panel"
      className="fixed right-0 top-0 h-screen w-[320px] bg-accent border-l border-border shadow-lg z-9997 flex flex-col overflow-hidden"
      style={{
        backgroundColor: "var(--accent)",
        borderLeftColor: "var(--border)",
        boxShadow: "-2px 0 8px oklch(0 0 0 / 0.05)",
      }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground m-0">
          {flow.name}
        </h2>
        <button
          onClick={onClose}
          className="p-1 rounded-sm hover:bg-accent-foreground/10 transition-colors"
          aria-label="Close panel">
          <X className="h-4 w-4 text-foreground" />
        </button>
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {flow.steps.map((step: FlowStep, index: number) => {
          const isActive = index === currentStepIndex
          return (
            <div
              key={step.id}
              ref={index === currentStepIndex ? currentStepRef : null}
              onClick={() => onJumpToStep(index)}
              className={`p-3 rounded-md cursor-pointer transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-background/50 hover:bg-background/80 text-foreground"
              }`}
              style={{
                backgroundColor: isActive
                  ? "var(--primary)"
                  : "var(--background) / 0.5",
                color: isActive
                  ? "var(--primary-foreground)"
                  : "var(--foreground)",
              }}>
              <div className="flex items-start gap-2">
                <span
                  className={`text-xs font-semibold ${
                    isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground"
                  }`}>
                  {index + 1}
                </span>
                <p className="text-sm m-0 flex-1 line-clamp-2">
                  {step.explanation}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Current Step Details */}
      {currentStep && (
        <div className="p-4 border-t border-border bg-background/30">
          <div className="space-y-2">
            <div>
              <span className="text-xs font-semibold text-muted-foreground">
                Step {currentStepIndex + 1} of {flow.steps.length}
              </span>
              <p className="text-sm font-medium text-foreground mt-1 m-0">
                {currentStep.explanation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="p-4 border-t border-border bg-background/30 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={onPrevious}
            disabled={isFirstStep}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            onClick={onNext}
            disabled={isLastStep}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1">
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground text-center m-0">
          Use ← → arrow keys to navigate
        </p>
      </div>
    </div>
  )
}
