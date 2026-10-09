import { API_URL, LOCAL_API_URL } from '../config'

export async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  // 1. First Attempt: Deployed / Primary API
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000)

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data.error || data.message || `Request failed with status ${response.status}`)
    }
    return data
  } catch (primaryError) {
    // 2. Fallback Attempt: If primary deployed API fails and is different from local, try localhost
    if (API_URL !== LOCAL_API_URL) {
      try {
        const localController = new AbortController()
        const localTimeoutId = setTimeout(() => localController.abort(), 6000)

        const fallbackResponse = await fetch(`${LOCAL_API_URL}${path}`, {
          ...options,
          headers,
          signal: localController.signal,
        })
        clearTimeout(localTimeoutId)

        const fallbackData = await fallbackResponse.json().catch(() => ({}))
        if (fallbackResponse.ok) {
          return fallbackData
        }
      } catch {
        // Fallback failed as well, rethrow original primary error
      }
    }

    throw primaryError
  }
}
