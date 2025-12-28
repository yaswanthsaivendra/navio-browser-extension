/**
 * Flow API Service
 * Flow-specific API operations using the API client
 */

import { apiClient } from "~/api/client"
import type { CreateFlowResponse } from "~/types/api"
import type { Flow } from "~/types/flows"
import { logError } from "~/utils/errors"
import { mapFlowToAPIRequest } from "~/utils/flow-mapper"
import { logger } from "~/utils/logger"
import { prepareScreenshotForAPI } from "~/utils/screenshot-api"

/**
 * Create a flow via API
 * Takes a local Flow object, prepares screenshots, maps to API format, and sends to API
 */
export async function createFlow(flow: Flow): Promise<CreateFlowResponse> {
  try {
    logger.debug("Creating flow via API", {
      flowId: flow.id,
      flowName: flow.name,
      stepCount: flow.steps.length,
    })

    // Prepare screenshots for all steps (convert IndexedDB Blobs to base64)
    const stepsWithScreenshots = await Promise.all(
      flow.steps.map(async (step) => {
        // Prepare screenshots for this step
        const screenshots = await prepareScreenshotForAPI(step, flow.id)

        // Create a copy of the step with prepared screenshots
        const stepWithScreenshots: typeof step = {
          ...step,
          meta: {
            ...step.meta,
            screenshotThumb: screenshots.screenshotThumb,
            screenshotFull: screenshots.screenshotFull,
          },
        }

        return stepWithScreenshots
      })
    )

    // Create flow with prepared screenshots
    const flowWithScreenshots: Flow = {
      ...flow,
      steps: stepsWithScreenshots,
    }

    // Map local Flow to API request format
    const apiRequest = mapFlowToAPIRequest(flowWithScreenshots)

    logger.debug("Sending flow creation request to API", {
      flowName: apiRequest.name,
      stepCount: apiRequest.steps.length,
    })

    // Call API
    const response = await apiClient.createFlow(apiRequest)

    logger.debug("Flow created successfully via API", {
      flowId: response.id,
      apiFlowId: response.id,
    })

    return response
  } catch (error) {
    logError(error, {
      context: "flow-api-create",
      flowId: flow.id,
      flowName: flow.name,
    })
    throw error
  }
}
