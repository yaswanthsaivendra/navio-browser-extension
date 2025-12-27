/**
 * Zod validation schemas for Flow and FlowStep types
 * Provides runtime validation and sanitization
 */

import { z } from "zod"

/**
 * FlowStep validation schema
 */
export const FlowStepSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["click", "navigation", "input", "visibility", "manual"]),
  url: z.string().url(),
  explanation: z.string().min(1).max(200), // Allow up to 200 chars
  order: z.number().int().min(0),
  meta: z
    .object({
      elementText: z.string().optional(),
      nodeType: z.string().optional(),
      timestamp: z.string().optional(),
      screenshotThumb: z.string().optional(), // Required for screenshot mode
      screenshotFull: z.string().optional(),
      screenshotIndexedDB: z.boolean().optional(),
      createdAt: z.string().optional(),
    })
    .optional(),
})

/**
 * Flow validation schema
 */
export const FlowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  steps: z.array(FlowStepSchema),
  meta: z
    .object({
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
})

/**
 * Storage data validation schema
 */
export const StorageDataSchema = z.object({
  flows: z.array(FlowSchema),
  settings: z
    .object({
      autoAnnotate: z.boolean().optional(),
      showToolbar: z.boolean().optional(),
    })
    .optional(),
})

/**
 * Sanitize a URL to ensure it's safe
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    // Only allow http and https protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return ""
    }
    return url
  } catch {
    return ""
  }
}

/**
 * Validate and sanitize a FlowStep
 */
export function validateAndSanitizeStep(
  step: unknown
): z.infer<typeof FlowStepSchema> {
  const validated = FlowStepSchema.parse(step)

  // Sanitize URL
  validated.url = sanitizeUrl(validated.url)

  return validated
}

/**
 * Validate and sanitize a Flow
 */
export function validateAndSanitizeFlow(
  flow: unknown
): z.infer<typeof FlowSchema> {
  const validated = FlowSchema.parse(flow)

  // Sanitize all steps
  validated.steps = validated.steps.map((step) => ({
    ...step,
    url: sanitizeUrl(step.url),
  }))

  return validated
}
