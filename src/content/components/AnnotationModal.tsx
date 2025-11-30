/**
 * Step annotation modal component
 * Appears after each click to add title, description, and notes
 */

import React, { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"

import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Textarea } from "~/components/ui/textarea"

import "./styles.css"

export interface AnnotationData {
  title: string
  description: string
  notes: string
}

interface AnnotationModalProps {
  suggestedTitle: string
  onSave: (data: AnnotationData) => void
  onSkip: () => void
}

function AnnotationModal({
  suggestedTitle,
  onSave,
  onSkip,
}: AnnotationModalProps) {
  const [title, setTitle] = useState(suggestedTitle)
  const [description, setDescription] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    // Focus title input
    const titleInput = document.querySelector<HTMLInputElement>(
      "[data-navio-annotation='title']"
    )
    titleInput?.focus()
  }, [])

  const handleSave = () => {
    if (title.trim()) {
      onSave({
        title: title.trim(),
        description: description.trim(),
        notes: notes.trim(),
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSave()
    } else if (e.key === "Escape") {
      onSkip()
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onSkip()}>
      <DialogContent
        data-navio-extension="modal"
        onKeyDown={handleKeyDown}
        className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            Annotate Step
          </DialogTitle>
          <DialogDescription className="text-sm">
            Add details about this step to help during playback
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="step-title">Step Title *</Label>
            <Input
              id="step-title"
              data-navio-annotation="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Click Settings"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="step-description">Description (optional)</Label>
            <Textarea
              id="step-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief description of what this step does"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="step-notes">
              Presenter Notes (optional, private)
            </Label>
            <Textarea
              id="step-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="bg-warning/10 border-warning/20 italic text-sm"
              placeholder="Private notes for you (not shown to prospects)"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onSkip}>
            Skip
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            Save (⌘+Enter)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Show annotation modal and return promise with annotation data
 */
export function showAnnotationModal(
  suggestedTitle: string
): Promise<AnnotationData | null> {
  return new Promise((resolve) => {
    // Remove existing modal if any
    const existing = document.querySelector("[data-navio-extension='modal']")
    if (existing) {
      existing.remove()
    }

    // Create container
    const container = document.createElement("div")
    container.setAttribute("data-navio-extension", "modal-container")
    document.body.appendChild(container)

    const handleSave = (data: AnnotationData) => {
      cleanup()
      resolve(data)
    }

    const handleSkip = () => {
      cleanup()
      resolve(null)
    }

    const cleanup = () => {
      root.unmount()
      container.remove()
    }

    // Render React component
    const root = createRoot(container)
    root.render(
      <AnnotationModal
        suggestedTitle={suggestedTitle}
        onSave={handleSave}
        onSkip={handleSkip}
      />
    )
  })
}
