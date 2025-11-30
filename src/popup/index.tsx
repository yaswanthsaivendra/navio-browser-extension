import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { ErrorBoundary } from "~/components/ErrorBoundary"

import Popup from "./Popup"

import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <Popup />
    </ErrorBoundary>
  </StrictMode>
)
