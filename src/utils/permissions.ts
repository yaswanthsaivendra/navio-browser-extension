/**
 * Permission management utilities
 */

/**
 * Request optional host permissions
 */
export async function requestHostPermission(url: string): Promise<boolean> {
  try {
    const granted = await chrome.permissions.request({
      origins: [url],
    })
    return granted
  } catch (error) {
    console.error("Failed to request permission:", error)
    return false
  }
}

/**
 * Check if we have permission for a URL
 */
export async function hasHostPermission(url: string): Promise<boolean> {
  try {
    return await chrome.permissions.contains({
      origins: [url],
    })
  } catch (error) {
    console.error("Failed to check permission:", error)
    return false
  }
}
