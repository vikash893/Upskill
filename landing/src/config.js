export const APP_URL = import.meta.env.VITE_APP_URL || 'https://app.uniskill.in'
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export function getAppUrl(path = '') {
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : ''
  return `${APP_URL}${cleanPath}`
}

export function getLoginUrl(redirectPath = '') {
  const base = `${APP_URL}/login`
  if (redirectPath) {
    return `${base}?redirect=${encodeURIComponent(redirectPath)}`
  }
  return base
}

export function getRegisterUrl(redirectPath = '') {
  const base = `${APP_URL}/register`
  if (redirectPath) {
    return `${base}?redirect=${encodeURIComponent(redirectPath)}`
  }
  return base
}

export function getCourseAppUrl(courseId = '') {
  if (courseId) {
    return `${APP_URL}/course/${courseId}`
  }
  return `${APP_URL}/student/explore-courses`
}
