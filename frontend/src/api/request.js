export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export async function request(path, options = {}) {
  const token = getToken()
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }
  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || data.message || 'Something went wrong')
  return data
}

export function getToken() {
  try {
    const session = JSON.parse(localStorage.getItem('uniskill_session') || 'null')
    return session?.token || null
  } catch {
    return null
  }
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem('uniskill_session') || 'null')
  } catch {
    return null
  }
}

export function setSession(session) {
  localStorage.setItem('uniskill_session', JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem('uniskill_session')
}
