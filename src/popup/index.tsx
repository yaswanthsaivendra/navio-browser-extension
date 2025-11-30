import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { logError } from "~/utils/errors"

import { ErrorBoundary } from "./ErrorBoundary"
import Popup from "./Popup"

import "./index.css"

function init(): void {
  const rootContainer = document.querySelector("#root")
  if (!rootContainer) {
    logError(new Error("Can't find root container"))
    return
  }

  try {
    const root = createRoot(rootContainer)
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <Popup />
        </ErrorBoundary>
      </StrictMode>
    )
  } catch (error) {
    logError(error)
  }
}

init()
