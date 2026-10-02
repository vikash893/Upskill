const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export function apiOrigin() {
  return API_URL.replace(/\/api\/?$/, '')
}

export function mediaUrl(value) {
  if (!value) return null

  const raw = String(value).trim()

  if (!raw) return null

  // Cloudinary / external / blob / data URLs
  if (
    /^https?:\/\//i.test(raw) ||
    raw.startsWith('blob:') ||
    raw.startsWith('data:')
  ) {
    return raw
  }

  // Legacy local upload path
  const clean = raw
    .replace(/^[\\/]+/, '')
    .replace(/\\/g, '/')

  return `${apiOrigin()}/${clean}`
}