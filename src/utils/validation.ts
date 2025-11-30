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
  selector: z.string(),
  url: z.string().url(),
  explanation: z.string().min(1).max(200), // Allow up to 200 chars
  order: z.number().int().min(0),
  meta: z
    .object({
      elementText: z.string().optional(),
      nodeType: z.string().optional(),
      timestamp: z.string().optional(),
      screenshotThumb: z.string().optional(),
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
 * Sanitize a CSS selector to prevent XSS
 */
export function sanitizeSelector(selector: string): string {
  // Remove any script tags or javascript: protocols
  let sanitized = selector.replace(/<script[^>]*>.*?<\/script>/gi, "")
  sanitized = sanitized.replace(/javascript:/gi, "")
  sanitized = sanitized.replace(/on\w+\s*=/gi, "") // Remove event handlers

  // Trim and limit length
  sanitized = sanitized.trim().substring(0, 1000)

  return sanitized
}

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

  // Sanitize selector and URL
  validated.selector = sanitizeSelector(validated.selector)
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
    selector: sanitizeSelector(step.selector),
    url: sanitizeUrl(step.url),
  }))

  return validated
}
