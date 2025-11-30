import { useEffect, useState } from "react"

import { logError, safeAsync } from "~/utils/errors"

function Popup() {
  const [data, setData] = useState("")
  const [hasStorage, setHasStorage] = useState(false)

  // Check if storage permission is available
  useEffect(() => {
    safeAsync(async () => {
      try {
        await chrome.storage.local.get("test")
        setHasStorage(true)
      } catch (error) {
        logError(error, { context: "storage-check" })
        setHasStorage(false)
      }
    })
  }, [])

  return (
    <div
      style={{
        padding: 16,
        minWidth: 300,
      }}>
      <h2>
        Welcome to your{" "}
        <a href="https://www.navio.com" target="_blank" rel="noreferrer">
          Navio
        </a>{" "}
        Extension!
      </h2>
      {!hasStorage && (
        <div style={{ color: "orange", fontSize: "12px", marginBottom: 8 }}>
          Storage permission required for saving flows
        </div>
      )}
      <input onChange={(e) => setData(e.target.value)} value={data} />
      <a href="https://docs.navio.com" target="_blank" rel="noreferrer">
        View Docs
      </a>
    </div>
  )
}

export default Popup
